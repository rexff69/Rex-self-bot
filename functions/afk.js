import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AFK_FILE = path.join(__dirname, '..', 'database', 'afk.json');
const LOG_FILE = path.join(__dirname, '..', 'database', 'afklog.json');

export function loadAfk() {
  try { if (fs.existsSync(AFK_FILE)) return JSON.parse(fs.readFileSync(AFK_FILE, 'utf8')); } catch (e) {}
  return { isOn: false, reason: 'I am currently AFK.', logsEnabled: true };
}

export function saveAfk(data) { fs.writeFileSync(AFK_FILE, JSON.stringify(data, null, 2)); }

export function loadAfkLogs() {
  try { if (fs.existsSync(LOG_FILE)) return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch (e) {}
  return [];
}

export function saveAfkLogs(logs) { fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2)); }

export function initializeAfk(client) {
  console.log('[AFK] Initializing...');
  client.on('messageCreate', async (message) => {
    if (message.author.id === client.user.id) return;
    if (!message.guild) return;
    const afk = loadAfk();
    if (!afk.isOn) return;
    if (!message.mentions.has(client.user.id)) return;
    try {
      await message.reply(`💤 I'm AFK: ${afk.reason}`);
      if (afk.logsEnabled) {
        const logs = loadAfkLogs();
        logs.unshift({
          id: Date.now().toString(),
          user: message.author.tag,
          content: message.content.slice(0, 100),
          guild: message.guild.name,
          channel: message.channel.name,
          link: message.url,
          time: new Date().toLocaleTimeString()
        });
        saveAfkLogs(logs.slice(0, 50));
      }
    } catch (e) {}
  });
}
