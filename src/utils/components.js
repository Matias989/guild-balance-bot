import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder
} from 'discord.js';

export const PREFIX = 'bal_';

export function mainPanelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${PREFIX}my_account`)
        .setLabel('Mi cuenta')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💳'),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}guild_summary`)
        .setLabel('Resumen gremio')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📊'),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}events`)
        .setLabel('Eventos')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📅'),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}staff_menu`)
        .setLabel('Más opciones')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚙️')
    )
  ];
}

/** Subpanel ephemeral: agregar, quitar, movimientos (solo staff). */
export function staffMoreRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${PREFIX}staff_create_event`)
        .setLabel('Crear evento')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📝'),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}staff_close_event`)
        .setLabel('Cerrar evento')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}events`)
        .setLabel('Ver eventos')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📅')
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${PREFIX}staff_add`)
        .setLabel('Agregar silver')
        .setStyle(ButtonStyle.Success)
        .setEmoji('➕'),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}staff_remove`)
        .setLabel('Quitar silver')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('➖'),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}staff_movements`)
        .setLabel('Movimientos')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📜')
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${PREFIX}cancel`)
        .setLabel('Cerrar')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function eventsListRows(events) {
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${PREFIX}create_event`).setLabel('Crear evento').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${PREFIX}close_event`).setLabel('Cerrar evento').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${PREFIX}back_main`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
  );
  if (!events?.length) return [backRow];

  const select = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}event_select`)
    .setPlaceholder('Selecciona un evento...')
    .addOptions(events.slice(0, 25).map((e) => ({
      label: `${e.activity_type} - ${new Date(e.scheduled_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`,
      value: String(e.id),
      description: `${e.max_participants} cupos`
    })));

  return [
    new ActionRowBuilder().addComponents(select),
    backRow
  ];
}

export function eventDetailRows(eventId, isParticipant, withRoleSelector = false, canManageParticipants = false) {
  const rows = [];
  if (withRoleSelector) rows.push(eventRoleSelectRow(eventId));
  const buttons = [
    isParticipant
      ? new ButtonBuilder().setCustomId(`${PREFIX}leave_event:${eventId}`).setLabel('Salir').setStyle(ButtonStyle.Danger)
      : new ButtonBuilder().setCustomId(`${PREFIX}join_event:${eventId}`).setLabel('Unirme').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${PREFIX}events`).setLabel('Volver eventos').setStyle(ButtonStyle.Secondary)
  ];
  if (canManageParticipants) {
    buttons.unshift(
      new ButtonBuilder()
        .setCustomId(`${PREFIX}remove_from_event:${eventId}`)
        .setLabel('Quitar participantes')
        .setStyle(ButtonStyle.Primary)
    );
  }
  rows.push(new ActionRowBuilder().addComponents(...buttons));
  return rows;
}

export function eventAnnouncementRows(eventId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}join_event:${eventId}`).setLabel('Unirme').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`${PREFIX}leave_event:${eventId}`).setLabel('Salir').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function eventRoleSelectRow(eventId) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}event_role:${eventId}`)
    .setPlaceholder('Elegir rol (si no, queda en Otros)')
    .addOptions([
      { label: 'Tanque', value: 'Tanque' },
      { label: 'Healer', value: 'Healer' },
      { label: 'Flamigero', value: 'Flamigero' },
      { label: 'Shadow Caller', value: 'Shadow Caller' },
      { label: 'Otros', value: 'Otros' }
    ]);
  return new ActionRowBuilder().addComponents(select);
}

export function closeEventSelectRows(events) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}close_event_select`)
    .setPlaceholder('Selecciona evento a cerrar...')
    .addOptions(events.slice(0, 25).map((e) => ({
      label: `#${e.id} ${e.activity_type}`,
      value: String(e.id),
      description: new Date(e.scheduled_at).toLocaleString('es-ES')
    })));
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}cancel`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function closeAttendeesRows(eventId, participants) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}close_attendees:${eventId}`)
    .setPlaceholder('Selecciona quienes asistieron...')
    .setMinValues(1)
    .setMaxValues(Math.max(1, Math.min(25, participants.length)))
    .addOptions(participants.slice(0, 25).map((p, i) => ({
      label: (p.displayName || `Participante ${i + 1}`).slice(0, 100),
      value: p.user_id,
      default: true
    })));
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}cancel`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function removeParticipantsRows(eventId, participants) {
  if (!participants?.length) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`${PREFIX}events`).setLabel('Volver eventos').setStyle(ButtonStyle.Secondary)
      )
    ];
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}remove_participants:${eventId}`)
    .setPlaceholder('Selecciona a quiénes quitar...')
    .setMinValues(1)
    .setMaxValues(Math.max(1, Math.min(25, participants.length)))
    .addOptions(participants.slice(0, 25).map((p, i) => ({
      label: (p.displayName || `Participante ${i + 1}`).slice(0, 100),
      value: p.user_id
    })));
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}events`).setLabel('Volver eventos').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function createEventActivitySelect(types) {
  return new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}create_event_type`)
    .setPlaceholder('Tipo de actividad...')
    .addOptions(types.map((t) => ({ label: t, value: t })));
}

export function staffUserSelectRow(flow) {
  const select = new UserSelectMenuBuilder()
    .setCustomId(`${PREFIX}staff_user:${flow}`)
    .setPlaceholder('Elegí al usuario...')
    .setMaxValues(1);
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${PREFIX}cancel`)
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}
