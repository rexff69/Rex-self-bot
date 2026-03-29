import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE = path.join(__dirname, '..', 'database', 'autoreactions.json');

const defaults = {
  global: false,
  enabledServers: [],
  enabledChannels: [],
  textTriggers: {},
  userTriggers: {}
};

export function loadReactionData() {
  try {
    if (fs.existsSync(FILE)) return { ...defaults, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch (e) {}
  return { ...defaults };
}

export function saveReactionData(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function initializeAutoReaction(client) {
  console.log('[AutoReaction] Initializing...');
  client.on('messageCreate', async (message) => {
    if (!message.guild) return;
    if (message.author.id === client.user.id) return;
    const cfg = loadReactionData();
    const inChannel = cfg.enabledChannels.includes(message.channel.id);
    const inServer  = cfg.enabledServers.includes(message.guild.id);
    if (!cfg.global && !inChannel && !inServer) return;
    try {
      if (cfg.userTriggers[message.author.id]) {
        for (const emoji of cfg.userTriggers[message.author.id]) {
          await message.react(emoji).catch(() => {});
        }
      }
      const content = message.content.toLowerCase();
      for (const trigger in cfg.textTriggers) {
        if (content.includes(trigger.toLowerCase())) {
          for (const emoji of cfg.textTriggers[trigger]) {
            await message.react(emoji).catch(() => {});
          }
        }
      }
    } catch (e) { console.error('[AutoReaction] Error:', e); }
  });
}
