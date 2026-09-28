import { createServer } from 'node:http'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DateTime } from 'luxon'
import { createApp } from '../server/app.mjs'
import { openDatabase } from '../server/db.mjs'

process.env.NODE_ENV = 'test'

async function withServer(fn) {
  const db = openDatabase(':memory:')
  const server = createServer(createApp({ db }))
  await new Promise((resolve) => server.listen(0, resolve))
  const { port } = server.address()
  const base = `http://127.0.0.1:${port}`
  try {
    await fn({ base, db })
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
  }
}

async function withEnv(updates, fn) {
  const previous = {}
  for (const key of Object.keys(updates)) {
    previous[key] = process.env[key]
    if (updates[key] === undefined) delete process.env[key]
    else process.env[key] = updates[key]
  }
  try {
    await fn()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

function eventCount(db, eventName) {
  return db.prepare('SELECT COUNT(*) AS count FROM analytics_events WHERE eventName = ?').get(eventName).count
}

async function json(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const body = await response.json()
  return { response, body }
}

async function createGift(base, overrides = {}) {
  const payload = {
    senderName: 'A',
    recipientName: 'B',
    intent: 'Courage',
    message: 'You have got this.',
    timezone: 'UTC',
    ...overrides,
  }
  if (!Object.prototype.hasOwnProperty.call(payload, 'unlockAt') && !payload.unlockDate) {
    payload.unlockAt = new Date(Date.now() - 1000).toISOString()
  }
  const { response, body } = await json(base, '/api/gifts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  assert.equal(response.status, 201)
  return body
}

test('immediate gift can be created, opened, hatched, and remains deterministic after refresh', async () => {
  await withServer(async ({ base }) => {
    const created = await createGift(base)
    const token = created.recipientUrl.split('/').pop()

    const opened = await json(base, `/api/gifts/recipient/${token}`)
    assert.equal(opened.response.status, 200)
    assert.equal(opened.body.gift.isUnlocked, true)
    assert.equal(opened.body.gift.message, 'You have got this.')
    const dodoId = opened.body.gift.dodoId
    const dodoSeed = opened.body.gift.dodoSeed

    const start = await json(base, `/api/gifts/recipient/${token}/hatch-start`, { method: 'POST', body: '{}' })
    assert.equal(start.response.status, 200)
    assert.ok(start.body.gift.hatchStartedAt)

    const completed = await json(base, `/api/gifts/recipient/${token}/hatch-complete`, { method: 'POST', body: '{}' })
    assert.equal(completed.response.status, 200)
    assert.ok(completed.body.gift.hatchCompletedAt)

    const refreshed = await json(base, `/api/gifts/recipient/${token}`)
    assert.equal(refreshed.body.gift.dodoId, dodoId)
    assert.equal(refreshed.body.gift.dodoSeed, dodoSeed)
    assert.equal(refreshed.body.gift.message, 'You have got this.')
  })
})

test('future scheduled gift withholds protected content until server time unlocks it', async () => {
  await withServer(async ({ base }) => {
    const unlockAt = '2030-01-01T12:00:00.000Z'
    const created = await createGift(base, { unlockAt })
    const token = created.recipientUrl.split('/').pop()

    const locked = await json(base, `/api/gifts/recipient/${token}`, {
      headers: { 'x-test-now': '2030-01-01T11:59:00.000Z' },
    })
    assert.equal(locked.body.gift.isUnlocked, false)
    assert.equal(locked.body.gift.message, undefined)
    assert.equal(locked.body.gift.dodoId, undefined)
    assert.equal(locked.body.gift.dodoSeed, undefined)

    const blocked = await json(base, `/api/gifts/recipient/${token}/hatch-start`, {
      method: 'POST',
      body: '{}',
      headers: { 'x-test-now': '2030-01-01T11:59:00.000Z' },
    })
    assert.equal(blocked.response.status, 403)

    const unlocked = await json(base, `/api/gifts/recipient/${token}`, {
      headers: { 'x-test-now': '2030-01-01T12:00:00.000Z' },
    })
    assert.equal(unlocked.body.gift.isUnlocked, true)
    assert.equal(unlocked.body.gift.message, 'You have got this.')
  })
})

test('scheduled timezone inputs resolve to the selected timezone', async () => {
  await withServer(async ({ base }) => {
    const mauritius = await createGift(base, {
      unlockAt: undefined,
      unlockDate: '2026-10-12',
      unlockTime: '20:00',
      timezone: 'Indian/Mauritius',
    })
    assert.equal(
      mauritius.gift.unlockAt,
      DateTime.fromISO('2026-10-12T20:00', { zone: 'Indian/Mauritius' }).toUTC().toISO({ suppressMilliseconds: false }),
    )

    const newYork = await createGift(base, {
      unlockAt: undefined,
      unlockDate: '2026-10-12',
      unlockTime: '20:00',
      timezone: 'America/New_York',
    })
    assert.equal(
      newYork.gift.unlockAt,
      DateTime.fromISO('2026-10-12T20:00', { zone: 'America/New_York' }).toUTC().toISO({ suppressMilliseconds: false }),
    )
  })
})

test('management message edit does not shift scheduled timezone instant', async () => {
  await withServer(async ({ base }) => {
    const created = await createGift(base, {
      unlockAt: undefined,
      unlockDate: '2026-10-12',
      unlockTime: '20:00',
      timezone: 'Indian/Mauritius',
    })
    const manageToken = created.manageUrl.split('/').pop()
    const before = created.gift.unlockAt

    const edited = await json(base, `/api/gifts/manage/${manageToken}`, {
      method: 'PATCH',
      body: JSON.stringify({ message: 'Edited only.' }),
    })
    assert.equal(edited.response.status, 200)
    assert.equal(edited.body.gift.unlockAt, before)
  })
})

test('sender can edit before hatch and is frozen after hatch starts', async () => {
  await withServer(async ({ base }) => {
    const created = await createGift(base)
    const recipientToken = created.recipientUrl.split('/').pop()
    const manageToken = created.manageUrl.split('/').pop()

    const edited = await json(base, `/api/gifts/manage/${manageToken}`, {
      method: 'PATCH',
      body: JSON.stringify({ recipientName: 'Bee', message: 'Edited.' }),
    })
    assert.equal(edited.response.status, 200)
    assert.equal(edited.body.gift.recipientName, 'Bee')

    await json(base, `/api/gifts/recipient/${recipientToken}/hatch-start`, { method: 'POST', body: '{}' })

    const frozen = await json(base, `/api/gifts/manage/${manageToken}`, {
      method: 'PATCH',
      body: JSON.stringify({ message: 'Too late.' }),
    })
    assert.equal(frozen.response.status, 409)
  })
})

test('link preview gets safe metadata and does not mutate recipient state', async () => {
  await withServer(async ({ base, db }) => {
    const created = await createGift(base, {
      senderName: 'Alice',
      recipientName: 'Bob',
      unlockAt: '2030-01-01T12:00:00.000Z',
      message: 'Private note',
    })
    const token = created.recipientUrl.split('/').pop()

    const response = await fetch(`${base}/g/${token}`, {
      headers: { 'user-agent': 'WhatsApp/2.0 link preview' },
    })
    const html = await response.text()
    assert.equal(response.status, 200)
    assert.match(html, /og:title/)
    assert.match(html, /A Dodo gift is waiting/)
    assert.doesNotMatch(html, /Alice/)
    assert.doesNotMatch(html, /Bob/)
    assert.doesNotMatch(html, /Private note/)
    assert.doesNotMatch(html, /dodo-/)

    const gift = db.prepare('SELECT firstOpenedAt, hatchStartedAt FROM gifts WHERE recipientToken = ?').get(token)
    assert.equal(gift.firstOpenedAt, null)
    assert.equal(gift.hatchStartedAt, null)
  })
})

test('A to B to C chain is stored and visible in events', async () => {
  await withServer(async ({ base, db }) => {
    const first = await createGift(base, {
      senderName: 'A',
      recipientName: 'B',
      intent: 'Courage',
      message: 'You have got this.',
    })
    const firstToken = first.recipientUrl.split('/').pop()
    const firstOpen = await json(base, `/api/gifts/recipient/${firstToken}`)
    await json(base, `/api/gifts/recipient/${firstToken}/hatch-start`, { method: 'POST', body: '{}' })
    await json(base, `/api/gifts/recipient/${firstToken}/hatch-complete`, { method: 'POST', body: '{}' })

    const second = await createGift(base, {
      senderName: 'B',
      recipientName: 'C',
      intent: 'Courage',
      message: 'Passing it on.',
      parentToken: firstOpen.body.gift.onwardToken,
    })
    const secondToken = second.recipientUrl.split('/').pop()
    const cOpen = await json(base, `/api/gifts/recipient/${secondToken}`)
    assert.equal(cOpen.body.gift.recipientName, 'C')
    assert.equal(cOpen.body.gift.parentGiftId, first.gift.id)

    const child = db.prepare('SELECT parentGiftId FROM gifts WHERE id = ?').get(second.gift.id)
    assert.equal(child.parentGiftId, first.gift.id)

    const events = db.prepare('SELECT eventName FROM analytics_events').all().map((row) => row.eventName)
    assert.ok(events.includes('descendant_gift_created'))
    assert.ok(events.includes('descendant_recipient_opened'))
  })
})

test('recipient opens are logged once per gift state and descendant reach is not inflated', async () => {
  await withServer(async ({ base, db }) => {
    const lockedGift = await createGift(base, {
      unlockAt: '2030-01-01T12:00:00.000Z',
    })
    const lockedToken = lockedGift.recipientUrl.split('/').pop()
    for (let i = 0; i < 3; i += 1) {
      await json(base, `/api/gifts/recipient/${lockedToken}`, {
        headers: { 'x-test-now': '2030-01-01T11:00:00.000Z' },
      })
    }
    assert.equal(eventCount(db, 'recipient_opened_before_unlock'), 1)

    const parent = await createGift(base)
    const parentToken = parent.recipientUrl.split('/').pop()
    const parentOpen = await json(base, `/api/gifts/recipient/${parentToken}`)
    for (let i = 0; i < 3; i += 1) {
      await json(base, `/api/gifts/recipient/${parentToken}`)
    }
    assert.equal(eventCount(db, 'recipient_opened'), 1)

    const child = await createGift(base, {
      senderName: 'B',
      recipientName: 'C',
      parentToken: parentOpen.body.gift.onwardToken,
    })
    const childToken = child.recipientUrl.split('/').pop()
    for (let i = 0; i < 3; i += 1) {
      await json(base, `/api/gifts/recipient/${childToken}`)
    }
    assert.equal(eventCount(db, 'descendant_recipient_opened'), 1)
  })
})

test('arbitrary parentGiftId is ignored and opaque parent token creates legitimate lineage', async () => {
  await withServer(async ({ base, db }) => {
    const parent = await createGift(base)
    const parentToken = parent.recipientUrl.split('/').pop()
    const parentOpen = await json(base, `/api/gifts/recipient/${parentToken}`)

    const spoofed = await createGift(base, {
      senderName: 'Mallory',
      recipientName: 'Target',
      parentGiftId: parent.gift.id,
    })
    const spoofedRow = db.prepare('SELECT parentGiftId FROM gifts WHERE id = ?').get(spoofed.gift.id)
    assert.equal(spoofedRow.parentGiftId, null)

    const legitimate = await createGift(base, {
      senderName: 'B',
      recipientName: 'C',
      parentToken: parentOpen.body.gift.onwardToken,
    })
    const legitimateRow = db.prepare('SELECT parentGiftId FROM gifts WHERE id = ?').get(legitimate.gift.id)
    assert.equal(legitimateRow.parentGiftId, parent.gift.id)
  })
})

test('public analytics rejects unknown events and oversized bodies', async () => {
  await withServer(async ({ base }) => {
    const invalid = await json(base, '/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ eventName: 'made_up_event' }),
    })
    assert.equal(invalid.response.status, 400)

    const response = await fetch(`${base}/api/analytics`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventName: 'composer_started', metadata: { giftId: 'x'.repeat(20_000) } }),
    })
    assert.equal(response.status, 413)
  })
})

