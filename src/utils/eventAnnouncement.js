import { EmbedBuilder } from 'discord.js';
import {
  getEventAnnouncement,
  getEvent,
  getEventParticipants,
  eventHasRoleSelection
} from '../database/services.js';
import { buildEventDetailPayload } from './embeds.js';
import { eventAnnouncementRows } from './components.js';

export async function updateEventAnnouncementMessage(client, eventId) {
  const ann = getEventAnnouncement(eventId);
  if (!ann) return;
  const event = getEvent(eventId);
  if (!event) return;

  try {
    const channel = await client.channels.fetch(ann.channel_id).catch(() => null);
    if (!channel) return;
    const msg = await channel.messages.fetch(ann.message_id).catch(() => null);
    if (!msg) return;

    if (event.status !== 'active') {
      const closedEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Evento #${event.id} · Cerrado`)
        .setDescription(`${event.name || event.activity_type}\nEste evento ya no acepta inscripciones.`)
        .setTimestamp();
      await msg.edit({ embeds: [closedEmbed], components: [], files: [] });
      return;
    }

    const participants = getEventParticipants(eventId);
    const guild = await client.guilds.fetch(event.guild_id).catch(() => null);
    const detail = await buildEventDetailPayload(
      event,
      participants,
      eventHasRoleSelection(event),
      guild
    );
    await msg.edit({
      ...detail,
      components: eventAnnouncementRows(eventId, event, participants)
    });
  } catch (err) {
    console.error('Error actualizando anuncio de evento:', err?.message);
  }
}
