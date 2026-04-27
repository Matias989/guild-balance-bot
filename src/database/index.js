import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = process.env.DATA_DIR || join(__dirname, '../../data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'guild.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      panel_channel_id TEXT,
      panel_message_id TEXT,
      admin_user_ids TEXT,
      leader_role_ids TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      discord_username TEXT,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS balance_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL,
      type TEXT NOT NULL,
      reason TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      name TEXT,
      scheduled_at DATETIME NOT NULL,
      max_participants INTEGER DEFAULT 8,
      affects_accounting INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      total_loot REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS event_participants (
      event_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'Otros',
      attended INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS event_announcements (
      event_id INTEGER PRIMARY KEY,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_guild ON users(guild_id);
    CREATE INDEX IF NOT EXISTS idx_balance_tx_guild_user ON balance_transactions(guild_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_balance_tx_guild_time ON balance_transactions(guild_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_guild_status ON events(guild_id, status);
    CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
  `);

  try { db.prepare('SELECT role FROM event_participants LIMIT 1').get(); } catch { db.exec("ALTER TABLE event_participants ADD COLUMN role TEXT DEFAULT 'Otros'"); }
  try { db.prepare('SELECT affects_accounting FROM events LIMIT 1').get(); } catch { db.exec('ALTER TABLE events ADD COLUMN affects_accounting INTEGER DEFAULT 1'); }
}

initDatabase();

export default db;
export { initDatabase };