test('two gifts do not leak message, dodo identity, or unlock state', async () => {
  await withServer(async ({ base }) => {
    const lockedGift = await createGift(base, {
      senderName: 'A',
      recipientName: 'B',
      message: 'Locked private note',
      unlockAt: '2030-01-01T12:00:00.000Z',
    })
    const openGift = await createGift(base, {
      senderName: 'X',
      recipientName: 'Y',
      message: 'Open note',
    })

    const locked = await json(base, `/api/gifts/recipient/${lockedGift.recipientUrl.split('/').pop()}`, {
      headers: { 'x-test-now': '2030-01-01T11:00:00.000Z' },
    })
    const open = await json(base, `/api/gifts/recipient/${openGift.recipientUrl.split('/').pop()}`)

    assert.equal(locked.body.gift.message, undefined)
    assert.equal(locked.body.gift.dodoId, undefined)
    assert.equal(open.body.gift.message, 'Open note')
    assert.notEqual(open.body.gift.id, locked.body.gift.id)
  })
})

test('pilot metrics endpoint requires bearer token', async () => {
  await withEnv({ PILOT_ADMIN_TOKEN: 'pilot-secret' }, async () => {
    await withServer(async ({ base }) => {
      const missing = await json(base, '/api/admin/pilot-metrics')
      assert.equal(missing.response.status, 401)

      const wrong = await json(base, '/api/admin/pilot-metrics', {
        headers: { authorization: 'Bearer wrong-token' },
      })
      assert.equal(wrong.response.status, 401)
    })
  })
})

