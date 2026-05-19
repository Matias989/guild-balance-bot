import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AVALONIANA_IMG_DIR = path.join(__dirname, '..', 'img');

/** Plantilla de posiciones para eventos tipo Avaloniana */
export const AVALONIANA_ROLES = [
  { name: 'Martillo', max: 1, icon: '🔨', imageFile: 'Martillo.png' },
  { name: 'Incubo', max: 1, icon: '😈', imageFile: 'Incubo.png' },
  { name: 'Raiz Ferrea', max: 1, icon: '🌿', imageFile: 'Raiz.png' },
  { name: 'SC', max: 1, icon: '⚔️', imageFile: 'SC.png' },
  { name: 'Falce', max: 5, icon: '🌾', imageFile: 'Falce.png' }
];

export function getAvalonianaRoleImagePath(role) {
  return path.join(AVALONIANA_IMG_DIR, role.imageFile);
}

export const AVALONIANA_ROLE_NAMES = AVALONIANA_ROLES.map((r) => r.name);

export const AVALONIANA_MAX_PARTICIPANTS = AVALONIANA_ROLES.reduce((sum, r) => sum + r.max, 0);

export function countRoleOccupancy(participants, roleName) {
  return (participants || []).filter((p) => p.role === roleName).length;
}

export function canTakeAvalonianaRole(participants, roleName, userId) {
  const def = AVALONIANA_ROLES.find((r) => r.name === roleName);
  if (!def) return false;
  const current = (participants || []).find((p) => p.user_id === userId);
  if (current?.role === roleName) return true;
  return countRoleOccupancy(participants, roleName) < def.max;
}

export function getAvailableAvalonianaRoleOptions(participants, userId) {
  return AVALONIANA_ROLES.filter((r) => canTakeAvalonianaRole(participants, r.name, userId)).map((r) => {
    const count = countRoleOccupancy(participants, r.name);
    return {
      label: `${r.name} (${count}/${r.max})`,
      value: r.name,
      description: count >= r.max ? 'Completo' : 'Disponible'
    };
  });
}

/** Texto con menciones debajo de cada posición (segundo embed, bajo la imagen del tablero) */
export function buildAvalonianaRosterDescription(participants) {
  const byRole = new Map(AVALONIANA_ROLES.map((r) => [r.name, []]));
  for (const p of participants || []) {
    if (byRole.has(p.role)) byRole.get(p.role).push(p);
  }

  const blocks = [];
  for (const role of AVALONIANA_ROLES) {
    const count = countRoleOccupancy(participants, role.name);
    const members = byRole.get(role.name) || [];
    const lines = [`${role.icon} **${role.name}** (${count}/${role.max})`];
    if (members.length) {
      for (const p of members) {
        lines.push(`<@${p.user_id}>`);
      }
    }
    blocks.push(lines.join('\n'));
  }

  return blocks.join('\n\n').slice(0, 4096);
}

export function formatAvalonianaRoleBoard(participants) {
  const innerWidth = 28;
  const lines = AVALONIANA_ROLES.map(({ name, max, icon }) => {
    const count = countRoleOccupancy(participants, name);
    const label = `${icon} ${name}`;
    const slot = `(${count}/${max})`;
    const padding = Math.max(1, innerWidth - label.length - slot.length);
    return `│ ${label}${' '.repeat(padding)}${slot} │`;
  });
  const border = '─'.repeat(innerWidth + 2);
  return ['```', `╭${border}╮`, ...lines, `╰${border}╯`, '```'].join('\n');
}
