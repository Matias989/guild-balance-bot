import { createServer } from 'http';
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { config } from 'dotenv';
import { setupPanel } from './handlers/panel.js';
import { handleInteraction } from './handlers/interactions.js';
import { getAvalonianaEmojiMap } from './utils/avalonianaEmojis.js';

config();

const port = process.env.PORT;
if (port) {
  createServer((_, res) => {
    res.writeHead(200);
    res.end('ok');
  }).listen(port, () => console.log(`Health check en :${port}`));
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Bot listo como ${c.user.tag}`);
  await setupPanel(c);

  const guildId = process.env.GUILD_ID;
  if (guildId) {
    const guild = await c.guilds.fetch(guildId).catch(() => null);
    if (guild) {
      getAvalonianaEmojiMap(guild).catch((err) => {
        console.warn('Precarga emojis Avaloniana:', err?.message);
      });
    }
  }
});

client.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction));

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('Error al iniciar:', err);
  process.exit(1);
});