test('pilot metrics endpoint is unavailable without configured token', async () => {
  await withEnv({ PILOT_ADMIN_TOKEN: undefined }, async () => {
    await withServer(async ({ base }) => {
      const response = await json(base, '/api/admin/pilot-metrics', {
        headers: { authorization: 'Bearer anything' },
      })
      assert.equal(response.response.status, 401)
    })
  })
})

test('pilot metrics returns aggregate values without private fields', async () => {
  await withEnv({ PILOT_ADMIN_TOKEN: 'pilot-secret' }, async () => {
    await withServer(async ({ base }) => {
      const parent = await createGift(base, {
        senderName: 'Private Sender',
        recipientName: 'Private Recipient',
        message: 'Private pilot note',
      })
      const parentToken = parent.recipientUrl.split('/').pop()
      const parentOpen = await json(base, `/api/gifts/recipient/${parentToken}`)
      await json(base, `/api/gifts/recipient/${parentToken}/hatch-start`, { method: 'POST', body: '{}' })
      await json(base, `/api/gifts/recipient/${parentToken}/hatch-complete`, { method: 'POST', body: '{}' })

      const firstChild = await createGift(base, {
        senderName: 'B',
        recipientName: 'C',
        message: 'First child note',
        parentToken: parentOpen.body.gift.onwardToken,
      })
      const secondChild = await createGift(base, {
        senderName: 'B',
        recipientName: 'D',
        message: 'Second child note',
        parentToken: parentOpen.body.gift.onwardToken,
      })
      await json(base, `/api/gifts/recipient/${firstChild.recipientUrl.split('/').pop()}`)

      const metrics = await json(base, '/api/admin/pilot-metrics', {
        headers: { authorization: 'Bearer pilot-secret' },
      })
      assert.equal(metrics.response.status, 200)
      assert.deepEqual(metrics.body, {
        totalGifts: 3,
        rootGifts: 1,
        descendantGifts: 2,
        giftsOpened: 2,
        giftsHatched: 1,
        parentGiftsThatCreatedAtLeastOneChild: 1,
        descendantGiftsOpened: 1,
        recipientToSenderConversion: 0.5,
        hatchCompletionRate: 0.5,
        descendantOpenRate: 0.5,
      })

      const payload = JSON.stringify(metrics.body)
      assert.doesNotMatch(payload, /Private Sender/)
      assert.doesNotMatch(payload, /Private Recipient/)
      assert.doesNotMatch(payload, /Private pilot note/)
      assert.doesNotMatch(payload, /First child note/)
      assert.doesNotMatch(payload, /recipientToken/)
      assert.doesNotMatch(payload, /managementToken/)
      assert.doesNotMatch(payload, /dodoSeed/)
      assert.doesNotMatch(payload, /metadataJson/)
      assert.ok(secondChild.gift.id)
    })
  })
})
