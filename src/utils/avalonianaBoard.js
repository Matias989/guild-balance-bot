import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';
import {
  AVALONIANA_ROLES,
  countRoleOccupancy,
  getAvalonianaRoleImagePath
} from './avalonianaRoles.js';

const BOARD_NAME = 'avaloniana-posiciones.png';
const ICON_SIZE = 40;
const ROW_H = 52;
const PAD = 16;
const WIDTH = 380;

function strokeRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function createAvalonianaBoardAttachment(participants) {
  try {
    const rows = AVALONIANA_ROLES.length;
    const height = PAD * 2 + ROW_H * rows;
    const canvas = createCanvas(WIDTH, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#232428';
    ctx.fillRect(0, 0, WIDTH, height);

    ctx.strokeStyle = '#5865f2';
    ctx.lineWidth = 2;
    strokeRoundRect(ctx, 1, 1, WIDTH - 2, height - 2, 10);
    ctx.stroke();

    for (let i = 0; i < AVALONIANA_ROLES.length; i++) {
      const role = AVALONIANA_ROLES[i];
      const y = PAD + i * ROW_H;
      const count = countRoleOccupancy(participants, role.name);
      const textY = y + ROW_H / 2;

      if (i > 0) {
        ctx.strokeStyle = '#3f4147';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD, y);
        ctx.lineTo(WIDTH - PAD, y);
        ctx.stroke();
      }

      const iconPath = getAvalonianaRoleImagePath(role);
      if (fs.existsSync(iconPath)) {
        const img = await loadImage(iconPath);
        const iconY = y + (ROW_H - ICON_SIZE) / 2;
        ctx.drawImage(img, PAD + 4, iconY, ICON_SIZE, ICON_SIZE);
      } else {
        console.warn(`[Avaloniana] Falta imagen: ${path.basename(iconPath)}`);
      }

      const nameX = PAD + ICON_SIZE + 14;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f2f3f5';
      ctx.font = 'bold 16px Arial, Helvetica, sans-serif';
      ctx.fillText(role.name, nameX, textY);

      const slotText = `(${count}/${role.max})`;
      ctx.fillStyle = '#b5bac1';
      ctx.font = '14px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(slotText, WIDTH - PAD - 4, textY);
    }

    const buffer = canvas.toBuffer('image/png');
    return new AttachmentBuilder(buffer, { name: BOARD_NAME });
  } catch (err) {
    console.error('Error generando tablero Avaloniana:', err?.message);
    return null;
  }
}

export function getAvalonianaBoardAttachmentName() {
  return BOARD_NAME;
}
