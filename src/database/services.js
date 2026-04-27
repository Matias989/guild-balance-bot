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

const ACTIVITY_TYPES = ['Grupal', 'Mazmorra', 'Avalonian', 'ZvZ', 'Hellgate', 'Recoleccion', 'Otro'];
const EVENT_ROLES = ['Tanque', 'Healer', 'Flamigero', 'Shadow Caller', 'Otros'];

export function getActivityTypes() {
  return ACTIVITY_TYPES;
}

export function getEventRoles() {
  return EVENT_ROLES;
}

export function isGroupEvent(event) {
  return event?.activity_type === 'Grupal';
}

export function createEvent(guildId, creatorId, data) {
  const result = db.prepare(`
    INSERT INTO events (guild_id, creator_id, activity_type, name, scheduled_at, max_participants, affects_accounting)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    guildId,
    creatorId,
    data.activityType,
    data.name || data.activityType,
    data.scheduledAt,
    Math.max(1, Math.min(25, data.maxParticipants || 8)),
    data.affectsAccounting !== false ? 1 : 0
  );
  return Number(result.lastInsertRowid);
}

export function getEvent(eventId) {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
}

export function getActiveEvents(guildId) {
  return db.prepare(`
    SELECT * FROM events
    WHERE guild_id = ? AND status = 'active'
    ORDER BY scheduled_at ASC
    LIMIT 25
  `).all(guildId);
}

export function getClosableEvents(guildId) {
  return db.prepare(`
    SELECT * FROM events
    WHERE guild_id = ? AND status = 'active'
    ORDER BY scheduled_at DESC
    LIMIT 25
  `).all(guildId);
}

export function getEventParticipants(eventId) {
  return db.prepare('SELECT * FROM event_participants WHERE event_id = ?').all(eventId);
}

export function joinEvent(eventId, userId, guildId, role = 'Otros') {
  const event = getEvent(eventId);
  if (!event) return { ok: false, reason: 'Evento no encontrado.' };
  if (guildId && event.guild_id !== guildId) return { ok: false, reason: 'Evento de otro servidor.' };
  if (event.status !== 'active') return { ok: false, reason: 'El evento ya fue cerrado.' };
  const exists = db.prepare('SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ?').get(eventId, userId);
  if (exists) return { ok: false, reason: 'Ya estas inscripto.' };
  const count = db.prepare('SELECT COUNT(*) AS c FROM event_participants WHERE event_id = ?').get(eventId).c;
  if (count >= event.max_participants) return { ok: false, reason: 'Cupos llenos.' };
  const normalizedRole = isGroupEvent(event) && EVENT_ROLES.includes(role) ? role : 'Otros';
  db.prepare('INSERT INTO event_participants (event_id, user_id, role) VALUES (?, ?, ?)').run(eventId, userId, normalizedRole);
  return { ok: true };
}

export function updateParticipantRole(eventId, userId, role, event = null) {
  const ev = event || getEvent(eventId);
  const normalizedRole = isGroupEvent(ev) && EVENT_ROLES.includes(role) ? role : 'Otros';
  const result = db.prepare('UPDATE event_participants SET role = ? WHERE event_id = ? AND user_id = ?')
    .run(normalizedRole, eventId, userId);
  return result.changes > 0;
}

export function leaveEvent(eventId, userId) {
  const result = db.prepare('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?').run(eventId, userId);
  return result.changes > 0;
}

export function closeEvent(eventId, attendedUserIds, totalLoot, closedByUserId = null) {
  const event = getEvent(eventId);
  if (!event || event.status !== 'active') return { ok: false, reason: 'Evento invalido o cerrado.' };
  const participants = getEventParticipants(eventId);
  if (!participants.length) return { ok: false, reason: 'No hay participantes.' };

  const attended = new Set((attendedUserIds || []).filter(Boolean));
  const attendedFinal = participants
    .map((p) => p.user_id)
    .filter((uid) => attended.has(uid));
  if (!attendedFinal.length) return { ok: false, reason: 'No seleccionaste asistentes.' };

  const loot = Number(totalLoot || 0);
  if (!Number.isFinite(loot) || loot < 0) return { ok: false, reason: 'Loot invalido.' };

  const txn = db.transaction(() => {
    db.prepare("UPDATE events SET status = 'closed', closed_at = CURRENT_TIMESTAMP, total_loot = ? WHERE id = ?")
      .run(loot, eventId);

    for (const p of participants) {
      const attendedFlag = attended.has(p.user_id) ? 1 : 0;
      db.prepare('UPDATE event_participants SET attended = ? WHERE event_id = ? AND user_id = ?')
        .run(attendedFlag, eventId, p.user_id);
    }

    let share = 0;
    const affectsAccounting = event.affects_accounting !== 0;
    if (affectsAccounting && loot > 0) {
      // Reparto completo entre asistentes (sin comision al gremio).
      share = loot / attendedFinal.length;
      for (const uid of attendedFinal) {
        addToBalance(
          event.guild_id,
          uid,
          share,
          'loot_evento',
          `Evento #${eventId} - ${event.activity_type}`,
          closedByUserId
        );
      }
    }
    return { share, attendedCount: attendedFinal.length };
  });

  const result = txn();
  return {
    ok: true,
    event,
    attendedUserIds: attendedFinal,
    sharePerUser: result.share,
    attendedCount: result.attendedCount,
    totalLoot: loot,
    affectsAccounting: event.affects_accounting !== 0
  };
}
