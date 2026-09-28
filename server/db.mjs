import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const defaultDbPath = join(root, 'data', 'dodo.sqlite')

export function openDatabase(path = process.env.DATABASE_PATH || defaultDbPath) {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }

  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS gifts (
      id TEXT PRIMARY KEY,
      recipientToken TEXT NOT NULL UNIQUE,
      managementToken TEXT NOT NULL UNIQUE,
      senderName TEXT NOT NULL,
      recipientName TEXT NOT NULL,
      intent TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      unlockAt TEXT NOT NULL,
      timezone TEXT NOT NULL,
      dodoId TEXT NOT NULL,
      dodoSeed TEXT NOT NULL,
      parentGiftId TEXT,
      cancelledAt TEXT,
      firstOpenedAt TEXT,
      hatchStartedAt TEXT,
      hatchCompletedAt TEXT,
      FOREIGN KEY(parentGiftId) REFERENCES gifts(id)
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      giftId TEXT,
      eventName TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      metadataJson TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY(giftId) REFERENCES gifts(id)
    );
  `)

  return db
}
