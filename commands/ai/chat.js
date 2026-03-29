import Groq from 'groq-sdk';
import { HfInference } from '@huggingface/inference';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_PATH = path.join(__dirname, '..', '..', 'database');
const AI_CONFIG_FILE = path.join(STORAGE_PATH, 'ai_config.json');
const PERSONALITY_FILE = path.join(STORAGE_PATH, 'personality.txt');
const ALLOWED_USERS_FILE = path.join(STORAGE_PATH, 'allowedUsers.json');
const AI_BLOCKED_FILE = path.join(STORAGE_PATH, 'ai_blocked.json');

if (!fs.existsSync(STORAGE_PATH)) fs.mkdirSync(STORAGE_PATH, { recursive: true });
if (!fs.existsSync(PERSONALITY_FILE)) {
  fs.writeFileSync(PERSONALITY_FILE, 'You are a helpful, friendly, and knowledgeable AI assistant.');
}

// Lazy-init SDK clients so missing keys don't crash on startup
let _groq = null;
let _hf = null;

function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

function getHf() {
  if (!_hf) _hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
  return _hf;
}

function loadAIConfig() {
  try {
    if (fs.existsSync(AI_CONFIG_FILE)) return JSON.parse(fs.readFileSync(AI_CONFIG_FILE, 'utf8'));
  } catch (e) { console.error('[AI] Error loading config:', e); }
  return {};
}

function loadPersonality() {
  try {
    if (fs.existsSync(PERSONALITY_FILE)) return fs.readFileSync(PERSONALITY_FILE, 'utf8');
  } catch (e) {}
  return 'You are a helpful AI assistant.';
}

function loadBlockedUsers() {
  try {
    if (fs.existsSync(AI_BLOCKED_FILE)) return JSON.parse(fs.readFileSync(AI_BLOCKED_FILE, 'utf8'));
  } catch (e) {}
  return {};
}

function isUserAllowed(userId) {
  if (userId === process.env.OWNER_ID) return true;
  try {
    if (fs.existsSync(ALLOWED_USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ALLOWED_USERS_FILE, 'utf8'));
      return data.allowedUsers?.includes(userId) ?? false;
    }
  } catch (e) {}
  return false;
}

const conversationHistory = new Map();

// ── Provider: Groq (via SDK) ────────────────────────────────────────────────
async function callGroq(messages) {
  const res = await getGroq().chat.completions.create({
    messages,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 1024,
    stream: false,
  });
  return res.choices[0]?.message?.content ?? 'No response generated.';
}

// ── Provider: HuggingFace (via SDK, with fetch fallback) ────────────────────
async function callHuggingFace(messages) {
  try {
    const res = await getHf().chatCompletion({
      model: 'google/gemma-2-2b-it',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });
    return res.choices[0]?.message?.content ?? 'No response generated.';
  } catch (sdkErr) {
    console.warn('[AI] HF SDK failed, falling back to fetch:', sdkErr.message);
    // Fallback: raw fetch against HF inference API
    const response = await fetch(
      'https://api-inference.huggingface.co/models/google/gemma-2-2b-it/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'google/gemma-2-2b-it', messages, max_tokens: 1024, temperature: 0.7 }),
      }
    );
    if (!response.ok) throw new Error(`HuggingFace API error ${response.status}`);
    const data = await response.json();
    return data.choices[0]?.message?.content ?? 'No response generated.';
  }
}

// ── Provider: NVIDIA NIM (raw fetch) ────────────────────────────────────────
async function callNvidianim(messages) {
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta/llama-3.3-70b-instruct',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NVIDIA NIM API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0]?.message?.content ?? 'No response generated.';
}

