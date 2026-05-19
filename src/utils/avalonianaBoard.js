import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { AttachmentBuilder } from 'discord.js';
import {
  AVALONIANA_ROLES,
  countRoleOccupancy,
  getAvalonianaRoleImagePath
} from './avalonianaRoles.js';

const BOARD_NAME = 'avaloniana-posiciones.png';
const ICON_SIZE = 36;
const ROW_H = 48;
const PAD = 14;
const WIDTH = 340;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildOverlaySvg(participants, width, height) {
  const parts = [
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="10" fill="none" stroke="#5865f2" stroke-width="2"/>`
  ];

  for (let i = 0; i < AVALONIANA_ROLES.length; i++) {
    const role = AVALONIANA_ROLES[i];
    const y = PAD + i * ROW_H;
    const count = countRoleOccupancy(participants, role.name);
    const textY = y + Math.floor(ROW_H / 2) + 6;
    const nameX = PAD + ICON_SIZE + 18;

    parts.push(
      `<text x="${nameX}" y="${textY}" fill="#f2f3f5" font-size="15" font-family="Segoe UI, Arial, sans-serif" font-weight="600">${escapeXml(role.name)}</text>`,
      `<text x="${width - PAD - 6}" y="${textY}" fill="#b5bac1" font-size="14" font-family="Segoe UI, Arial, sans-serif" text-anchor="end">(${count}/${role.max})</text>`
    );

    if (i < AVALONIANA_ROLES.length - 1) {
      const lineY = y + ROW_H;
      parts.push(
        `<line x1="${PAD}" y1="${lineY}" x2="${width - PAD}" y2="${lineY}" stroke="#3f4147" stroke-width="1"/>`
      );
    }
  }

  parts.push('</svg>');
  return Buffer.from(parts.join(''));
}

export async function createAvalonianaBoardAttachment(participants) {
  try {
    const rows = AVALONIANA_ROLES.length;
    const height = PAD * 2 + ROW_H * rows;
    const iconLayers = [];

    for (let i = 0; i < AVALONIANA_ROLES.length; i++) {
      const role = AVALONIANA_ROLES[i];
      const y = PAD + i * ROW_H;
      const iconPath = getAvalonianaRoleImagePath(role);

      if (!fs.existsSync(iconPath)) {
        console.warn(`[Avaloniana] Falta imagen: ${path.basename(iconPath)}`);
        continue;
      }

      const iconBuf = await sharp(iconPath)
        .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      iconLayers.push({
        input: iconBuf,
        left: PAD + 4,
        top: y + Math.floor((ROW_H - ICON_SIZE) / 2)
      });
    }

    const overlay = buildOverlaySvg(participants, WIDTH, height);
    const layers = [...iconLayers, { input: overlay, top: 0, left: 0 }];

    const buffer = await sharp({
      create: {
        width: WIDTH,
        height,
        channels: 4,
        background: { r: 35, g: 36, b: 40, alpha: 255 }
      }
    })
      .composite(layers)
      .png()
      .toBuffer();

    return new AttachmentBuilder(buffer, { name: BOARD_NAME });
  } catch (err) {
    console.error('Error generando tablero Avaloniana:', err?.message);
    return null;
  }
}

export function getAvalonianaBoardAttachmentName() {
  return BOARD_NAME;
}
