import { WebhookClient } from 'discord.js-selfbot-v13';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_PATH = path.join(__dirname, '..', '..', 'database');
const CLONERS_FILE = path.join(STORAGE_PATH, 'active_cloners.json');

if (!fs.existsSync(STORAGE_PATH)) fs.mkdirSync(STORAGE_PATH, { recursive: true });

const activeClones = new Map();

function loadSavedCloners() {
  try {
    if (fs.existsSync(CLONERS_FILE)) {
      return JSON.parse(fs.readFileSync(CLONERS_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveCloners() {
  try {
    const data = {};
    for (const [sourceId, cfg] of activeClones.entries()) {
      data[sourceId] = {
        sourceChannelId: sourceId,
        destChannelId: cfg.destChannel.id,
        webhookId: cfg.webhook.id,
        webhookToken: cfg.webhook.token,
        startTime: cfg.startTime.toISOString()
      };
    }
    fs.writeFileSync(CLONERS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[Clone] Save error:', err);
  }
}

async function createWebhook(destChannel, client, sourceId) {
  try {
    const avatarURL = client.user.displayAvatarURL();
    const avatarData = await fetch(avatarURL).then(res => res.buffer());

    const webhook = await destChannel.createWebhook(
      'Message Cloner',
      avatarData,
      `Cloning messages from ${sourceId}`
    );
    return webhook;
  } catch (err) {
    console.error('[Clone] Webhook creation failed:', err);
    return null;
  }
}

export default {
  name: 'msgclone',
  aliases: ['clonechat', 'channelclone'],
  category: 'tools',
  description: 'Clone messages from a channel using a webhook that mimics authors.',
  usage: 'msgclone <start/stop/list> [source_id] [destination_id]',

  async execute(message, args, client) {
    if (!args.length) {
      return message.channel.send(
        '```js\nUsage:\n  msgclone start <source_id> <dest_id>\n  msgclone stop <source_id>\n  msgclone list\n```'
      );
    }

    const cmd = args[0].toLowerCase();
    if (cmd === 'start') {
      if (!args[1] || !args[2]) return message.channel.send('```Provide source and destination IDs```');
      await startClone(message, args[1], args[2], client);
    } else if (cmd === 'stop') {
      if (!args[1]) return message.channel.send('```Provide source channel ID```');
      await stopClone(message, args[1], client);
    } else if (cmd === 'list') {
      await listClones(message);
    } else {
      return message.channel.send('```Invalid subcommand```');
    }
  }
};

async function startClone(message, sourceId, destId, client) {
  try {
    if (activeClones.has(sourceId)) {
      return message.channel.send('```A clone for this source already exists```');
    }

    const processing = await message.channel.send('```Setting up clone...```');

    const source = await client.channels.fetch(sourceId).catch(() => null);
    const dest = await client.channels.fetch(destId).catch(() => null);

    if (!source) return processing.edit('```Invalid source channel```');
    if (!dest) return processing.edit('```Invalid destination channel```');

    if (!['GUILD_TEXT', 0, 1].includes(dest.type)) {
      return processing.edit('```Destination must be a text channel```');
    }

    const perms = dest.permissionsFor(client.user);
    if (!perms?.has('ManageWebhooks')) {
      return processing.edit('```Missing Manage Webhooks permission in destination```');
    }

    let webhooks = await dest.fetchWebhooks().catch(() => null);
    let webhook = webhooks?.find(w => w.name === 'Message Cloner' && w.owner?.id === client.user.id);

    if (!webhook) {
      webhook = await createWebhook(dest, client, sourceId);
      if (!webhook) return processing.edit('```Failed to create webhook```');
    }

    const listener = async (msg) => {
      if (msg.channel.id !== sourceId) return;
      if (msg.author.bot || msg.system) return;
      if (!msg.content && msg.attachments.size === 0 && msg.embeds.length === 0) return;

      try {
        await webhook.edit({
          name: msg.author.username,
          avatar: msg.author.displayAvatarURL(),
          reason: `Mimicking ${msg.author.username}`
        }).catch(() => null);

        const payload = {
          content: msg.content || undefined,
          embeds: msg.embeds?.length ? msg.embeds : undefined,
          files: msg.attachments.size ? msg.attachments.map(a => a.url) : undefined
        };

        await webhook.send(payload).catch(() => {});
      } catch (err) {
        console.error('[Clone] Message send error:', err);
      }
    };

    client.on('messageCreate', listener);

    activeClones.set(sourceId, {
      sourceChannel: source,
      destChannel: dest,
      webhook,
      listener,
      startTime: new Date()
    });

    saveCloners();

    processing.edit(
      '```js\n╭─[ CLONE STARTED ]─╮\n' +
      `Source: #${source.name} (${source.id})\n` +
      `Destination: #${dest.name} (${dest.id})\n` +
      '╰───────────────────╯\n```'
    );

    console.log(`[Clone] Started ${source.id} -> ${dest.id}`);
  } catch (err) {
    console.error('[Clone] Start error:', err);
    message.channel.send('```Clone start failed```');
  }
}

async function stopClone(message, sourceId, client) {
  try {
    const cfg = activeClones.get(sourceId);
    if (!cfg) return message.channel.send('```No active clone for this source```');

    client.removeListener('messageCreate', cfg.listener);
    await cfg.webhook.delete('Clone stopped').catch(() => null);
    activeClones.delete(sourceId);
    saveCloners();

    message.channel.send('```Clone stopped successfully```');
  } catch (err) {
    console.error('[Clone] Stop error:', err);
    message.channel.send('```Failed to stop clone```');
  }
}

async function listClones(message) {
  if (activeClones.size === 0) return message.channel.send('```No active clones```');

  let msg = '```js\n╭─[ ACTIVE CLONES ]─╮\n\n';
  let i = 1;
  for (const [sourceId, cfg] of activeClones.entries()) {
    msg += `[${i}] ${cfg.sourceChannel.guild.name}\n`;
    msg += `Source: #${cfg.sourceChannel.name} (${sourceId})\n`;
    msg += `Dest: #${cfg.destChannel.name} (${cfg.destChannel.id})\n`;
    msg += `Running for: ${formatDuration(Date.now() - cfg.startTime.getTime())}\n\n`;
    i++;
  }
  msg += '╰───────────────────╯\n```';
  await message.channel.send(msg);
}

function formatDuration(ms) {
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / (1000 * 60)) % 60);
  const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export async function initializeCloners(client) {
  console.log('[Clone] Restoring saved clones...');
  const saved = loadSavedCloners();

  for (const [src, data] of Object.entries(saved)) {
    try {
      const source = await client.channels.fetch(data.sourceChannelId).catch(() => null);
      const dest = await client.channels.fetch(data.destChannelId).catch(() => null);
      if (!source || !dest) continue;

      const webhook = new WebhookClient({ id: data.webhookId, token: data.webhookToken });

      const listener = async (msg) => {
        if (msg.channel.id !== src) return;
        if (msg.author.bot || msg.system) return;
        if (!msg.content && msg.attachments.size === 0 && msg.embeds.length === 0) return;

        const payload = {
          content: msg.content || undefined,
          embeds: msg.embeds?.length ? msg.embeds : undefined,
          files: msg.attachments.size ? msg.attachments.map(a => a.url) : undefined
        };
        await webhook.send(payload).catch(() => {});
      };

      client.on('messageCreate', listener);

      activeClones.set(src, {
        sourceChannel: source,
        destChannel: dest,
        webhook,
        listener,
        startTime: new Date(data.startTime)
      });

      console.log(`[Clone] Restored ${src} -> ${data.destChannelId}`);
    } catch (err) {
      console.error(`[Clone] Failed to restore ${src}:`, err.message);
    }
  }

  console.log(`[Clone] Restored ${activeClones.size} active clones`);
}
