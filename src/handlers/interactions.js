import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import {
  registerUser,
  getGuildConfig,
  getUserBalance,
  getBalanceHistory,
  addToBalance,
  deductFromBalance,
  getAllUserBalances,
  getGuildBalanceAggregate,
  getRecentGuildTransactions,
  getActivityTypes,
  createEvent,
  getActiveEvents,
  getEvent,
  getEventParticipants,
  joinEvent,
  leaveEvent,
  getClosableEvents,
  closeEvent,
  updateParticipantRole,
  isGroupEvent,
  setEventAnnouncement
} from '../database/services.js';
import {
  myAccountEmbed,
  guildSummaryEmbed,
  guildMovementsEmbed,
  staffPromptEmbed,
  successEmbed,
  errorEmbed,
  eventsListEmbed,
  eventDetailEmbed,
  lootDistributionEmbed
} from '../utils/embeds.js';
import {
  PREFIX,
  staffUserSelectRow,
  staffMoreRows,
  eventsListRows,
  eventDetailRows,
  closeEventSelectRows,
  closeAttendeesRows,
  removeParticipantsRows,
  createEventActivitySelect,
  mainPanelRows,
  eventAnnouncementRows
} from '../utils/components.js';
import { updateEventAnnouncementMessage } from '../utils/eventAnnouncement.js';
import { setStaffState, getStaffState, clearStaffState } from '../utils/staffState.js';

function buildEventAnnouncementContent() {
  // Soporta uno o varios roles separados por coma en la misma variable.
  const raw = process.env.EVENTS_ANNOUNCE_ROLE_ID || '';
  const roleIds = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!roleIds.length) return '¡Nuevo evento programado!';
  const mentions = roleIds.map((id) => `<@&${id}>`).join(' ');
  return `${mentions} ¡Nuevo evento programado!`;
}

function useUpdate(interaction) {
  return (interaction.message?.flags?.bitfield & 64) === 64;
}

function isStaff(interaction, guildId) {
  const uid = interaction.user?.id;
  if (interaction.guild?.ownerId === uid) return true;
  const config = getGuildConfig(guildId);
  const adminStr = config.admin_user_ids || process.env.ADMIN_USER_IDS || '';
  const adminIds = adminStr.split(',').map((s) => s.trim()).filter(Boolean);
  if (adminIds.includes(uid)) return true;
  const roleStr = config.leader_role_ids || process.env.LEADER_ROLE_IDS || '';
  const roleIds = roleStr.split(',').map((s) => s.trim()).filter(Boolean);
  return roleIds.length > 0 && interaction.member?.roles?.cache?.some((r) => roleIds.includes(r.id));
}

