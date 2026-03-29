import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const STORAGE_PATH = path.join(__dirname, '..', '..', 'database')
const AUTOREACT_FILE = path.join(STORAGE_PATH, 'autoreact.json')

if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true })
}

function loadAutoReacts() {
  try {
    if (fs.existsSync(AUTOREACT_FILE)) {
      const data = fs.readFileSync(AUTOREACT_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.error('[AutoReact] Failed to load configs:', err.message)
  }
  return {}
}

function saveAutoReacts(data) {
  try {
    fs.writeFileSync(AUTOREACT_FILE, JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('[AutoReact] Failed to save configs:', err.message)
  }
}

let autoReactConfigs = loadAutoReacts()
let messageListenerRegistered = false

export default {
  name: 'autoreact',
  aliases: ['ar', 'react'],
  category: 'tools',
  description: 'Auto-react to messages with keywords in current server',
  usage: 'autoreact <add/remove/list> [keyword] [emoji]',

  async execute(message, args, client) {
    try {
      if (!message.guild) {
        await message.channel.send('```\nThis command can only be used in servers.\n```')
        return
      }

      const subCommand = args[0]?.toLowerCase()
      const guildId = message.guild.id

      if (!subCommand) {
        const response = [
          '```js',
          '╭─[ AUTO REACT HELP ]─╮',
          '',
          'Commands:',
          '  autoreact add <keyword> <emoji>',
          '  autoreact remove <keyword>',
          '  autoreact list',
          '',
          'Examples:',
          '  autoreact add hello 👋',
          '  autoreact remove hello',
          '  autoreact list',
          '',
          '╰─────────────────────╯',
          '```'
        ].join('\n')
        await message.channel.send(response)
        return
      }

      if (subCommand === 'list') {
        const configs = autoReactConfigs[guildId]
        if (!configs || Object.keys(configs).length === 0) {
          await message.channel.send('```\nNo auto-reacts configured in this server.\n```')
          return
        }

        let index = 1
        let response = '```js\n╭─[ AUTO REACTS ]─╮\n\n'
        response += `Server: ${message.guild.name}\n\n`
        for (const [keyword, emoji] of Object.entries(configs)) {
          response += `  [${index}] ${keyword} → ${emoji}\n`
          index++
        }
        response += '\n╰──────────────────╯\n```'
        await message.channel.send(response)
        return
      }

      if (subCommand === 'add') {
        if (!args[1] || !args[2]) {
          await message.channel.send('```\nUsage: autoreact add <keyword> <emoji>\n```')
          return
        }

        const keyword = args[1].toLowerCase()
        const emoji = args[2]

        if (!autoReactConfigs[guildId]) {
          autoReactConfigs[guildId] = {}
        }

        autoReactConfigs[guildId][keyword] = emoji
        saveAutoReacts(autoReactConfigs)

        const response = [
          '```js',
          '╭─[ AUTO REACT ADDED ]─╮',
          '',
          `Keyword: ${keyword}`,
          `Emoji: ${emoji}`,
          `Server: ${message.guild.name}`,
          '',
          '╰──────────────────────╯',
          '```'
        ].join('\n')
        await message.channel.send(response)

        if (!messageListenerRegistered) {
          registerAutoReactListener(client)
          messageListenerRegistered = true
          console.log('[AutoReact] Listener registered')
        }

        return
      }

      if (['remove', 'delete', 'del'].includes(subCommand)) {
        if (!args[1]) {
          await message.channel.send('```\nUsage: autoreact remove <keyword>\n```')
          return
        }

        const keyword = args[1].toLowerCase()
        const guildConfig = autoReactConfigs[guildId]

        if (!guildConfig || !guildConfig[keyword]) {
          await message.channel.send('```\nNo such keyword found in this server.\n```')
          return
        }

        const emoji = guildConfig[keyword]
        delete guildConfig[keyword]

        if (Object.keys(guildConfig).length === 0) {
          delete autoReactConfigs[guildId]
        }

        saveAutoReacts(autoReactConfigs)

        const response = [
          '```js',
          '╭─[ AUTO REACT REMOVED ]─╮',
          '',
          `Keyword: ${keyword}`,
          `Emoji: ${emoji}`,
          '',
          '╰────────────────────────╯',
          '```'
        ].join('\n')
        await message.channel.send(response)
        return
      }

      await message.channel.send('```\nInvalid subcommand. Use autoreact for help.\n```')
    } catch (err) {
      console.error('[AutoReact] Execution error:', err.message)
      await message.channel.send('```\nAn unexpected error occurred.\n```')
    }
  }
}

function registerAutoReactListener(client) {
  console.log('[AutoReact] Message listener active')
  client.on('messageCreate', async (message) => {
    try {
      if (!message.guild || message.author.bot || message.author.id === client.user.id) return
      const guildId = message.guild.id
      const configs = autoReactConfigs[guildId]
      if (!configs) return
      const content = message.content.toLowerCase()
      for (const [keyword, emoji] of Object.entries(configs)) {
        if (content.includes(keyword)) {
          await message.react(emoji).catch(err => {
            console.error(`[AutoReact] Failed to react with ${emoji}: ${err.message}`)
          })
        }
      }
    } catch (err) {
      console.error('[AutoReact] Listener error:', err.message)
    }
  })
}

export async function initializeAutoReact(client) {
  try {
    console.log('[AutoReact] Initializing system...')
    autoReactConfigs = loadAutoReacts()
    if (Object.keys(autoReactConfigs).length > 0) {
      registerAutoReactListener(client)
      messageListenerRegistered = true
      console.log(`[AutoReact] Loaded ${Object.keys(autoReactConfigs).length} server configs`)
    } else {
      console.log('[AutoReact] No configs found')
    }
  } catch (err) {
    console.error('[AutoReact] Initialization error:', err.message)
  }
}
