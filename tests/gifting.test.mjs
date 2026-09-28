import { createServer } from 'node:http'
import { test } from 'node:test'
import assert from 'node:assert/strict'
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
  const unlockAt = overrides.unlockAt || new Date(Date.now() - 1000).toISOString()
  const { response, body } = await json(base, '/api/gifts', {
    method: 'POST',
    body: JSON.stringify({
      senderName: 'A',
      recipientName: 'B',
      intent: 'Courage',
      message: 'You have got this.',
      unlockAt,
      timezone: 'UTC',
      ...overrides,
    }),
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
    await json(base, `/api/gifts/recipient/${firstToken}`)
    await json(base, `/api/gifts/recipient/${firstToken}/hatch-start`, { method: 'POST', body: '{}' })
    await json(base, `/api/gifts/recipient/${firstToken}/hatch-complete`, { method: 'POST', body: '{}' })

    const second = await createGift(base, {
      senderName: 'B',
      recipientName: 'C',
      intent: 'Courage',
      message: 'Passing it on.',
      parentGiftId: first.gift.id,
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
