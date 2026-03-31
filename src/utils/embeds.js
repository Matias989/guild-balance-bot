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
    .setTitle(`Cuenta corriente — ${guildName || 'Gremio'}`)
    .setDescription(
      '**Mi cuenta** y **Resumen gremio** están disponibles para todos. Oficiales y administradores usan **Más opciones** para agregar o quitar silver y ver movimientos del gremio.'
    )
    .setFooter({ text: 'Silver en cuenta corriente (referencia in-game).' })
    .setTimestamp();
}

export function myAccountEmbed(userId, balance, history) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('Tu cuenta corriente')
    .setDescription(`<@${userId}>`)
    .addFields({
      name: 'Saldo actual',
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
      name: 'Últimos movimientos',
      value: lines.join('\n').slice(0, 4096) || '—',
      inline: false
    });
  }
  return embed;
}

export function guildSummaryEmbed(accounts, aggregate) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('Resumen del gremio')
    .setTimestamp();

  embed.addFields(
    {
      name: 'Total en cuentas',
      value: `**${Number(aggregate.totalBalance).toLocaleString('es-ES')}** silver`,
      inline: true
    },
    {
      name: 'Miembros registrados',
      value: `${aggregate.registeredUsers}`,
      inline: true
    },
    {
      name: 'Con saldo > 0',
      value: `${aggregate.accountsWithPositiveBalance}`,
      inline: true
    }
  );

  if (!accounts?.length) {
    embed.addFields({
      name: 'Cuentas con saldo',
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
      name: i === 0 ? 'Ranking por saldo' : '\u200b',
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
    .setTitle('Últimos movimientos (todo el gremio)')
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
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

export function successEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(title).setDescription(description).setTimestamp();
}

export function errorEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(title).setDescription(description).setTimestamp();
}
