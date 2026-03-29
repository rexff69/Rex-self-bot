import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '..', '..', 'database');
const CONFIG_FILE = path.join(CONFIG_PATH, 'rpcConfig.json');

const defaultConfig = { enabled: false, type: null, name: null, details: null, state: null, imageUrl: null, imageText: null, smallImageUrl: null, smallImageText: null, button1Label: null, button1Url: null, button2Label: null, button2Url: null };

const VALID_TYPES = ['PLAYING', 'STREAMING', 'LISTENING', 'WATCHING'];
const ACTIVITY_TYPES = { PLAYING: 0, STREAMING: 1, LISTENING: 2, WATCHING: 3 };

if (!fs.existsSync(CONFIG_PATH)) fs.mkdirSync(CONFIG_PATH, { recursive: true });

export function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) return { ...defaultConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch (e) { console.error('[RPC] Error loading config:', e); }
  return { ...defaultConfig };
}

export function saveConfig(config) {
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2)); }
  catch (e) { console.error('[RPC] Error saving config:', e); }
}

// Only allow cdn.discordapp.com links
function isDiscordCdn(str) {
  try {
    const u = new URL(str);
    return u.hostname === 'cdn.discordapp.com';
  } catch { return false; }
}

export async function setRichPresence(client, config) {
  try {
    if (!config.enabled || !config.type || !config.name) {
      await client.user.setActivity(null);
      console.log('[RPC] Cleared');
      return;
    }

    const activity = {
      name: config.name,
      type: ACTIVITY_TYPES[config.type],
      url: config.type === 'STREAMING' ? 'https://twitch.tv/discord' : undefined,
    };

    if (config.details) activity.details = config.details;
    if (config.state) activity.state = config.state;

    // Build assets — no mp: prefix, raw URL only for cdn.discordapp.com
    const assets = {};
    if (config.imageUrl && isDiscordCdn(config.imageUrl)) {
      assets.large_image = config.imageUrl;
      assets.large_text = config.imageText || config.name;
    }
    if (config.smallImageUrl && isDiscordCdn(config.smallImageUrl)) {
      assets.small_image = config.smallImageUrl;
      assets.small_text = config.smallImageText || '';
    }
    if (Object.keys(assets).length) activity.assets = assets;

    // Buttons
    const buttons = [];
    if (config.button1Label && config.button1Url) buttons.push({ label: config.button1Label, url: config.button1Url });
    if (config.button2Label && config.button2Url) buttons.push({ label: config.button2Label, url: config.button2Url });
    if (buttons.length) activity.buttons = buttons;

    await client.user.setActivity(activity);
    console.log(`[RPC] Set: ${config.type} "${config.name}"`);
  } catch (error) {
    console.error('[RPC] Error setting presence:', error);
    throw error;
  }
}

export default {
  name: 'rpc',
  aliases: ['status', 'presence'],
  category: 'utility',
  description: 'Configure Rich Presence status',
  usage: 'rpc <on/off/TYPE> [text] [imageURL]',

  async execute(message, args, client) {
    const config = loadConfig();

    if (args.length === 0) {
      return message.channel.send([
        '```',
        '╭─[ RPC CONFIG ]─╮\n',
        '  rpc <TYPE> <text> [cdn.discordapp.com imageURL]',
        '  rpc on   — re-enable saved activity',
        '  rpc off  — disable activity\n',
        '  Types: PLAYING, STREAMING, LISTENING, WATCHING\n',
        '  Tip: Use the web dashboard at localhost:3000 for full config',
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));
    }

    const subCommand = args[0].toUpperCase();

    try {
      if (subCommand === 'OFF') {
        config.enabled = false;
        saveConfig(config);
        await setRichPresence(client, config);
        return message.channel.send('```\n⏹️  RPC disabled.\n```');
      }

      if (subCommand === 'ON') {
        if (!config.type || !config.name) {
          return message.channel.send([
            '```',
            '❌ No activity configured yet.\n',
            '  Set one first:',
            '    rpc PLAYING Minecraft',
            '  Or use the dashboard at localhost:3000',
            '```',
          ].join('\n'));
        }
        config.enabled = true;
        saveConfig(config);
        await setRichPresence(client, config);
        return message.channel.send([
          '```',
          '╭─[ RPC ENABLED ]─╮\n',
          `  Type:  ${config.type}`,
          `  Text:  ${config.name}`,
          `  Image: ${config.imageUrl ?? 'None'}`,
          '  Status: Enabled ✅',
          '\n╰──────────────────────────────────╯',
          '```',
        ].join('\n'));
      }

      if (!VALID_TYPES.includes(subCommand)) {
        return message.channel.send(`\`\`\`\n❌ Invalid type. Use: ${VALID_TYPES.join(', ')}\n\`\`\``);
      }

      if (args.length < 2) {
        return message.channel.send('```\n❌ Status text cannot be empty.\n```');
      }

      const lastArg = args[args.length - 1];
      const hasImage = isDiscordCdn(lastArg);

      if (args.length > 2 && !hasImage) {
        // last arg looks like a URL but isn't discord cdn
        if (lastArg.startsWith('http')) {
          return message.channel.send('```\n❌ Only cdn.discordapp.com image links are supported.\n```');
        }
      }

      const imageUrl = hasImage ? lastArg : null;
      const name = hasImage ? args.slice(1, -1).join(' ') : args.slice(1).join(' ');

      if (!name) return message.channel.send('```\n❌ Status text cannot be empty.\n```');

      config.type = subCommand;
      config.name = name;
      config.imageUrl = imageUrl;
      config.enabled = true;
      saveConfig(config);
      await setRichPresence(client, config);

      return message.channel.send([
        '```',
        '╭─[ RPC UPDATED ]─╮\n',
        `  Type:  ${config.type}`,
        `  Text:  ${config.name}`,
        `  Image: ${config.imageUrl ?? 'None'}`,
        '  Status: Enabled ✅',
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));
    } catch (error) {
      console.error('[RPC] Command error:', error);
      await message.channel.send(`\`\`\`\n❌ RPC Error: ${error.message}\n\`\`\``);
    }
  },
};

export async function initializeRPC(client) {
  console.log('[RPC] Initializing Rich Presence...');
  try {
    const config = loadConfig();
    await setRichPresence(client, config);
  } catch (error) {
    console.error('[RPC] Failed to initialize:', error);
  }
}
