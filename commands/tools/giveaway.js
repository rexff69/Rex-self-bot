import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_PATH = path.join(__dirname, '..', '..', 'database');
const GIVEAWAY_FILE = path.join(STORAGE_PATH, 'giveaways.json');

if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

function loadGiveaways() {
  try {
    if (fs.existsSync(GIVEAWAY_FILE)) {
      return JSON.parse(fs.readFileSync(GIVEAWAY_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('[Giveaway] Error loading:', error);
  }
  return {};
}

function saveGiveaways(data) {
  try {
    fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[Giveaway] Error saving:', error);
  }
}

let activeGiveaways = loadGiveaways();
let giveawayListenerRegistered = false;

export default {
  name: 'giveaway',
  aliases: ['gstart', 'gw'],
  category: 'tools',
  description: 'Create and manage giveaways',
  usage: 'giveaway <start/end/reroll/list>',

  async execute(message, args, client) {
    try {
      if (!message.guild) {
        await message.channel.send('```\nThis command can only be used in a server.\n```');
        return;
      }

      const subCommand = args[0]?.toLowerCase();

      if (!subCommand) {
        let response = '```\n';
        response += '╭─[ GIVEAWAY ]─╮\n\n';
        response += '  Commands:\n';
        response += '    giveaway start <time> <winners> <prize>\n';
        response += '    giveaway end <messageID>\n';
        response += '    giveaway reroll <messageID>\n';
        response += '    giveaway list\n\n';
        response += '  Time Format:\n';
        response += '    10s, 5m, 1h, 2d\n\n';
        response += '  Example:\n';
        response += '    giveaway start 1h 2 Nitro\n';
        response += '\n╰──────────────────────────────────╯\n```';
        await message.channel.send(response);
        return;
      }

      if (subCommand === 'start' || subCommand === 'create') {
        if (args.length < 4) {
          await message.channel.send('```\nUsage: giveaway start <time> <winners> <prize>\n```');
          return;
        }

        const timeStr = args[1];
        const winners = parseInt(args[2]);
        const prize = args.slice(3).join(' ');

        if (isNaN(winners) || winners < 1) {
          await message.channel.send('```\nNumber of winners must be at least 1.\n```');
          return;
        }

        const duration = parseTime(timeStr);
        if (!duration) {
          await message.channel.send('```\nInvalid time format. Use s/m/h/d.\n```');
          return;
        }

        const endTime = Date.now() + duration;

        let giveawayMsg = '```\n';
        giveawayMsg += '╭─[ 🎉 GIVEAWAY 🎉 ]─╮\n\n';
        giveawayMsg += `  Prize: ${prize}\n\n`;
        giveawayMsg += `  Winners: ${winners}\n`;
        giveawayMsg += `  Ends: ${formatTime(duration)}\n`;
        giveawayMsg += `  Host: ${message.author.username}\n\n`;
        giveawayMsg += '  React with 🎉 to enter!\n';
        giveawayMsg += '\n╰──────────────────────────────────╯\n```';

        try {
          const giveawayMessage = await message.channel.send(giveawayMsg);
          await giveawayMessage.react('🎉');

          activeGiveaways[giveawayMessage.id] = {
            messageId: giveawayMessage.id,
            channelId: message.channel.id,
            guildId: message.guild.id,
            prize: prize,
            winners: winners,
            hostId: message.author.id,
            endTime: endTime,
            ended: false
          };

          saveGiveaways(activeGiveaways);
          setTimeout(() => endGiveaway(client, giveawayMessage.id), duration);

          let response = '```\n';
          response += '╭─[ GIVEAWAY STARTED ]─╮\n\n';
          response += `  Prize: ${prize}\n`;
          response += `  Duration: ${formatTime(duration)}\n`;
          response += `  Winners: ${winners}\n`;
          response += '\n╰──────────────────────────────────╯\n```';

          await message.channel.send(response);
          console.log(`[Giveaway] Started in ${message.guild.name}: ${prize}`);

          if (!giveawayListenerRegistered) {
            registerGiveawayListener(client);
            giveawayListenerRegistered = true;
          }
        } catch (error) {
          console.error('[Giveaway] Error starting:', error);
          await message.channel.send('```\nFailed to start giveaway.\n```');
        }
        return;
      }

      if (subCommand === 'end' || subCommand === 'stop') {
        if (!args[1]) {
          await message.channel.send('```\nUsage: giveaway end <messageID>\n```');
          return;
        }

        const messageId = args[1];
        if (!activeGiveaways[messageId]) {
          await message.channel.send('```\nNo giveaway found with that message ID.\n```');
          return;
        }

        try {
          await endGiveaway(client, messageId);
          await message.channel.send('```\nGiveaway ended successfully.\n```');
        } catch (error) {
          console.error('[Giveaway] Error ending:', error);
          await message.channel.send('```\nFailed to end giveaway.\n```');
        }
        return;
      }

      if (subCommand === 'reroll') {
        if (!args[1]) {
          await message.channel.send('```\nUsage: giveaway reroll <messageID>\n```');
          return;
        }

        const messageId = args[1];
        if (!activeGiveaways[messageId]) {
          await message.channel.send('```\nNo giveaway found with that message ID.\n```');
          return;
        }

        const giveaway = activeGiveaways[messageId];
        if (!giveaway.ended) {
          await message.channel.send('```\nThis giveaway hasn’t ended yet.\n```');
          return;
        }

        try {
          const channel = await client.channels.fetch(giveaway.channelId);
          const giveawayMessage = await channel.messages.fetch(messageId);
          const reaction = giveawayMessage.reactions.cache.get('🎉');

          if (!reaction) {
            await message.channel.send('```\nNo 🎉 reactions found.\n```');
            return;
          }

          const users = await reaction.users.fetch();
          const participants = users.filter(user => !user.bot);
          if (participants.size === 0) {
            await message.channel.send('```\nNo valid participants to reroll.\n```');
            return;
          }

          const winners = participants.random(Math.min(giveaway.winners, participants.size));
          const winnerArray = Array.isArray(winners) ? winners : [winners];

          let rerollMsg = '```\n';
          rerollMsg += '╭─[ 🎉 REROLL 🎉 ]─╮\n\n';
          rerollMsg += `  Prize: ${giveaway.prize}\n\n`;
          rerollMsg += '  New Winners:\n';
          winnerArray.forEach((winner, index) => {
            rerollMsg += `    ${index + 1}. ${winner.username}\n`;
          });
          rerollMsg += '\n╰──────────────────────────────────╯\n```';

          await channel.send(rerollMsg);
          console.log(`[Giveaway] Rerolled: ${giveaway.prize}`);
        } catch (error) {
          console.error('[Giveaway] Error rerolling:', error);
          await message.channel.send('```\nFailed to reroll giveaway.\n```');
        }
        return;
      }

      if (subCommand === 'list') {
        const guildGiveaways = Object.values(activeGiveaways).filter(
          g => g.guildId === message.guild.id && !g.ended
        );

        if (guildGiveaways.length === 0) {
          await message.channel.send('```\nNo active giveaways found.\n```');
          return;
        }

        let response = '```\n';
        response += '╭─[ ACTIVE GIVEAWAYS ]─╮\n\n';
        guildGiveaways.forEach((giveaway, index) => {
          const timeLeft = giveaway.endTime - Date.now();
          response += `  [${index + 1}] ${giveaway.prize}\n`;
          response += `      ID: ${giveaway.messageId}\n`;
          response += `      Ends in: ${formatTime(timeLeft)}\n`;
          response += `      Winners: ${giveaway.winners}\n\n`;
        });
        response += '╰──────────────────────────────────╯\n```';
        await message.channel.send(response);
        return;
      }

      await message.channel.send('```\nInvalid subcommand.\n```');
    } catch (error) {
      console.error('[Giveaway] Unexpected error:', error);
      await message.channel.send('```\nAn unexpected error occurred while running this command.\n```');
    }
  }
};

function parseTime(timeStr) {
  const regex = /^(\d+)(s|m|h|d)$/;
  const match = timeStr.match(regex);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

async function endGiveaway(client, messageId) {
  const giveaway = activeGiveaways[messageId];
  if (!giveaway || giveaway.ended) return;
  try {
    const channel = await client.channels.fetch(giveaway.channelId);
    const giveawayMessage = await channel.messages.fetch(messageId);
    const reaction = giveawayMessage.reactions.cache.get('🎉');
    if (!reaction) {
      await channel.send('```\nNo 🎉 reactions found.\n```');
      giveaway.ended = true;
      saveGiveaways(activeGiveaways);
      return;
    }
    const users = await reaction.users.fetch();
    const participants = users.filter(user => !user.bot);
    let endMsg = '```\n';
    endMsg += '╭─[ 🎉 GIVEAWAY ENDED 🎉 ]─╮\n\n';
    endMsg += `  Prize: ${giveaway.prize}\n\n`;
    if (participants.size === 0) {
      endMsg += '  No valid participants!\n  No winners selected.\n';
    } else {
      const winners = participants.random(Math.min(giveaway.winners, participants.size));
      const winnerArray = Array.isArray(winners) ? winners : [winners];
      endMsg += '  Winners:\n';
      winnerArray.forEach((winner, index) => {
        endMsg += `    ${index + 1}. ${winner.username}\n`;
      });
      endMsg += '\n  Congratulations! 🎊\n';
    }
    endMsg += '\n╰──────────────────────────────────╯\n```';
    let updatedMsg = '```\n';
    updatedMsg += '╭─[ 🎉 GIVEAWAY ENDED 🎉 ]─╮\n\n';
    updatedMsg += `  Prize: ${giveaway.prize}\n\n`;
    updatedMsg += `  Winners: ${giveaway.winners}\n`;
    updatedMsg += '  Status: Ended ✅\n';
    updatedMsg += '\n╰──────────────────────────────────╯\n```';
    await giveawayMessage.edit(updatedMsg);
    await channel.send(endMsg);
    giveaway.ended = true;
    saveGiveaways(activeGiveaways);
    console.log(`[Giveaway] Ended: ${giveaway.prize}`);
  } catch (error) {
    console.error('[Giveaway] Error ending:', error);
  }
}

function registerGiveawayListener(client) {
  console.log('[Giveaway] Listener registered');
}

export async function initializeGiveaways(client) {
  console.log('[Giveaway] Initializing giveaway system...');
  activeGiveaways = loadGiveaways();
  const now = Date.now();
  let restarted = 0;
  for (const [messageId, giveaway] of Object.entries(activeGiveaways)) {
    if (!giveaway.ended && giveaway.endTime > now) {
      const timeLeft = giveaway.endTime - now;
      setTimeout(() => endGiveaway(client, messageId), timeLeft);
      restarted++;
    }
  }
  if (restarted > 0) {
    registerGiveawayListener(client);
    giveawayListenerRegistered = true;
    console.log(`[Giveaway] Restarted ${restarted} active giveaways`);
  } else {
    console.log('[Giveaway] No active giveaways found');
  }
}
