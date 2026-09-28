import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize, relative } from 'node:path'
import { DateTime } from 'luxon'
import { openDatabase } from './db.mjs'

export const intents = ['Celebrate', 'Love', 'Luck', 'Courage', 'Calm', 'Surprise']

const botPattern = /(bot|crawler|spider|whatsapp|facebookexternalhit|twitterbot|slackbot|discordbot|telegrambot|linkedinbot|preview)/i
const maxJsonBytes = 16 * 1024
const allowedClientAnalytics = new Set(['composer_started', 'share_clicked', 'onward_create_clicked'])
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
])

export function createApp(options = {}) {
  const db = options.db || openDatabase(options.databasePath)
  const distDir = options.distDir || join(process.cwd(), 'dist')
  const now = options.now || (() => new Date())
  const rateLimits = new Map()

  function currentDate(req) {
    if (process.env.NODE_ENV === 'test' && req.headers['x-test-now']) {
      const testDate = new Date(String(req.headers['x-test-now']))
      if (!Number.isNaN(testDate.getTime())) return testDate
    }
    return now()
  }

  function logEvent(eventName, giftId = null, metadata = {}) {
    db.prepare(`
      INSERT INTO analytics_events (id, giftId, eventName, createdAt, metadataJson)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), giftId, eventName, new Date().toISOString(), JSON.stringify(metadata))
  }

  function clientIp(req) {
    return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local').split(',')[0].trim()
  }

  function rateLimit(req, bucket, { limit = 60, windowMs = 60_000 } = {}) {
    const key = `${bucket}:${clientIp(req)}`
    const current = Date.now()
    const item = rateLimits.get(key)
    if (!item || current > item.resetAt) {
      rateLimits.set(key, { count: 1, resetAt: current + windowMs })
      return true
    }
    if (item.count >= limit) return false
    item.count += 1
    return true
  }

  function giftByRecipientToken(token) {
    return db.prepare('SELECT * FROM gifts WHERE recipientToken = ?').get(token)
  }

  function giftByManagementToken(token) {
    return db.prepare('SELECT * FROM gifts WHERE managementToken = ?').get(token)
  }

  function toPublicGift(gift, req, mutateOpen = false) {
    const asOf = currentDate(req)
    const isUnlocked = !gift.cancelledAt && asOf.getTime() >= new Date(gift.unlockAt).getTime()

    if (mutateOpen && !gift.firstOpenedAt) {
      db.prepare('UPDATE gifts SET firstOpenedAt = ? WHERE id = ?').run(asOf.toISOString(), gift.id)
    }

    return {
      id: gift.id,
      senderName: gift.senderName,
      recipientName: gift.recipientName,
      intent: gift.intent,
      createdAt: gift.createdAt,
      unlockAt: gift.unlockAt,
      timezone: gift.timezone,
      parentGiftId: gift.parentGiftId,
      cancelledAt: gift.cancelledAt,
      hatchStartedAt: gift.hatchStartedAt,
      hatchCompletedAt: gift.hatchCompletedAt,
      isUnlocked,
      onwardToken: isUnlocked ? gift.recipientToken : undefined,
      message: isUnlocked ? gift.message : undefined,
      dodoId: isUnlocked ? gift.dodoId : undefined,
      dodoSeed: isUnlocked ? gift.dodoSeed : undefined,
    }
  }

  function toManageGift(gift) {
    return {
      id: gift.id,
      senderName: gift.senderName,
      recipientName: gift.recipientName,
      intent: gift.intent,
      message: gift.message,
      createdAt: gift.createdAt,
      unlockAt: gift.unlockAt,
      timezone: gift.timezone,
      unlockDate: DateTime.fromISO(gift.unlockAt, { zone: 'utc' }).setZone(gift.timezone).toFormat('yyyy-LL-dd'),
      unlockTime: DateTime.fromISO(gift.unlockAt, { zone: 'utc' }).setZone(gift.timezone).toFormat('HH:mm'),
      parentGiftId: gift.parentGiftId,
      recipientUrl: `/g/${gift.recipientToken}`,
      manageUrl: `/manage/${gift.managementToken}`,
      cancelledAt: gift.cancelledAt,
      hatchStartedAt: gift.hatchStartedAt,
      hatchCompletedAt: gift.hatchCompletedAt,
      editable: !gift.hatchStartedAt,
    }
  }

  async function parseJson(req) {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > maxJsonBytes) {
        const error = new Error('Request body too large')
        error.statusCode = 413
        throw error
      }
      chunks.push(chunk)
    }
    if (chunks.length === 0) return {}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  }

  function cleanAnalyticsMetadata(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
    const allowedKeys = new Set(['parentToken', 'giftId'])
    const cleaned = {}
    for (const [key, value] of Object.entries(input)) {
      if (!allowedKeys.has(key)) continue
      if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
        const normalized = typeof value === 'string' ? value.slice(0, 200) : value
        cleaned[key] = normalized
      }
    }
    if (JSON.stringify(cleaned).length > 1000) return {}
    return cleaned
  }

  function zonedUnlockIso(input) {
    if (input.openingChoice === 'now') return new Date().toISOString()
    if (input.unlockAt && !input.unlockDate && !input.unlockTime) {
      const unlockAt = new Date(String(input.unlockAt))
      if (Number.isNaN(unlockAt.getTime())) return null
      return unlockAt.toISOString()
    }
    const timezone = String(input.timezone || 'UTC').trim()
    const unlockDate = String(input.unlockDate || '').trim()
    const unlockTime = String(input.unlockTime || '').trim()
    const dateTime = DateTime.fromISO(`${unlockDate}T${unlockTime || '00:00'}`, { zone: timezone })
    if (!dateTime.isValid) return null
    return dateTime.toUTC().toISO({ suppressMilliseconds: false })
  }

  function send(res, status, body, headers = {}) {
    const payload = typeof body === 'string' ? body : JSON.stringify(body)
    res.writeHead(status, {
      'content-type': typeof body === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
      ...headers,
    })
    res.end(payload)
  }

  function sendJson(res, status, body) {
    send(res, status, body, { 'cache-control': 'no-store' })
  }

  function validateGiftInput(input, { partial = false } = {}) {
    const errors = []
    const cleaned = {}
    const has = (key) => Object.prototype.hasOwnProperty.call(input, key)

    for (const key of ['senderName', 'recipientName']) {
      if (has(key) || !partial) {
        const value = String(input[key] || '').trim()
        if (!value || value.length > 80) errors.push(`${key} is required and must be 80 characters or less`)
        cleaned[key] = value
      }
    }

    if (has('intent') || !partial) {
      const intent = String(input.intent || '').trim()
      if (!intents.includes(intent)) errors.push('intent is invalid')
      cleaned.intent = intent
    }

    if (has('message') || !partial) {
      const message = String(input.message || '').trim()
      if (message.length > 500) errors.push('message must be 500 characters or less')
      cleaned.message = message
    }

    if (has('unlockAt') || has('unlockDate') || has('unlockTime') || !partial) {
      const unlockAt = zonedUnlockIso(input)
      if (!unlockAt) errors.push('unlock time must be valid for the selected timezone')
      else cleaned.unlockAt = unlockAt
    }

    if (has('timezone') || !partial) {
      const timezone = String(input.timezone || 'UTC').trim()
      if (!timezone || timezone.length > 80) errors.push('timezone is required')
      cleaned.timezone = timezone
    }

    return { errors, cleaned }
  }

  function createGift(input) {
    const nowIso = new Date().toISOString()
    const id = randomUUID()
    const dodoSeed = createHash('sha256').update(`${id}:${randomBytes(8).toString('hex')}`).digest('hex')
    const dodoId = `dodo-${Number.parseInt(dodoSeed.slice(0, 8), 16) % 100000}`
    const recipientToken = randomBytes(24).toString('base64url')
    const managementToken = randomBytes(24).toString('base64url')

    db.prepare(`
      INSERT INTO gifts (
        id, recipientToken, managementToken, senderName, recipientName, intent, message,
        createdAt, unlockAt, timezone, dodoId, dodoSeed, parentGiftId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      recipientToken,
      managementToken,
      input.senderName,
      input.recipientName,
      input.intent,
      input.message || '',
      nowIso,
      input.unlockAt,
      input.timezone,
      dodoId,
      dodoSeed,
      input.parentGiftId || null
    )

    return db.prepare('SELECT * FROM gifts WHERE id = ?').get(id)
  }

  function safePreviewHtml() {
    const title = 'A Dodo gift is waiting'
    const description = 'Someone sent a sealed surprise.'
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,nofollow" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta name="twitter:card" content="summary" />
  <title>${title}</title>
</head>
<body><p>${description}</p></body>
</html>`
  }

  function requirePilotAdmin(req, res) {
    const token = process.env.PILOT_ADMIN_TOKEN
    const authorization = String(req.headers.authorization || '')
    if (!token || authorization !== `Bearer ${token}`) {
      sendJson(res, 401, { error: 'Unauthorized' })
      return false
    }
    return true
  }

  function ratio(numerator, denominator) {
    return denominator > 0 ? numerator / denominator : null
  }

  function pilotMetrics() {
    const row = db.prepare(`
      SELECT
        COUNT(*) AS totalGifts,
        SUM(CASE WHEN parentGiftId IS NULL THEN 1 ELSE 0 END) AS rootGifts,
        SUM(CASE WHEN parentGiftId IS NOT NULL THEN 1 ELSE 0 END) AS descendantGifts,
        SUM(CASE WHEN firstUnlockedOpenedAt IS NOT NULL THEN 1 ELSE 0 END) AS giftsOpened,
        SUM(CASE WHEN hatchCompletedAt IS NOT NULL THEN 1 ELSE 0 END) AS giftsHatched,
        COUNT(DISTINCT CASE WHEN parentGiftId IS NOT NULL THEN parentGiftId END) AS parentGiftsThatCreatedAtLeastOneChild,
        SUM(CASE WHEN parentGiftId IS NOT NULL AND descendantOpenedAt IS NOT NULL THEN 1 ELSE 0 END) AS descendantGiftsOpened
      FROM gifts
    `).get()

    return {
      totalGifts: row.totalGifts || 0,
      rootGifts: row.rootGifts || 0,
      descendantGifts: row.descendantGifts || 0,
      giftsOpened: row.giftsOpened || 0,
      giftsHatched: row.giftsHatched || 0,
      parentGiftsThatCreatedAtLeastOneChild: row.parentGiftsThatCreatedAtLeastOneChild || 0,
      descendantGiftsOpened: row.descendantGiftsOpened || 0,
      recipientToSenderConversion: ratio(row.parentGiftsThatCreatedAtLeastOneChild || 0, row.giftsOpened || 0),
      hatchCompletionRate: ratio(row.giftsHatched || 0, row.giftsOpened || 0),
      descendantOpenRate: ratio(row.descendantGiftsOpened || 0, row.descendantGifts || 0),
    }
  }

  async function handleApi(req, res, url) {
    try {
      if (req.method === 'GET' && url.pathname === '/api/admin/pilot-metrics') {
        if (!requirePilotAdmin(req, res)) return
        return sendJson(res, 200, pilotMetrics())
      }

      if (req.method === 'POST' && url.pathname === '/api/analytics') {
        if (!rateLimit(req, 'analytics', { limit: 120, windowMs: 60_000 })) return sendJson(res, 429, { error: 'Too many requests' })
        const body = await parseJson(req)
        const eventName = String(body.eventName || '')
        if (!allowedClientAnalytics.has(eventName)) return sendJson(res, 400, { error: 'Invalid analytics event' })
        logEvent(eventName, typeof body.giftId === 'string' ? body.giftId : null, cleanAnalyticsMetadata(body.metadata))
        return sendJson(res, 200, { ok: true })
      }

      if (req.method === 'POST' && url.pathname === '/api/gifts') {
        if (!rateLimit(req, 'gift-create', { limit: 30, windowMs: 60_000 })) return sendJson(res, 429, { error: 'Too many requests' })
        const body = await parseJson(req)
        const { errors, cleaned } = validateGiftInput(body)
        if (body.parentToken) {
          const parent = giftByRecipientToken(String(body.parentToken))
          if (parent) cleaned.parentGiftId = parent.id
        }
        if (errors.length) return sendJson(res, 400, { errors })
        const gift = createGift(cleaned)
        logEvent(gift.parentGiftId ? 'descendant_gift_created' : 'gift_created', gift.id, { parentGiftId: gift.parentGiftId })
        return sendJson(res, 201, { gift: toManageGift(gift), recipientUrl: `/g/${gift.recipientToken}`, manageUrl: `/manage/${gift.managementToken}` })
      }

      const recipientMatch = url.pathname.match(/^\/api\/gifts\/recipient\/([^/]+)$/)
      if (req.method === 'GET' && recipientMatch) {
        const gift = giftByRecipientToken(recipientMatch[1])
        if (!gift) return sendJson(res, 404, { error: 'Gift not found' })
        const isPreview = botPattern.test(String(req.headers['user-agent'] || ''))
        const publicGift = toPublicGift(gift, req, !isPreview)
        if (!isPreview) {
          const at = currentDate(req).toISOString()
          if (publicGift.isUnlocked && !gift.firstUnlockedOpenedAt) {
            db.prepare('UPDATE gifts SET firstUnlockedOpenedAt = ?, firstOpenedAt = COALESCE(firstOpenedAt, ?) WHERE id = ?').run(at, at, gift.id)
            logEvent('recipient_opened', gift.id)
          }
          if (!publicGift.isUnlocked && !gift.firstPreUnlockOpenedAt) {
            db.prepare('UPDATE gifts SET firstPreUnlockOpenedAt = ?, firstOpenedAt = COALESCE(firstOpenedAt, ?) WHERE id = ?').run(at, at, gift.id)
            logEvent('recipient_opened_before_unlock', gift.id)
          }
          if (publicGift.isUnlocked && gift.parentGiftId && !gift.descendantOpenedAt) {
            db.prepare('UPDATE gifts SET descendantOpenedAt = ? WHERE id = ?').run(at, gift.id)
            logEvent('descendant_recipient_opened', gift.id, { parentGiftId: gift.parentGiftId })
          }
        }
        return sendJson(res, 200, { gift: publicGift })
      }

      const manageMatch = url.pathname.match(/^\/api\/gifts\/manage\/([^/]+)$/)
      if (req.method === 'GET' && manageMatch) {
        const gift = giftByManagementToken(manageMatch[1])
        if (!gift) return sendJson(res, 404, { error: 'Gift not found' })
        return sendJson(res, 200, { gift: toManageGift(gift) })
      }

      if (req.method === 'PATCH' && manageMatch) {
        const gift = giftByManagementToken(manageMatch[1])
        if (!gift) return sendJson(res, 404, { error: 'Gift not found' })
        if (gift.hatchStartedAt) return sendJson(res, 409, { error: 'Gift is frozen because hatching has started' })
        const body = await parseJson(req)
        const { errors, cleaned } = validateGiftInput(body, { partial: true })
        if (errors.length) return sendJson(res, 400, { errors })
        const assignments = []
        const values = []
        for (const [key, value] of Object.entries(cleaned)) {
          assignments.push(`${key} = ?`)
          values.push(value)
        }
        if (assignments.length) {
          values.push(gift.id)
          db.prepare(`UPDATE gifts SET ${assignments.join(', ')} WHERE id = ?`).run(...values)
        }
        const updated = db.prepare('SELECT * FROM gifts WHERE id = ?').get(gift.id)
        return sendJson(res, 200, { gift: toManageGift(updated) })
      }

      if (req.method === 'DELETE' && manageMatch) {
        const gift = giftByManagementToken(manageMatch[1])
        if (!gift) return sendJson(res, 404, { error: 'Gift not found' })
        if (gift.hatchStartedAt) return sendJson(res, 409, { error: 'Gift is frozen because hatching has started' })
        db.prepare('UPDATE gifts SET cancelledAt = ? WHERE id = ?').run(new Date().toISOString(), gift.id)
        return sendJson(res, 200, { ok: true })
      }

      const hatchStartMatch = url.pathname.match(/^\/api\/gifts\/recipient\/([^/]+)\/hatch-start$/)
      if (req.method === 'POST' && hatchStartMatch) {
        const gift = giftByRecipientToken(hatchStartMatch[1])
        if (!gift) return sendJson(res, 404, { error: 'Gift not found' })
        const publicGift = toPublicGift(gift, req, false)
        if (!publicGift.isUnlocked) return sendJson(res, 403, { error: 'Gift is still locked' })
        if (!gift.hatchStartedAt) {
          const at = currentDate(req).toISOString()
          db.prepare('UPDATE gifts SET hatchStartedAt = ? WHERE id = ?').run(at, gift.id)
          logEvent('hatch_started', gift.id)
        }
        const updated = db.prepare('SELECT * FROM gifts WHERE id = ?').get(gift.id)
        return sendJson(res, 200, { gift: toPublicGift(updated, req, false) })
      }

      const hatchDoneMatch = url.pathname.match(/^\/api\/gifts\/recipient\/([^/]+)\/hatch-complete$/)
      if (req.method === 'POST' && hatchDoneMatch) {
        const gift = giftByRecipientToken(hatchDoneMatch[1])
        if (!gift) return sendJson(res, 404, { error: 'Gift not found' })
        if (!toPublicGift(gift, req, false).isUnlocked) return sendJson(res, 403, { error: 'Gift is still locked' })
        if (!gift.hatchStartedAt) db.prepare('UPDATE gifts SET hatchStartedAt = ? WHERE id = ?').run(currentDate(req).toISOString(), gift.id)
        if (!gift.hatchCompletedAt) {
          db.prepare('UPDATE gifts SET hatchCompletedAt = ? WHERE id = ?').run(currentDate(req).toISOString(), gift.id)
          logEvent('hatch_completed', gift.id)
        }
        const updated = db.prepare('SELECT * FROM gifts WHERE id = ?').get(gift.id)
        return sendJson(res, 200, { gift: toPublicGift(updated, req, false) })
      }

      if (req.method === 'GET' && url.pathname === '/api/debug/events' && process.env.NODE_ENV === 'test') {
        return sendJson(res, 200, {
          events: db.prepare('SELECT * FROM analytics_events ORDER BY createdAt ASC').all(),
          gifts: db.prepare('SELECT id, parentGiftId, senderName, recipientName, intent FROM gifts ORDER BY createdAt ASC').all(),
        })
      }

      return sendJson(res, 404, { error: 'Not found' })
    } catch (error) {
      if (error instanceof SyntaxError) return sendJson(res, 400, { error: 'Invalid JSON' })
      return sendJson(res, error.statusCode || 500, { error: error.message })
    }
  }

  function serveStaticOrApp(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed')

    const giftPreviewMatch = url.pathname.match(/^\/g\/([^/]+)$/)
    if (giftPreviewMatch && botPattern.test(String(req.headers['user-agent'] || ''))) {
      return send(res, 200, safePreviewHtml(giftByRecipientToken(giftPreviewMatch[1])), { 'cache-control': 'no-store' })
    }

    const path = url.pathname === '/' ? '/index.html' : url.pathname
    const filePath = normalize(join(distDir, decodeURIComponent(path)))
    const rel = relative(distDir, filePath)
    if (existsSync(filePath) && rel && !rel.startsWith('..') && !rel.startsWith('/')) {
      const contentType = mimeTypes.get(extname(filePath)) || 'application/octet-stream'
      res.writeHead(200, { 'content-type': contentType })
      if (req.method === 'HEAD') return res.end()
      return res.end(readFileSync(filePath))
    }

    const appShell = join(distDir, 'index.html')
    if (existsSync(appShell)) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      if (req.method === 'HEAD') return res.end()
      return res.end(readFileSync(appShell))
    }

    return send(res, 200, safePreviewHtml(null))
  }

  return async function app(req, res) {
    const url = new URL(req.url, 'http://localhost')
    res.setHeader('x-robots-tag', 'noindex, nofollow')
    if (url.pathname.startsWith('/api/')) return handleApi(req, res, url)
    return serveStaticOrApp(req, res, url)
  }
}
