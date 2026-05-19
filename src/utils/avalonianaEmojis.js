import fs from 'fs';
import { PermissionsBitField } from 'discord.js';
import { AVALONIANA_ROLES, getAvalonianaRoleImagePath } from './avalonianaRoles.js';

const emojiCache = new Map();

function emojiNameForRole(role) {
  const slug = role.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `gb_${slug}`.slice(0, 32);
}

export function formatAvalonianaRoleIcon(role, emojiMap) {
  const emoji = emojiMap?.[role.name];
  if (emoji) return emoji.toString();
  return role.icon;
}

/** Crea o reutiliza emojis del servidor a partir de src/img para mostrarlos inline en el listado */
export async function getAvalonianaEmojiMap(guild) {
  if (!guild) return {};

  const cached = emojiCache.get(guild.id);
  if (cached) return cached;

  const map = {};
  const canManage =
    guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) ||
    guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);

  let existing;
  try {
    existing = await guild.emojis.fetch();
  } catch {
    emojiCache.set(guild.id, map);
    return map;
  }

  for (const role of AVALONIANA_ROLES) {
    const name = emojiNameForRole(role);
    let emoji = existing.find((e) => e.name === name);

    if (!emoji && canManage) {
      const imagePath = getAvalonianaRoleImagePath(role);
      if (fs.existsSync(imagePath)) {
        try {
          emoji = await guild.emojis.create({ attachment: imagePath, name });
        } catch (err) {
          console.warn(`[Avaloniana] No se pudo crear emoji ${name}:`, err?.message);
        }
      }
    }

    if (emoji) map[role.name] = emoji;
  }

  emojiCache.set(guild.id, map);
  return map;
}
