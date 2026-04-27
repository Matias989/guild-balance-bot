import { EmbedBuilder } from 'discord.js';

const COLORS = {
  primary: 0x2d7d46,
  success: 0x57f287,
  error: 0xed4245,
  info: 0x5865f2
};

export function mainPanelEmbed(guildName) {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`🏛️ Panel de Gremio — ${guildName || 'Gremio'}`)
    .setDescription(
      [
        'Bienvenido al panel principal.',
        '',
        '• **Mi cuenta**: saldo e historial personal',
        '• **Resumen gremio**: visión global de cuentas',
        '• **Eventos**: inscripción, gestión y cierre',
        '• **Más opciones**: acciones de staff'
      ].join('\n')
    )
    .setFooter({ text: 'Sistema contable de silver (referencia in-game).' })
    .setTimestamp();
}

export function myAccountEmbed(userId, balance, history) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('💳 Tu cuenta corriente')
    .setDescription(`<@${userId}>`)
    .addFields({
      name: '💰 Saldo actual',
      value: `**${Number(balance).toLocaleString('es-ES')}** silver`,
      inline: false
    })
    .setTimestamp();

  if (history?.length) {
    const lines = history.slice(0, 12).map((h) => {
      const s =
        h.amount >= 0
          ? `+${Number(h.amount).toLocaleString('es-ES')}`
          : Number(h.amount).toLocaleString('es-ES');
      const who = h.created_by ? ` · por <@${h.created_by}>` : '';
      return `${s} — ${h.reason || h.type}${who}`;
    });
    embed.addFields({
      name: '🧾 Últimos movimientos',
      value: lines.join('\n').slice(0, 4096) || '—',
      inline: false
    });
  }
  return embed;
}

export function guildSummaryEmbed(accounts, aggregate) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📊 Resumen del gremio')
    .setTimestamp();

  embed.addFields(
    {
      name: '💰 Total en cuentas',
      value: `**${Number(aggregate.totalBalance).toLocaleString('es-ES')}** silver`,
      inline: true
    },
    {
      name: '👤 Miembros registrados',
      value: `${aggregate.registeredUsers}`,
      inline: true
    },
    {
      name: '✅ Con saldo > 0',
      value: `${aggregate.accountsWithPositiveBalance}`,
      inline: true
    }
  );

  if (!accounts?.length) {
    embed.addFields({
      name: '💳 Cuentas con saldo',
      value: 'Ninguna por ahora.',
      inline: false
    });
    return embed;
  }

  const lines = accounts.map(
    (a, i) =>
      `${i + 1}. <@${a.user_id}> — **${Number(a.balance).toLocaleString('es-ES')}** silver`
  );
  let chunk = '';
  const chunks = [];
  const maxLen = 1000;
  for (const line of lines) {
    if (chunk.length + line.length + 1 > maxLen && chunk) {
      chunks.push(chunk);
      chunk = '';
    }
    chunk += (chunk ? '\n' : '') + line;
  }
  if (chunk) chunks.push(chunk);
  for (let i = 0; i < chunks.length && i < 4; i++) {
    embed.addFields({
      name: i === 0 ? '🏆 Ranking por saldo' : '\u200b',
      value: chunks[i],
      inline: false
    });
  }
  embed.setFooter({ text: `${accounts.length} cuentas con saldo positivo` });
  return embed;
}

export function guildMovementsEmbed(rows) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('📜 Últimos movimientos del gremio')
    .setTimestamp();

  if (!rows?.length) {
    embed.setDescription('Todavía no hay movimientos registrados.');
    return embed;
  }

  const lines = rows.map((r) => {
    const amt =
      r.amount >= 0
        ? `+${Number(r.amount).toLocaleString('es-ES')}`
        : Number(r.amount).toLocaleString('es-ES');
    const op = r.created_by ? `<@${r.created_by}>` : '—';
    const when = r.created_at ? `<t:${Math.floor(new Date(r.created_at).getTime() / 1000)}:R>` : '';
    return `${amt} · <@${r.user_id}> · ${r.type}${when ? ` ${when}` : ''}\n_${(r.reason || '—').slice(0, 80)}_ · ${op}`;
  });
  embed.setDescription(lines.join('\n\n').slice(0, 4090));
  return embed;
}

