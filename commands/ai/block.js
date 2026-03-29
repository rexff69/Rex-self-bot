import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_PATH = path.join(__dirname, '..', '..', 'database');
const AI_BLOCKED_FILE = path.join(STORAGE_PATH, 'ai_blocked.json');

function loadBlockedUsers() {
  try {
    if (fs.existsSync(AI_BLOCKED_FILE)) {
      return JSON.parse(fs.readFileSync(AI_BLOCKED_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('[AI Block] Error loading:', error);
  }
  return {};
}

function saveBlockedUsers(data) {
  try {
    fs.writeFileSync(AI_BLOCKED_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[AI Block] Error saving:', error);
  }
}

export default {
  name: 'aiblock',
  aliases: ['blockuser', 'aiban'],
  category: 'ai',
  description: 'Block users from AI chat',
  usage: 'aiblock <@user | userID>',

  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('```\nThis command can only be used in a server.\n```');
      return;
    }

    if (!args[0] && message.mentions.users.size === 0) {
      await message.channel.send('```\nPlease mention a user or provide their ID.\n```');
      return;
    }

    let targetUser;
    if (message.mentions.users.size > 0) {
      targetUser = message.mentions.users.first();
    } else {
      try {
        targetUser = await client.users.fetch(args[0]);
      } catch {
        await message.channel.send('```\nUser not found.\n```');
        return;
      }
    }

    const guildId = message.guild.id;
    const blockedUsers = loadBlockedUsers();

    if (!blockedUsers[guildId]) {
      blockedUsers[guildId] = [];
    }

    if (blockedUsers[guildId].includes(targetUser.id)) {
      await message.channel.send('```\nThat user is already blocked from AI chat.\n```');
      return;
    }

    blockedUsers[guildId].push(targetUser.id);
    saveBlockedUsers(blockedUsers);

    const response = [
      '```',
      '╭─[ USER BLOCKED ]─╮',
      '',
      `  User: ${targetUser.username}`,
      `  ID: ${targetUser.id}`,
      '',
      '╰──────────────────────────────╯',
      '```'
    ].join('\n');

    await message.channel.send(response);
  }
};