export async function handleInteraction(interaction) {
  if (
    !interaction.isButton() &&
    !interaction.isStringSelectMenu() &&
    !interaction.isUserSelectMenu() &&
    !interaction.isModalSubmit()
  ) {
    return;
  }

  const customId = interaction.customId || '';
  if (!customId.startsWith(PREFIX)) return;

  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  if (!guildId) {
    await interaction.reply({
      content: 'Solo funciona en un servidor.',
      ephemeral: true
    }).catch(() => {});
    return;
  }

  registerUser(guildId, userId, interaction.user.tag || interaction.user.username);

  try {
    if (interaction.isButton() && customId === `${PREFIX}my_account`) {
      const balance = getUserBalance(guildId, userId);
      const history = getBalanceHistory(guildId, userId, 12);
      const payload = {
        embeds: [myAccountEmbed(userId, balance, history)],
        ephemeral: true
      };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    if (interaction.isButton() && customId === `${PREFIX}guild_summary`) {
      const accounts = getAllUserBalances(guildId);
      const aggregate = getGuildBalanceAggregate(guildId);
      const payload = {
        embeds: [guildSummaryEmbed(accounts, aggregate)],
        ephemeral: true
      };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    if (interaction.isButton() && customId === `${PREFIX}staff_menu`) {
      if (!isStaff(interaction, guildId)) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              'Sin permiso',
              '**Más opciones** solo está disponible para oficiales y administradores.'
            )
          ],
          ephemeral: true
        });
        return;
      }
      const payload = {
        embeds: [
          staffPromptEmbed(
            'Más opciones',
            'Gestioná ingresos, egresos o revisá los últimos movimientos del gremio.'
          )
        ],
        components: staffMoreRows(),
        ephemeral: true
      };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    if (interaction.isButton() && customId === `${PREFIX}events`) {
      const events = getActiveEvents(guildId);
      const payload = {
        embeds: [eventsListEmbed(events)],
        components: eventsListRows(events),
        ephemeral: true
      };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    if (interaction.isButton() && customId === `${PREFIX}create_event`) {
      const select = createEventActivitySelect(getActivityTypes());
      const payload = {
        embeds: [staffPromptEmbed('Crear evento', 'Selecciona el tipo de actividad para continuar.')],
        components: [
          new ActionRowBuilder().addComponents(select),
          ...eventsListRows(getActiveEvents(guildId)).slice(1, 2)
        ],
        ephemeral: true
      };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    if (interaction.isButton() && customId === `${PREFIX}close_event`) {
      const allActive = getClosableEvents(guildId);
      const isUserStaff = isStaff(interaction, guildId);
      const events = isUserStaff ? allActive : allActive.filter((e) => e.creator_id === userId);
      if (!events.length) {
        const payload = {
          embeds: [errorEmbed('Sin eventos', isUserStaff
            ? 'No hay eventos activos para cerrar.'
            : 'No tienes eventos activos creados por ti para cerrar.')],
          ephemeral: true
        };
        if (useUpdate(interaction)) await interaction.update(payload);
        else await interaction.reply(payload);
        return;
      }
      const payload = {
        embeds: [staffPromptEmbed('Cerrar evento', 'Selecciona un evento y luego quienes asistieron.')],
        components: closeEventSelectRows(events),
        ephemeral: true
      };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    if (interaction.isButton() && customId === `${PREFIX}back_main`) {
      const payload = {
        embeds: [staffPromptEmbed('Panel principal', 'Elegi una opcion del panel.')],
        components: mainPanelRows(),
        ephemeral: true
      };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    if (interaction.isButton() && customId === `${PREFIX}cancel`) {
      clearStaffState(userId);
      const payload = {
        embeds: [staffPromptEmbed('Cancelado', 'Podés usar de nuevo el panel del canal.')],
        components: [],
        ephemeral: true
      };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    const staffButtons = new Set([
      `${PREFIX}staff_add`,
      `${PREFIX}staff_remove`,
      `${PREFIX}staff_movements`,
      `${PREFIX}staff_create_event`,
      `${PREFIX}staff_close_event`
    ]);

    if (interaction.isButton() && staffButtons.has(customId)) {
      if (!isStaff(interaction, guildId)) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              'Sin permiso',
              'Solo oficiales o administradores pueden usar esta acción. Abrí **Más opciones** desde el panel.'
            )
          ],
          ephemeral: true
        });
        return;
      }

      if (customId === `${PREFIX}staff_add`) {
        const payload = {
          embeds: [
            staffPromptEmbed(
              'Agregar silver',
              'Elegí al usuario que recibe el ingreso en su cuenta corriente.'
            )
          ],
          components: staffUserSelectRow('add'),
          ephemeral: true
        };
        if (useUpdate(interaction)) await interaction.update(payload);
        else await interaction.reply(payload);
        return;
      }

      if (customId === `${PREFIX}staff_remove`) {
        const payload = {
          embeds: [
            staffPromptEmbed(
              'Quitar silver',
              'Elegí al usuario. Se descontará hasta su saldo actual (no queda negativo).'
            )
          ],
          components: staffUserSelectRow('remove'),
          ephemeral: true
        };
        if (useUpdate(interaction)) await interaction.update(payload);
        else await interaction.reply(payload);
        return;
      }

      if (customId === `${PREFIX}staff_movements`) {
        const rows = getRecentGuildTransactions(guildId, 18);
        const payload = {
          embeds: [guildMovementsEmbed(rows)],
          components: [],
          ephemeral: true
        };
        if (useUpdate(interaction)) await interaction.update(payload);
        else await interaction.reply(payload);
        return;
      }

      if (customId === `${PREFIX}staff_create_event`) {
        const select = createEventActivitySelect(getActivityTypes());
        const payload = {
          embeds: [staffPromptEmbed('Crear evento', 'Selecciona el tipo de actividad para continuar.')],
          components: [
            new ActionRowBuilder().addComponents(select),
            ...staffMoreRows().slice(1, 2)
          ],
          ephemeral: true
        };
        if (useUpdate(interaction)) await interaction.update(payload);
        else await interaction.reply(payload);
        return;
      }

      if (customId === `${PREFIX}staff_close_event`) {
        const events = getClosableEvents(guildId);
        if (!events.length) {
          const payload = {
            embeds: [errorEmbed('Sin eventos', 'No hay eventos activos para cerrar.')],
            ephemeral: true
          };
          if (useUpdate(interaction)) await interaction.update(payload);
          else await interaction.reply(payload);
          return;
        }
        const payload = {
          embeds: [staffPromptEmbed('Cerrar evento', 'Selecciona un evento y luego quienes asistieron.')],
          components: closeEventSelectRows(events),
          ephemeral: true
        };
        if (useUpdate(interaction)) await interaction.update(payload);
        else await interaction.reply(payload);
        return;
      }
    }

    if (interaction.isStringSelectMenu() && customId === `${PREFIX}event_select`) {
      const eventId = parseInt(interaction.values[0], 10);
      const event = getEvent(eventId);
      if (!event) {
        await interaction.update({ embeds: [errorEmbed('Error', 'Evento no encontrado.')], components: [], ephemeral: true });
        return;
      }
      const participants = getEventParticipants(eventId);
      const isParticipant = participants.some((p) => p.user_id === userId);
      await interaction.update({
        embeds: [eventDetailEmbed(event, participants, isGroupEvent(event))],
        components: eventDetailRows(eventId, isParticipant, isGroupEvent(event), isStaff(interaction, guildId)),
        ephemeral: true
      });
      return;
    }

    if (interaction.isStringSelectMenu() && customId.startsWith(`${PREFIX}event_role:`)) {
      const eventId = parseInt(customId.split(':')[1], 10);
      const selectedRole = interaction.values[0] || 'Otros';
      const event = getEvent(eventId);
      if (!event || event.status !== 'active') {
        await interaction.update({
          embeds: [errorEmbed('Evento no disponible', 'El evento no existe o ya se cerro.')],
          components: [],
          ephemeral: true
        });
        return;
      }
      if (!isGroupEvent(event)) {
        await interaction.reply({
          embeds: [errorEmbed('No aplica', 'La seleccion de roles solo esta disponible para eventos de tipo Grupal.')],
          ephemeral: true
        });
        return;
      }

      const participantsBefore = getEventParticipants(eventId);
      // En grupales, cada rol clave debe ser único (excepto "Otros").
      if (selectedRole !== 'Otros') {
        const takenByAnother = participantsBefore.some(
          (p) => p.role === selectedRole && p.user_id !== userId
        );
        if (takenByAnother) {
          await interaction.reply({
            embeds: [errorEmbed('Rol ocupado', `El rol **${selectedRole}** ya está asignado. Elige otro rol u **Otros**.`)],
            ephemeral: true
          });
          return;
        }
      }
      const alreadyIn = participantsBefore.some((p) => p.user_id === userId);
      if (alreadyIn) {
        updateParticipantRole(eventId, userId, selectedRole);
      } else {
        const joinResult = joinEvent(eventId, userId, guildId, selectedRole);
        if (!joinResult.ok) {
          await interaction.reply({
            embeds: [errorEmbed('No se pudo unir', joinResult.reason)],
            ephemeral: true
          });
          return;
        }
      }

      const participants = getEventParticipants(eventId);
      updateEventAnnouncementMessage(interaction.client, eventId).catch(() => {});
      await interaction.update({
        embeds: [successEmbed('Rol actualizado', `Quedaste como **${selectedRole}**.`), eventDetailEmbed(event, participants, true)],
        components: eventDetailRows(eventId, true, true, isStaff(interaction, guildId)),
        ephemeral: true
      });
      return;
    }

    if (interaction.isButton() && customId.startsWith(`${PREFIX}remove_from_event:`)) {
      const eventId = parseInt(customId.split(':')[1], 10);
      if (!isStaff(interaction, guildId)) {
        await interaction.reply({
          embeds: [errorEmbed('Sin permiso', 'Solo staff puede quitar participantes de un evento.')],
          ephemeral: true
        });
        return;
      }
      const event = getEvent(eventId);
      if (!event || event.status !== 'active') {
        await interaction.reply({
          embeds: [errorEmbed('No disponible', 'Evento no encontrado o ya cerrado.')],
          ephemeral: true
        });
        return;
      }
      const participants = getEventParticipants(eventId);
      const participantsWithNames = await enrichParticipantsWithNames(interaction.guild, participants);
      await interaction.reply({
        embeds: [staffPromptEmbed('Quitar participantes', `Evento #${eventId}. Selecciona a quiénes quieres quitar.`)],
        components: removeParticipantsRows(eventId, participantsWithNames),
        ephemeral: true
      });
      return;
    }

    if (interaction.isStringSelectMenu() && customId.startsWith(`${PREFIX}remove_participants:`)) {
      const eventId = parseInt(customId.split(':')[1], 10);
      if (!isStaff(interaction, guildId)) {
        await interaction.reply({
          embeds: [errorEmbed('Sin permiso', 'Solo staff puede quitar participantes de un evento.')],
          ephemeral: true
        });
        return;
      }
      const event = getEvent(eventId);
      if (!event || event.status !== 'active') {
        await interaction.update({
          embeds: [errorEmbed('No disponible', 'Evento no encontrado o ya cerrado.')],
          components: [],
          ephemeral: true
        });
        return;
      }
      const userIdsToRemove = interaction.values || [];
      let removed = 0;
      for (const uid of userIdsToRemove) {
        if (leaveEvent(eventId, uid)) removed++;
      }
      updateEventAnnouncementMessage(interaction.client, eventId).catch(() => {});

      const participants = getEventParticipants(eventId);
      const participantsWithNames = await enrichParticipantsWithNames(interaction.guild, participants);
      await interaction.update({
        embeds: [
          successEmbed('Participantes quitados', `Se quitaron **${removed}** participante(s) del evento #${eventId}.`),
          eventDetailEmbed(event, participants, isGroupEvent(event))
        ],
        components: removeParticipantsRows(eventId, participantsWithNames),
        ephemeral: true
      });
      return;
    }

    if (interaction.isStringSelectMenu() && customId === `${PREFIX}create_event_type`) {
      const activityType = interaction.values[0];
      setStaffState(userId, { flow: 'create_event', activityType });
      await interaction.showModal(buildCreateEventModal(activityType, isStaff(interaction, guildId)));
      return;
    }

    if (interaction.isStringSelectMenu() && customId === `${PREFIX}close_event_select`) {
      const eventId = parseInt(interaction.values[0], 10);
      const event = getEvent(eventId);
      const canClose = !!event && (isStaff(interaction, guildId) || event.creator_id === userId);
      if (!canClose) {
        await interaction.update({
          embeds: [errorEmbed('Sin permiso', 'Solo staff o el creador del evento puede cerrarlo.')],
          components: [],
          ephemeral: true
        });
        return;
      }
      const participants = getEventParticipants(eventId);
      if (!participants.length) {
        await interaction.update({
          embeds: [errorEmbed('Sin participantes', 'No se puede cerrar sin participantes.')],
          components: [],
          ephemeral: true
        });
        return;
      }
      const participantsWithNames = await enrichParticipantsWithNames(interaction.guild, participants);
      await interaction.update({
        embeds: [staffPromptEmbed('Asistentes', 'Selecciona quienes asistieron al evento.')],
        components: closeAttendeesRows(eventId, participantsWithNames),
        ephemeral: true
      });
      return;
    }

    if (interaction.isStringSelectMenu() && customId.startsWith(`${PREFIX}close_attendees:`)) {
      const eventId = parseInt(customId.split(':')[1], 10);
      const event = getEvent(eventId);
      const canClose = !!event && (isStaff(interaction, guildId) || event.creator_id === userId);
      if (!canClose) {
        await interaction.reply({
          embeds: [errorEmbed('Sin permiso', 'Solo staff o el creador del evento puede cerrarlo.')],
          ephemeral: true
        });
        return;
      }
      const participants = getEventParticipants(eventId);
      const selected = interaction.values || [];
      const attendedIds = selected;
      setStaffState(userId, { flow: 'close_event', eventId, attendedIds });
      const participantsWithNames = await enrichParticipantsWithNames(interaction.guild, participants);
      await interaction.update({
        embeds: [
          staffPromptEmbed(
            'Asistentes seleccionados',
            attendedIds.length
              ? `Asistentes marcados: **${attendedIds.length}**. Pulsa **Finalizar evento** para cargar el loot.`
              : 'No hay asistentes marcados. Selecciona al menos uno para continuar.'
          )
        ],
        components: closeAttendeesRows(eventId, participantsWithNames),
        ephemeral: true
      });
      return;
    }

    if (interaction.isButton() && customId.startsWith(`${PREFIX}finalize_close:`)) {
      const eventId = parseInt(customId.split(':')[1], 10);
      const event = getEvent(eventId);
      const canClose = !!event && (isStaff(interaction, guildId) || event.creator_id === userId);
      if (!canClose) {
        await interaction.reply({
          embeds: [errorEmbed('Sin permiso', 'Solo staff o el creador del evento puede cerrarlo.')],
          ephemeral: true
        });
        return;
      }
      const participants = getEventParticipants(eventId);
      const state = getStaffState(userId);
      const selected = state && state.flow === 'close_event' && state.eventId === eventId
        ? (state.attendedIds || [])
        : [];
      const attendedIds = selected.length ? selected : participants.map((p) => p.user_id);
      setStaffState(userId, { flow: 'close_event', eventId, attendedIds });
      await interaction.showModal(buildCloseEventLootModal(eventId));
      return;
    }

    if (interaction.isButton() && customId.startsWith(`${PREFIX}join_event:`)) {
      const eventId = parseInt(customId.split(':')[1], 10);
      const result = joinEvent(eventId, userId, guildId);
      if (!result.ok) {
        await interaction.reply({ embeds: [errorEmbed('No se pudo unir', result.reason)], ephemeral: true });
        return;
      }
      updateEventAnnouncementMessage(interaction.client, eventId).catch(() => {});
      const event = getEvent(eventId);
      const participants = getEventParticipants(eventId);
      await interaction.reply({
        embeds: [successEmbed('Inscripcion confirmada', `Te uniste al evento #${eventId}.`), eventDetailEmbed(event, participants, isGroupEvent(event))],
        components: eventDetailRows(eventId, true, isGroupEvent(event), isStaff(interaction, guildId)),
        ephemeral: true
      });
      return;
    }

    if (interaction.isButton() && customId.startsWith(`${PREFIX}leave_event:`)) {
      const eventId = parseInt(customId.split(':')[1], 10);
      const left = leaveEvent(eventId, userId);
      if (!left) {
        await interaction.reply({ embeds: [errorEmbed('No estabas inscripto', 'No figurabas como participante.')], ephemeral: true });
        return;
      }
      updateEventAnnouncementMessage(interaction.client, eventId).catch(() => {});
      const event = getEvent(eventId);
      const participants = getEventParticipants(eventId);
      await interaction.reply({
        embeds: [successEmbed('Baja confirmada', `Saliste del evento #${eventId}.`), eventDetailEmbed(event, participants, isGroupEvent(event))],
        components: eventDetailRows(eventId, false, isGroupEvent(event), isStaff(interaction, guildId)),
        ephemeral: true
      });
      return;
    }

    if (interaction.isUserSelectMenu() && customId.startsWith(`${PREFIX}staff_user:`)) {
      if (!isStaff(interaction, guildId)) {
        await interaction.reply({
          embeds: [errorEmbed('Sin permiso', 'No podés gestionar cuentas.')],
          ephemeral: true
        });
        return;
      }

      const flow = customId.slice(`${PREFIX}staff_user:`.length);
      const targetId = interaction.users.first()?.id;
      if (!targetId) {
        await interaction.reply({
          embeds: [errorEmbed('Error', 'No se seleccionó usuario.')],
          ephemeral: true
        });
        return;
      }

      registerUser(
        guildId,
        targetId,
        interaction.users.first()?.tag || interaction.users.first()?.username || null
      );

      if (flow === 'add') {
        setStaffState(userId, { flow: 'add', targetUserId: targetId });
        await interaction.showModal(buildAddModal());
        return;
      }
      if (flow === 'remove') {
        setStaffState(userId, { flow: 'remove', targetUserId: targetId });
        await interaction.showModal(buildRemoveModal(targetId, guildId));
        return;
      }
    }

    if (interaction.isModalSubmit() && customId === `${PREFIX}add_modal`) {
      if (!isStaff(interaction, guildId)) {
        await interaction.reply({
          embeds: [errorEmbed('Sin permiso', 'Operación no autorizada.')],
          ephemeral: true
        });
        return;
      }
      const state = getStaffState(userId);
      if (!state || state.flow !== 'add' || !state.targetUserId) {
        await interaction.reply({
          embeds: [errorEmbed('Sesión expirada', 'Volvé a **Más opciones** → **Agregar silver**.')],
          ephemeral: true
        });
        return;
      }

      const amountRaw = interaction.fields.getTextInputValue('amount').replace(',', '.').trim();
      const reason = interaction.fields.getTextInputValue('reason')?.trim() || 'Ingreso manual';
      const amount = parseFloat(amountRaw);
      if (Number.isNaN(amount) || amount <= 0) {
        await interaction.reply({
          embeds: [errorEmbed('Monto inválido', 'Indicá un número mayor a 0.')],
          ephemeral: true
        });
        return;
      }

      const newBal = addToBalance(
        guildId,
        state.targetUserId,
        amount,
        'ingreso',
        reason,
        userId
      );
      clearStaffState(userId);
      await interaction.reply({
        embeds: [
          successEmbed(
            'Ingreso registrado',
            `**+${amount.toLocaleString('es-ES')}** silver para <@${state.targetUserId}>.\nNuevo saldo: **${newBal.toLocaleString('es-ES')}** silver.`
          )
        ],
        ephemeral: true
      });
      return;
    }

    if (interaction.isModalSubmit() && customId === `${PREFIX}remove_modal`) {
      if (!isStaff(interaction, guildId)) {
        await interaction.reply({
          embeds: [errorEmbed('Sin permiso', 'Operación no autorizada.')],
          ephemeral: true
        });
        return;
      }
      const state = getStaffState(userId);
      if (!state || state.flow !== 'remove' || !state.targetUserId) {
        await interaction.reply({
          embeds: [errorEmbed('Sesión expirada', 'Volvé a **Más opciones** → **Quitar silver**.')],
          ephemeral: true
        });
        return;
      }

      const amountRaw = interaction.fields.getTextInputValue('amount').replace(',', '.').trim();
      const reason = interaction.fields.getTextInputValue('reason')?.trim() || 'Egreso manual';
      const amount = parseFloat(amountRaw);
      if (Number.isNaN(amount) || amount <= 0) {
        await interaction.reply({
          embeds: [errorEmbed('Monto inválido', 'Indicá un número mayor a 0.')],
          ephemeral: true
        });
        return;
      }

      const { newBalance, deducted } = deductFromBalance(
        guildId,
        state.targetUserId,
        amount,
        reason,
        userId
      );
      clearStaffState(userId);
      await interaction.reply({
        embeds: [
          successEmbed(
            'Egreso registrado',
            `Descontado **${deducted.toLocaleString('es-ES')}** silver de <@${state.targetUserId}>.\nNuevo saldo: **${newBalance.toLocaleString('es-ES')}** silver.`
          )
        ],
        ephemeral: true
      });
      return;
    }

    if (interaction.isModalSubmit() && customId === `${PREFIX}create_event_modal`) {
      const state = getStaffState(userId);
      if (!state || state.flow !== 'create_event') {
        await interaction.reply({ embeds: [errorEmbed('Sesion expirada', 'Volve a abrir Crear evento.')], ephemeral: true });
        return;
      }
      const dateTimeStr = interaction.fields.getTextInputValue('event_datetime');
      const maxPart = parseInt(interaction.fields.getTextInputValue('event_max') || '8', 10);
      const name = (interaction.fields.getTextInputValue('event_name') || '').trim();
      const scheduledAt = parseDateTimeInput(dateTimeStr);
      if (!scheduledAt) {
        await interaction.reply({
          embeds: [errorEmbed('Fecha invalida', 'Usa formato DD/MM/AAAA HH:MM (UTC).')],
          ephemeral: true
        });
        return;
      }

      const creatorIsStaff = isStaff(interaction, guildId);
      let affectsAccounting = false;
      if (creatorIsStaff) {
        const accountingRaw = (interaction.fields.getTextInputValue('event_accounting') || 'si').trim().toLowerCase();
        affectsAccounting = /^(si|sí|yes|true|1)$/.test(accountingRaw);
      }
      const eventId = createEvent(guildId, userId, {
        activityType: state.activityType,
        name: name || state.activityType,
        scheduledAt: scheduledAt.toISOString(),
        maxParticipants: maxPart,
        affectsAccounting
      });
      const event = getEvent(eventId);
      const eventsChannelId = process.env.EVENTS_CHANNEL_ID;
      if (event && eventsChannelId) {
        try {
          const channel = await interaction.client.channels.fetch(eventsChannelId).catch(() => null);
          if (channel) {
            const content = buildEventAnnouncementContent();
            const participants = getEventParticipants(eventId);
            const msg = await channel.send({
              content,
              embeds: [eventDetailEmbed(event, participants, isGroupEvent(event))],
              components: eventAnnouncementRows(eventId)
            });
            setEventAnnouncement(eventId, channel.id, msg.id);
          }
        } catch (err) {
          console.error('Error publicando evento en canal:', err?.message);
        }
      }
      clearStaffState(userId);
      await interaction.reply({
        embeds: [successEmbed('Evento creado', creatorIsStaff
          ? `Evento #${eventId} creado con impacto contable: **${affectsAccounting ? 'SI' : 'NO'}**.`
          : `Evento #${eventId} creado sin impacto contable (creador no staff).`)],
        ephemeral: true
      });
      return;
    }

    if (interaction.isModalSubmit() && customId === `${PREFIX}close_event_loot`) {
      const state = getStaffState(userId);
      if (!state || state.flow !== 'close_event') {
        await interaction.reply({ embeds: [errorEmbed('Sesion expirada', 'Volve a seleccionar el evento.')], ephemeral: true });
        return;
      }
      const event = getEvent(state.eventId);
      const canClose = !!event && (isStaff(interaction, guildId) || event.creator_id === userId);
      if (!canClose) {
        await interaction.reply({ embeds: [errorEmbed('Sin permiso', 'Solo staff o el creador del evento puede cerrarlo.')], ephemeral: true });
        return;
      }
      const lootRaw = interaction.fields.getTextInputValue('loot_total').replace(',', '.').trim();
      const loot = parseFloat(lootRaw || '0') || 0;
      const result = closeEvent(state.eventId, state.attendedIds, loot, userId);
      clearStaffState(userId);
      if (!result.ok) {
        await interaction.reply({ embeds: [errorEmbed('No se pudo cerrar', result.reason)], ephemeral: true });
        return;
      }
      updateEventAnnouncementMessage(interaction.client, state.eventId).catch(() => {});

      const lootChannelId = process.env.EVENTS_CHANNEL_LOOT_ID;
      if (result.affectsAccounting && lootChannelId && result.totalLoot > 0 && result.attendedUserIds.length > 0) {
        try {
          const channel = await interaction.client.channels.fetch(lootChannelId).catch(() => null);
          if (channel) {
            const content = result.attendedUserIds.map((id) => `<@${id}>`).join(' ');
            await channel.send({
              content,
              embeds: [lootDistributionEmbed(result.event, result.totalLoot, result.sharePerUser, result.attendedUserIds)]
            });
          }
        } catch (err) {
          console.error('Error enviando balance de loot:', err?.message);
        }
      }

      await interaction.reply({
        embeds: [
          successEmbed(
            'Evento cerrado',
            result.affectsAccounting
              ? `Asistentes: **${result.attendedCount}**\nLoot total: **${result.totalLoot.toLocaleString('es-ES')}** silver\nReparto por persona: **${result.sharePerUser.toLocaleString('es-ES')}** silver\n\nSin comision al gremio: se reparte todo entre asistentes.`
              : `Asistentes: **${result.attendedCount}**\nEvento cerrado sin impacto contable (creado por usuario no staff).`
          )
        ],
        ephemeral: true
      });
      return;
    }
  } catch (err) {
    console.error('Interaction error:', err);
    const fallback = {
      embeds: [errorEmbed('Error', 'No se pudo completar la acción. Probá de nuevo.')],
      ephemeral: true
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(fallback).catch(() => {});
    } else {
      await interaction.reply(fallback).catch(() => {});
    }
  }
}

