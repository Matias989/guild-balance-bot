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
  getRecentGuildTransactions
} from '../database/services.js';
import {
  myAccountEmbed,
  guildSummaryEmbed,
  guildMovementsEmbed,
  staffPromptEmbed,
  successEmbed,
  errorEmbed
} from '../utils/embeds.js';
import { PREFIX, staffUserSelectRow, staffMoreRows } from '../utils/components.js';
import { setStaffState, getStaffState, clearStaffState } from '../utils/staffState.js';

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
      `${PREFIX}staff_movements`
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
