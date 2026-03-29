import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_PATH = path.join(__dirname, '..', '..', 'database');
const AUTOMOD_FILE = path.join(STORAGE_PATH, 'automod.json');

if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

function loadAutoModConfigs() {
  try {
    if (fs.existsSync(AUTOMOD_FILE)) {
      return JSON.parse(fs.readFileSync(AUTOMOD_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('[AutoMod] Error loading configs:', error);
  }
  return {};
}

function saveAutoModConfigs(data) {
  try {
    fs.writeFileSync(AUTOMOD_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[AutoMod] Error saving configs:', error);
  }
}

let autoModConfigs = loadAutoModConfigs();
let autoModListenerRegistered = false;

export default {
  name: 'automod',
  aliases: ['am', 'wordfilter'],
  category: 'tools',
  description: 'Auto-moderation word filter system',
  usage: 'automod <add/remove/list/ignore/config>',

  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('AutoMod can only be used in servers.');
      return;
    }

    const subCommand = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    if (!subCommand) {
      let response = '```js\n**AutoMod Commands**\n\n';
      response += 'automod add <word>\n';
      response += 'automod remove <word>\n';
      response += 'automod list\n';
      response += 'automod ignore <role>\n';
      response += 'automod config\n';
      response += 'automod enable/disable\n\n';
      response += '**Ignore Options:**\n';
      response += 'owner | admin | mods | all\n```';
      await message.channel.send(response);
      return;
    }

    if (!autoModConfigs[guildId]) {
      autoModConfigs[guildId] = {
        enabled: false,
        bannedWords: [],
        ignoreRoles: [],
        ignoredPerms: {
          owner: false,
          admin: false,
          mods: false
        }
      };
    }

    const config = autoModConfigs[guildId];

    if (subCommand === 'add') {
      if (!args[1]) {
        await message.channel.send('Please specify a word to ban.');
        return;
      }
      const word = args[1].toLowerCase();
      if (config.bannedWords.includes(word)) {
        await message.channel.send('That word is already banned.');
        return;
      }
      config.bannedWords.push(word);
      config.enabled = true;
      saveAutoModConfigs(autoModConfigs);
      let response = `\`\`\`js\n✅ Banned word added: **${word}**\nTotal banned words: ${config.bannedWords.length}\nAutoMod is now enabled.\n\`\`\``;
      await message.channel.send(response);
      if (!autoModListenerRegistered) {
        registerAutoModListener(client);
        autoModListenerRegistered = true;
      }
      return;
    }

    if (subCommand === 'remove' || subCommand === 'delete') {
      if (!args[1]) {
        await message.channel.send('Please specify a word to remove.');
        return;
      }
      const word = args[1].toLowerCase();
      if (!config.bannedWords.includes(word)) {
        await message.channel.send('That word is not banned.');
        return;
      }
      config.bannedWords = config.bannedWords.filter(w => w !== word);
      saveAutoModConfigs(autoModConfigs);
      let response = `\`\`\`js\n✅ Removed banned word: **${word}**\nTotal banned words: ${config.bannedWords.length}\n\`\`\``;
      await message.channel.send(response);
      return;
    }

    if (subCommand === 'list') {
      if (config.bannedWords.length === 0) {
        await message.channel.send('No banned words set.');
        return;
      }
      let response = `\`\`\`js\n**Banned Words (${config.bannedWords.length})**\n\n${config.bannedWords.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\`\`\``;
      await message.channel.send(response);
      return;
    }

    if (subCommand === 'ignore') {
      if (!args[1]) {
        await message.channel.send('Please specify who to ignore: owner | admin | mods | all');
        return;
      }
      const ignoreType = args[1].toLowerCase();
      if (ignoreType === 'owner') {
        config.ignoredPerms.owner = !config.ignoredPerms.owner;
        saveAutoModConfigs(autoModConfigs);
        await message.channel.send(`\`\`\`js\nOwner ignore is now **${config.ignoredPerms.owner ? 'enabled' : 'disabled'}**.\n\`\`\``);
      } else if (ignoreType === 'admin') {
        config.ignoredPerms.admin = !config.ignoredPerms.admin;
        saveAutoModConfigs(autoModConfigs);
        await message.channel.send(`\`\`\`js\nAdmin ignore is now **${config.ignoredPerms.admin ? 'enabled' : 'disabled'}**.\n\`\`\``);
      } else if (ignoreType === 'mods') {
        config.ignoredPerms.mods = !config.ignoredPerms.mods;
        saveAutoModConfigs(autoModConfigs);
        await message.channel.send(`\`\`\`js\nMods ignore is now **${config.ignoredPerms.mods ? 'enabled' : 'disabled'}**.\n\`\`\``);
      } else if (ignoreType === 'all') {
        const newState = !config.ignoredPerms.owner;
        config.ignoredPerms.owner = newState;
        config.ignoredPerms.admin = newState;
        config.ignoredPerms.mods = newState;
        saveAutoModConfigs(autoModConfigs);
        await message.channel.send(`\`\`\`js\nIgnore all is now **${newState ? 'enabled' : 'disabled'}**.\n\`\`\``);
      } else {
        await message.channel.send('Invalid ignore option. Use owner | admin | mods | all');
      }
      return;
    }

    if (subCommand === 'enable' || subCommand === 'on') {
      config.enabled = true;
      saveAutoModConfigs(autoModConfigs);
      await message.channel.send('```js\n✅ AutoMod has been enabled.\n```');
      if (!autoModListenerRegistered) {
        registerAutoModListener(client);
        autoModListenerRegistered = true;
      }
      return;
    }

    if (subCommand === 'disable' || subCommand === 'off') {
      config.enabled = false;
      saveAutoModConfigs(autoModConfigs);
      await message.channel.send('```js\n❌ AutoMod has been disabled.\n```');
      return;
    }

    if (subCommand === 'config' || subCommand === 'settings') {
      let response = `\`\`\`js\n**AutoMod Configuration**\n\nStatus: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\nBanned Words: ${config.bannedWords.length}\n\nIgnored:\nOwner: ${config.ignoredPerms.owner ? '✅' : '❌'}\nAdmin: ${config.ignoredPerms.admin ? '✅' : '❌'}\nMods: ${config.ignoredPerms.mods ? '✅' : '❌'}\n\`\`\``;
      await message.channel.send(response);
      return;
    }

    await message.channel.send('Invalid subcommand. Use `automod` to see available options.');
  }
};

function shouldIgnoreUser(member, config) {
  if (config.ignoredPerms.owner && member.guild.ownerId === member.id) return true;
  if (config.ignoredPerms.admin && member.permissions.has('Administrator')) return true;
  if (config.ignoredPerms.mods) {
    if (member.permissions.has('KickMembers') ||
        member.permissions.has('BanMembers') ||
        member.permissions.has('ManageMessages') ||
        member.permissions.has('ModerateMembers')) {
      return true;
    }
  }
  return false;
}

function registerAutoModListener(client) {
  console.log('[AutoMod] Listener registered');
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const guildId = message.guild.id;
    if (!autoModConfigs[guildId] || !autoModConfigs[guildId].enabled) return;
    const config = autoModConfigs[guildId];
    if (shouldIgnoreUser(message.member, config)) return;
    const content = message.content.toLowerCase();
    for (const bannedWord of config.bannedWords) {
      if (content.includes(bannedWord)) {
        try {
          await message.delete();
          const warningMsg = await message.channel.send(`\`\`\`js\n⚠️ ${message.author}, your message contained a banned word and was deleted.\n\`\`\``);
          setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
          console.log(`[AutoMod] Deleted message from ${message.author.tag} in ${message.guild.name} for word: ${bannedWord}`);
          break;
        } catch (error) {
          console.error('[AutoMod] Error deleting message:', error.message);
        }
        return;
      }
    }
  });
}

export async function initializeAutoMod(client) {
  console.log('[AutoMod] Initializing automod system...');
  autoModConfigs = loadAutoModConfigs();
  const enabledGuilds = Object.values(autoModConfigs).filter(c => c.enabled).length;
  if (enabledGuilds > 0) {
    registerAutoModListener(client);
    autoModListenerRegistered = true;
    console.log(`[AutoMod] Loaded ${enabledGuilds} enabled guild configs`);
  } else {
    console.log('[AutoMod] No enabled configs found');
  }
}