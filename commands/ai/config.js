import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_PATH = path.join(__dirname, '..', '..', 'database');
const AI_CONFIG_FILE = path.join(STORAGE_PATH, 'ai_config.json');

const VALID_PROVIDERS = ['groq', 'hf', 'huggingface', 'nim', 'nvidia'];
const PROVIDER_LABELS = {
  groq: 'Groq (llama-3.3-70b-versatile)',
  huggingface: 'HuggingFace (gemma-2-2b-it)',
  nim: 'NVIDIA NIM (llama-3.3-70b-instruct)',
};

function normalizeProvider(p) {
  if (p === 'hf') return 'huggingface';
  if (p === 'nvidia') return 'nim';
  return p;
}

function loadAIConfig() {
  try {
    if (fs.existsSync(AI_CONFIG_FILE)) return JSON.parse(fs.readFileSync(AI_CONFIG_FILE, 'utf8'));
  } catch (e) { console.error('[AI Config] Error loading:', e); }
  return {};
}

function saveAIConfig(data) {
  try { fs.writeFileSync(AI_CONFIG_FILE, JSON.stringify(data, null, 2)); }
  catch (e) { console.error('[AI Config] Error saving:', e); }
}

export default {
  name: 'ai',
  aliases: ['aiconfig', 'aic'],
  category: 'ai',
  description: 'Configure AI settings',
  usage: 'ai <on/off/respondtoall/provider/status>',

  async execute(message, args, client) {
    if (!message.guild) return message.channel.send('```\nUse this command in a server.\n```');

    const guildId = message.guild.id;
    const channelId = message.channel.id;
    const sub = args[0]?.toLowerCase();
    const config = loadAIConfig();

    if (!config[guildId]) {
      config[guildId] = { enabled: false, channels: [], respondToAll: false, provider: 'groq' };
    }

    if (!sub) {
      return message.channel.send([
        '```',
        '╭─[ AI CONFIG HELP ]─╮\n',
        '  ai on              — Enable AI in this channel',
        '  ai off             — Disable AI in this channel',
        '  ai respondtoall <on/off>',
        '  ai provider <groq/hf/nim>',
        '  ai status          — Show current config',
        '\n╰──────────────────────────────╯',
        '```',
      ].join('\n'));
    }

    // ── on ──
    if (['on', 'enable'].includes(sub)) {
      if (!config[guildId].channels.includes(channelId)) config[guildId].channels.push(channelId);
      config[guildId].enabled = true;
      saveAIConfig(config);
      return message.channel.send([
        '```',
        '╭─[ AI ENABLED ]─╮\n',
        `  Channel: #${message.channel.name}`,
        '  Status: Active ✅',
        `  Provider: ${PROVIDER_LABELS[config[guildId].provider] || config[guildId].provider}`,
        `  Respond To All: ${config[guildId].respondToAll ? 'Yes' : 'No'}`,
        '\n╰──────────────────────────────╯',
        '```',
      ].join('\n'));
    }

    // ── off ──
    if (['off', 'disable'].includes(sub)) {
      config[guildId].channels = config[guildId].channels.filter(id => id !== channelId);
      if (config[guildId].channels.length === 0) config[guildId].enabled = false;
      saveAIConfig(config);
      return message.channel.send('```\n✅ AI disabled in this channel.\n```');
    }

    // ── respondtoall ──
    if (sub === 'respondtoall') {
      const mode = args[1]?.toLowerCase();
      if (!['on', 'off'].includes(mode))
        return message.channel.send('```\nUsage: ai respondtoall <on/off>\n```');
      config[guildId].respondToAll = mode === 'on';
      saveAIConfig(config);
      return message.channel.send([
        '```',
        '╭─[ RESPOND TO ALL ]─╮\n',
        `  Status: ${config[guildId].respondToAll ? 'Enabled ✅' : 'Disabled ❌'}`,
        config[guildId].respondToAll
          ? '  AI will respond to everyone.'
          : '  AI will only respond to owner/allowed users.',
        '\n╰──────────────────────────────╯',
        '```',
      ].join('\n'));
    }

    // ── provider ──
    if (sub === 'provider') {
      const raw = args[1]?.toLowerCase();
      if (!raw || !VALID_PROVIDERS.includes(raw)) {
        return message.channel.send([
          '```',
          '╭─[ AVAILABLE PROVIDERS ]─╮\n',
          '  groq   — Groq (llama-3.3-70b-versatile)',
          '  hf     — HuggingFace (gemma-2-2b-it)',
          '  nim    — NVIDIA NIM (llama-3.3-70b-instruct)',
          '\n  Usage: ai provider <groq/hf/nim>',
          '\n╰──────────────────────────────╯',
          '```',
        ].join('\n'));
      }
      const provider = normalizeProvider(raw);
      config[guildId].provider = provider;
      saveAIConfig(config);
      return message.channel.send([
        '```',
        '╭─[ PROVIDER SET ]─╮\n',
        `  Provider: ${PROVIDER_LABELS[provider] || provider}`,
        '\n╰──────────────────────────────╯',
        '```',
      ].join('\n'));
    }

    // ── status ──
    if (sub === 'status') {
      const c = config[guildId];
      return message.channel.send([
        '```',
        '╭─[ AI STATUS ]─╮\n',
        `  Status:         ${c.enabled ? 'Enabled ✅' : 'Disabled ❌'}`,
        `  Provider:       ${PROVIDER_LABELS[c.provider] || c.provider || 'groq'}`,
        `  Active channels: ${c.channels.length}`,
        `  Respond To All: ${c.respondToAll ? 'Yes ✅' : 'No ❌'}`,
        '\n╰──────────────────────────────╯',
        '```',
      ].join('\n'));
    }

    return message.channel.send('```\n❌ Unknown subcommand. Use: ai on/off/respondtoall/provider/status\n```');
  },
};