// ── Core response generator ─────────────────────────────────────────────────
async function generateAIResponse(userMessage, channelId, provider = 'groq') {
  const personality = loadPersonality();

  if (!conversationHistory.has(channelId)) {
    conversationHistory.set(channelId, [{ role: 'system', content: personality }]);
  }

  const history = conversationHistory.get(channelId);
  history.push({ role: 'user', content: userMessage });

  // Keep last 20 messages + system prompt
  if (history.length > 21) history.splice(1, history.length - 21);

  let aiResponse;

  switch (provider) {
    case 'huggingface':
    case 'hf':
      aiResponse = await callHuggingFace(history);
      break;
    case 'nim':
    case 'nvidia':
      aiResponse = await callNvidianim(history);
      break;
    default:
      aiResponse = await callGroq(history);
  }

  history.push({ role: 'assistant', content: aiResponse });
  conversationHistory.set(channelId, history);
  return aiResponse;
}

function splitMessage(text, maxLength = 2000) {
  if (text.length <= maxLength) return [text];
  const parts = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + line + '\n').length > maxLength) {
      if (current) parts.push(current.trim());
      if (line.length > maxLength) {
        parts.push(...line.match(/.{1,2000}/g));
        current = '';
      } else {
        current = line + '\n';
      }
    } else {
      current += line + '\n';
    }
  }
  if (current) parts.push(current.trim());
  return parts;
}

// ── chat command ─────────────────────────────────────────────────────────────
export default {
  name: 'chat',
  aliases: ['ask'],
  category: 'ai',
  description: 'Chat with AI assistant',
  usage: 'chat <message>',

  async execute(message, args, client) {
    if (!args.length) {
      return message.channel.send([
        '```',
        '╭─[ AI CHAT ]─╮\n',
        '  Usage: chat <message>',
        '  Example: chat Hello, how are you?',
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));
    }

    const guildId = message.guild?.id;
    const channelId = message.channel.id;

    try {
      const aiConfig = loadAIConfig();
      const config = aiConfig[guildId] || { provider: 'groq' };
      const provider = config.provider || 'groq';

      console.log(`[AI] chat — provider: ${provider}, user: ${message.author.tag}`);

      const aiResponse = await generateAIResponse(args.join(' '), channelId, provider);
      for (const part of splitMessage(aiResponse)) await message.reply(part);
    } catch (error) {
      console.error('[AI] chat error:', error);
      await message.channel.send(`\`\`\`\n❌ AI Error: ${error.message}\n\`\`\``);
    }
  },
};

// ── Mention listener ─────────────────────────────────────────────────────────
export function registerAIListener(client) {
  console.log('[AI] Mention listener registered');

  client.on('messageCreate', async (message) => {
    if (!message.guild) return;
    if (!message.mentions.has(client.user.id)) return;

    const guildId = message.guild.id;
    const channelId = message.channel.id;

    const aiConfig = loadAIConfig();
    const config = aiConfig[guildId];
    if (!config?.enabled) return;
    if (!config.channels.includes(channelId)) return;

    const blockedUsers = loadBlockedUsers();
    if (blockedUsers[guildId]?.includes(message.author.id)) {
      await message.reply('```\n❌ You are blocked from using AI chat.\n```');
      return;
    }

    if (!(config.respondToAll ?? false) && !isUserAllowed(message.author.id)) return;

    const userMessage = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!userMessage) {
      await message.reply('```\n❌ Please include a message after the mention.\n```');
      return;
    }

    try {
      const provider = config.provider || 'groq';
      console.log(`[AI] Mention — provider: ${provider}, user: ${message.author.tag}`);
      const aiResponse = await generateAIResponse(userMessage, channelId, provider);
      for (const part of splitMessage(aiResponse)) await message.reply(part);
    } catch (error) {
      console.error('[AI] Mention error:', error);
      await message.channel.send(`\`\`\`\n❌ AI Error: ${error.message}\n\`\`\``);
    }
  });
}

// ── Initialize ───────────────────────────────────────────────────────────────
export async function initializeAI(client) {
  console.log('[AI] Initializing AI chat system...');
  const aiConfig = loadAIConfig();
  const enabledGuilds = Object.values(aiConfig).filter(c => c.enabled).length;
  // Always register — checks per-guild config at runtime
  registerAIListener(client);
  console.log(`[AI] Ready — ${enabledGuilds} guild(s) currently enabled`);
}

export { conversationHistory };
