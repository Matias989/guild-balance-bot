import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
        .setEmoji('💳')
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
        .setCustomId(`${PREFIX}staff_summary`)
        .setLabel('Resumen gremio')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📊'),
      new ButtonBuilder()
        .setCustomId(`${PREFIX}staff_movements`)
        .setLabel('Movimientos')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📜')
    )
  ];
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
