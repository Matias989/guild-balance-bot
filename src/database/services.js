import db from './index.js';

const ALLOWED_CONFIG_KEYS = new Set([
  'panel_channel_id',
  'panel_message_id',
  'admin_user_ids',
  'leader_role_ids'
]);

export function getGuildConfig(guildId) {
  let row = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  if (!row) {
    db.prepare('INSERT INTO guild_config (guild_id) VALUES (?)').run(guildId);
    row = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  }
  return row;
}

export function updateGuildConfig(guildId, updates) {
  const config = getGuildConfig(guildId);
  const fields = Object.keys(updates).filter(
    (k) => updates[k] !== undefined && ALLOWED_CONFIG_KEYS.has(k)
  );
  if (fields.length === 0) return config;
  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = [...fields.map((f) => updates[f]), guildId];
  db.prepare(
    `UPDATE guild_config SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?`
  ).run(...values);
  return getGuildConfig(guildId);
}

export function getOrCreateUser(guildId, userId) {
  let user = db.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  if (!user) {
    db.prepare('INSERT INTO users (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
    user = db.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  }
  return user;
}

export function registerUser(guildId, userId, discordUsername) {
  getOrCreateUser(guildId, userId);
  db.prepare(`
    UPDATE users SET discord_username = ?, updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ? AND user_id = ?
  `).run(discordUsername || null, guildId, userId);
  return db.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
}

export function getUserBalance(guildId, userId) {
  const user = getOrCreateUser(guildId, userId);
  return Number(user.balance ?? 0);
}

/** Cuentas con saldo > 0, mayor a menor */
export function getAllUserBalances(guildId) {
  return db.prepare(`
    SELECT user_id, balance FROM users
    WHERE guild_id = ? AND COALESCE(balance, 0) > 0
    ORDER BY balance DESC
  `).all(guildId);
}

/** Todos los usuarios con fila en DB que tengan balance != 0 o para conteo total */
export function getGuildBalanceAggregate(guildId) {
  const row = db.prepare(`
    SELECT
      COUNT(*) AS user_count,
      SUM(COALESCE(balance, 0)) AS total_balance
    FROM users WHERE guild_id = ?
  `).get(guildId);
  const withBalance = db.prepare(`
    SELECT COUNT(*) AS c FROM users
    WHERE guild_id = ? AND COALESCE(balance, 0) > 0
  `).get(guildId);
  return {
    totalBalance: Number(row?.total_balance ?? 0),
    registeredUsers: Number(row?.user_count ?? 0),
    accountsWithPositiveBalance: Number(withBalance?.c ?? 0)
  };
}

export function getRecentGuildTransactions(guildId, limit = 20) {
  return db.prepare(`
    SELECT * FROM balance_transactions
    WHERE guild_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(guildId, limit);
}

export function addToBalance(guildId, userId, amount, type, reason, createdBy = null) {
  if (amount <= 0) throw new Error('amount must be positive');
  const txn = db.transaction(() => {
    const user = getOrCreateUser(guildId, userId);
    const current = Number(user.balance ?? 0);
    const newBalance = current + amount;
    db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?')
      .run(newBalance, guildId, userId);
    db.prepare(`
      INSERT INTO balance_transactions (guild_id, user_id, amount, balance_after, type, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, userId, amount, newBalance, type, reason ?? '', createdBy);
    return newBalance;
  });
  return txn();
}

/** Quita hasta el saldo actual (no deja negativo) */
export function deductFromBalance(guildId, userId, amount, reason, createdBy = null) {
  if (amount <= 0) throw new Error('amount must be positive');
  const txn = db.transaction(() => {
    const user = getOrCreateUser(guildId, userId);
    const current = Number(user.balance ?? 0);
    const deduct = Math.min(amount, current);
    const newBalance = current - deduct;
    db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?')
      .run(newBalance, guildId, userId);
    db.prepare(`
      INSERT INTO balance_transactions (guild_id, user_id, amount, balance_after, type, reason, created_by)
      VALUES (?, ?, ?, ?, 'egreso', ?, ?)
    `).run(guildId, userId, -deduct, newBalance, reason ?? '', createdBy);
    return { newBalance, deducted: deduct };
  });
  return txn();
}

export function getBalanceHistory(guildId, userId, limit = 15) {
  return db.prepare(`
    SELECT * FROM balance_transactions
    WHERE guild_id = ? AND user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(guildId, userId, limit);
}