export function staffPromptEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`⚙️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function successEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(title).setDescription(description).setTimestamp();
}

export function errorEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(title).setDescription(description).setTimestamp();
}

export function eventsListEmbed(events) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📅 Eventos activos')
    .setTimestamp();

  if (!events?.length) {
    embed.setDescription('No hay eventos activos por ahora.');
    return embed;
  }

  const lines = events.map((e) =>
    `#${e.id} · **${e.activity_type}** · <t:${Math.floor(new Date(e.scheduled_at).getTime() / 1000)}:f>`
  );
  embed.setDescription(lines.join('\n').slice(0, 4000));
  return embed;
}

export function eventDetailEmbed(event, participants, withRoles = false) {
  const isActive = event?.status === 'active';
  let roleSummary = '';
  if (withRoles) {
    const roleBuckets = {
      Tanque: [],
      Healer: [],
      Flamigero: [],
      'Shadow Caller': [],
      Otros: []
    };
    for (const p of participants) {
      const role = roleBuckets[p.role] ? p.role : 'Otros';
      roleBuckets[role].push(p.user_id);
    }
    const roleIcon = {
      Tanque: '🛡️',
      Healer: '💚',
      Flamigero: '🔥',
      'Shadow Caller': '🌑',
      Otros: '👥'
    };
    roleSummary = Object.entries(roleBuckets)
      .filter(([, users]) => users.length > 0)
      .map(([role, users]) => `• ${roleIcon[role] || '👤'} **${role}:** ${users.map((id) => `<@${id}>`).join(', ')}`)
      .join('\n') || 'Sin participantes';
  }

  return new EmbedBuilder()
    .setColor(isActive ? COLORS.primary : COLORS.info)
    .setTitle(`🎯 ${event.name || event.activity_type} · #${event.id}`)
    .setDescription(
      withRoles
        ? `🟢 Estado: **${event.status}**\n🕒 Fecha: <t:${Math.floor(new Date(event.scheduled_at).getTime() / 1000)}:f>\n👥 Cupos: **${participants.length}/${event.max_participants}**\n\n${roleSummary}`
        : `🟢 Estado: **${event.status}**\n🕒 Fecha: <t:${Math.floor(new Date(event.scheduled_at).getTime() / 1000)}:f>\n👥 Cupos: **${participants.length}/${event.max_participants}**`
    )
    .addFields({
      name: '👤 Participantes',
      value: participants.length
        ? (withRoles
          ? participants.map((p) => `<@${p.user_id}> (${p.role || 'Otros'})`).join(', ').slice(0, 1024)
          : participants.map((p) => `<@${p.user_id}>`).join(', ').slice(0, 1024))
        : 'Sin participantes',
      inline: false
    })
    .setTimestamp();
}

export function lootDistributionEmbed(event, lootTotal, sharePerPerson, attendedIds) {
  const participantsList = attendedIds.map((id) => `<@${id}>`).join(', ');
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`📦 Reparto de loot - Evento #${event.id} - ${event.activity_type}`)
    .addFields(
      { name: '💰 Loot total', value: `${Number(lootTotal).toLocaleString('es-ES')} silver`, inline: true },
      { name: '👥 Participantes', value: `${attendedIds.length}`, inline: true },
      { name: '➗ Por persona', value: `${Number(sharePerPerson).toLocaleString('es-ES')} silver`, inline: true },
      { name: 'Participantes que recibieron loot', value: participantsList || '—', inline: false }
    )
    .setTimestamp();
}
