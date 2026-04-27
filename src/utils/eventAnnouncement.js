import { EmbedBuilder } from 'discord.js';
import { getEventAnnouncement, getEvent, getEventParticipants, isGroupEvent } from '../database/services.js';
import { eventDetailEmbed } from './embeds.js';
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
      await msg.edit({ embeds: [closedEmbed], components: [] });
      return;
    }

    const participants = getEventParticipants(eventId);
    await msg.edit({
      embeds: [eventDetailEmbed(event, participants, isGroupEvent(event))],
      components: eventAnnouncementRows(eventId)
    });
  } catch (err) {
    console.error('Error actualizando anuncio de evento:', err?.message);
  }
}
