import { mainPanelEmbed } from '../utils/embeds.js';
import { mainPanelRows } from '../utils/components.js';
import { getGuildConfig, updateGuildConfig } from '../database/services.js';

export async function setupPanel(client) {
  const guildId = process.env.GUILD_ID;
  const panelChannelId = process.env.PANEL_CHANNEL_ID;

  if (!guildId || !panelChannelId) {
    console.warn('GUILD_ID o PANEL_CHANNEL_ID no configurados. El panel no se publicará.');
    return;
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(panelChannelId);

    if (process.env.ADMIN_USER_IDS || process.env.LEADER_ROLE_IDS) {
      const updates = {};
      if (process.env.ADMIN_USER_IDS) updates.admin_user_ids = process.env.ADMIN_USER_IDS;
      if (process.env.LEADER_ROLE_IDS) updates.leader_role_ids = process.env.LEADER_ROLE_IDS;
      updateGuildConfig(guildId, updates);
    }

    const config = getGuildConfig(guildId);
    const storedMessageId = config.panel_message_id;

    let panelMessage = null;
    if (storedMessageId) {
      try {
        panelMessage = await channel.messages.fetch(storedMessageId);
      } catch {
        panelMessage = null;
      }
    }

    const embed = mainPanelEmbed(guild.name);
    const components = mainPanelRows();

    if (panelMessage) {
      await panelMessage.edit({ embeds: [embed], components });
      console.log('Panel de balance actualizado.');
    } else {
      const msg = await channel.send({
        content: '**Panel cuenta corriente** — Usá los botones de abajo.',
        embeds: [embed],
        components
      });
      updateGuildConfig(guildId, { panel_message_id: msg.id });
      console.log('Panel de balance publicado.');
    }
  } catch (err) {
    console.error('Error al configurar panel:', err.message || err);
    if (err.code === 50001 || err.message?.includes('Missing Access')) {
      console.warn('→ Permisos del bot en el canal (Ver canal, Enviar mensajes, Incrustar).');
      console.warn('→ Revisá PANEL_CHANNEL_ID.');
    }
  }
}