async function enrichParticipantsWithNames(guild, participants) {
  if (!guild || !participants?.length) return participants.map((p) => ({ ...p, displayName: null }));
  return Promise.all(participants.map(async (p) => {
    try {
      const member = await guild.members.fetch(p.user_id).catch(() => null);
      return { ...p, displayName: member?.displayName || member?.user?.username || null };
    } catch {
      return { ...p, displayName: null };
    }
  }));
}

function buildAddModal() {
  return new ModalBuilder()
    .setCustomId(`${PREFIX}add_modal`)
    .setTitle('Ingresar silver')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('amount')
          .setLabel('Monto (silver)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ej: 150000')
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Motivo')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
      )
    );
}

function buildRemoveModal(targetUserId, guildId) {
  const bal = getUserBalance(guildId, targetUserId);
  const title = `Quitar · ${Number(bal).toLocaleString('es-ES')} silver`.slice(0, 45);
  return new ModalBuilder()
    .setCustomId(`${PREFIX}remove_modal`)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('amount')
          .setLabel('Monto a quitar')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Motivo')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
      )
    );
}

function buildCreateEventModal(activityType, canChooseAccounting = false) {
  const rows = [
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_name')
        .setLabel('Nombre (opcional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_datetime')
        .setLabel('Fecha y hora UTC (DD/MM/AAAA HH:MM)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('15/05/2026 21:00')
        .setValue(formatDateTimeUTC())
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_max')
        .setLabel('Cupo maximo')
        .setStyle(TextInputStyle.Short)
        .setValue('8')
        .setRequired(true)
    )
  ];

  if (canChooseAccounting) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('event_accounting')
          .setLabel('Impacta cuentas? (si/no)')
          .setStyle(TextInputStyle.Short)
          .setValue('si')
          .setRequired(false)
      )
    );
  }

  return new ModalBuilder()
    .setCustomId(`${PREFIX}create_event_modal`)
    .setTitle(`Nuevo evento: ${activityType}`.slice(0, 45))
    .addComponents(...rows);
}

function formatDateTimeUTC() {
  const now = new Date();
  const d = now.getUTCDate().toString().padStart(2, '0');
  const m = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const y = now.getUTCFullYear();
  const h = now.getUTCHours().toString().padStart(2, '0');
  const min = now.getUTCMinutes().toString().padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}`;
}

function buildCloseEventLootModal(eventId) {
  return new ModalBuilder()
    .setCustomId(`${PREFIX}close_event_loot`)
    .setTitle(`Cerrar evento #${eventId}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('loot_total')
          .setLabel('Loot total (silver)')
          .setStyle(TextInputStyle.Short)
          .setValue('0')
          .setRequired(false)
      )
    );
}

function parseDateTimeInput(input) {
  const [dateStr, timeStr] = input.includes(' ') ? input.split(' ') : [input, '20:00'];
  const [d, m, y] = (dateStr || '').split('/').map(Number);
  const [h, min] = (timeStr || '20:00').split(':').map(Number);
  if (!d || !m || !y || Number.isNaN(h) || Number.isNaN(min)) return null;
  const date = new Date(Date.UTC(y, m - 1, d, h, min, 0));
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== (m - 1) ||
    date.getUTCDate() !== d
  ) return null;
  return date;
}
