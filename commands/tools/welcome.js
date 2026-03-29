import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const STORAGE_PATH = path.join(__dirname, '..', '..', 'database')
const WELCOME_FILE = path.join(STORAGE_PATH, 'welcome.json')

if (!fs.existsSync(STORAGE_PATH)) fs.mkdirSync(STORAGE_PATH, { recursive: true })

function loadWelcomeConfigs() {
  try {
    if (fs.existsSync(WELCOME_FILE)) {
      return JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf8'))
    }
  } catch (err) {
    console.error('[Welcome] Failed to load configs:', err.message)
  }
  return {}
}

function saveWelcomeConfigs(data) {
  try {
    fs.writeFileSync(WELCOME_FILE, JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('[Welcome] Failed to save configs:', err.message)
  }
}

let welcomeConfigs = loadWelcomeConfigs()
let welcomeListenerRegistered = false

const templates = ['1', '2', '3', '4', '5', '6', '7']
const backgrounds = [
  'blobday', 'blobnight', 'gaming1', 'gaming2', 'gaming3', 'gaming4',
  'night', 'rainbow', 'rainbowgradient', 'space', 'stars', 'stars2', 'sunset'
]
const textColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink', 'black', 'white']

export default {
  name: 'welcome',
  aliases: ['welcomesetup', 'setwelcome'],
  category: 'tools',
  description: 'Setup welcome messages for new members',
  usage: 'welcome <setup/disable/test/config>',

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
          '╭─[ WELCOME SYSTEM ]─╮',
          '',
          'Commands:',
          '  welcome setup [channel] [template] [background] [textColor] [message]',
          '  welcome disable',
          '  welcome test',
          '  welcome config',
          '',
          'Templates: 1-7',
          `Backgrounds: ${backgrounds.length} options`,
          `Text Colors: ${textColors.length} options`,
          '',
          '╰────────────────────╯',
          '```'
        ].join('\n')
        await message.channel.send(response)
        return
      }

      if (subCommand === 'setup') {
        const channelId = args[1] || message.channel.id
        const template = args[2] || '3'
        const background = args[3] || 'stars'
        const textColor = args[4] || 'white'
        const customMessage = args.slice(5).join(' ') || 'Welcome to {server}!'

        if (!templates.includes(template)) {
          await message.channel.send('```\n❌ Invalid template! Choose between 1-7.\n```')
          return
        }
        if (!backgrounds.includes(background)) {
          await message.channel.send(`\`\`\n❌ Invalid background!\nAvailable: ${backgrounds.join(', ')}\n\`\`\``)
          return
        }
        if (!textColors.includes(textColor)) {
          await message.channel.send(`\`\`\n❌ Invalid text color!\nAvailable: ${textColors.join(', ')}\n\`\`\``)
          return
        }

        const channel = await client.channels.fetch(channelId).catch(() => null)
        if (!channel) {
          await message.channel.send('```\n❌ Channel not found.\n```')
          return
        }

        welcomeConfigs[guildId] = {
          enabled: true,
          channelId,
          template,
          background,
          textColor,
          customMessage
        }

        saveWelcomeConfigs(welcomeConfigs)

        const response = [
          '```js',
          '╭─[ WELCOME SETUP COMPLETE ]─╮',
          '',
          `Channel: #${channel.name}`,
          `Template: ${template}`,
          `Background: ${background}`,
          `Text Color: ${textColor}`,
          `Message: ${customMessage}`,
          '',
          '✅ Welcome system enabled!',
          '',
          '╰────────────────────────╯',
          '```'
        ].join('\n')
        await message.channel.send(response)

        if (!welcomeListenerRegistered) {
          registerWelcomeListener(client)
          welcomeListenerRegistered = true
        }
        return
      }

      if (['disable', 'off'].includes(subCommand)) {
        if (!welcomeConfigs[guildId]) {
          await message.channel.send('```\nWelcome system is not configured.\n```')
          return
        }
        delete welcomeConfigs[guildId]
        saveWelcomeConfigs(welcomeConfigs)
        await message.channel.send('```\n✅ Welcome system disabled.\n```')
        return
      }

      if (subCommand === 'test') {
        const config = welcomeConfigs[guildId]
        if (!config) {
          await message.channel.send('```\nNo welcome configuration found.\n```')
          return
        }

        try {
          const image = await generateWelcomeImage(
            message.author,
            message.guild,
            config.template,
            config.background,
            config.textColor
          )
          const msg = config.customMessage
            .replace(/{user}/g, message.author.username)
            .replace(/{mention}/g, `<@${message.author.id}>`)
            .replace(/{server}/g, message.guild.name)
            .replace(/{count}/g, message.guild.memberCount.toString())

          await message.channel.send({ content: msg, files: [{ attachment: image, name: 'welcome.png' }] })
        } catch (err) {
          console.error('[Welcome] Test error:', err.message)
          await message.channel.send('```\nFailed to generate test image.\n```')
        }
        return
      }

      if (['config', 'settings'].includes(subCommand)) {
        const config = welcomeConfigs[guildId]
        if (!config) {
          await message.channel.send('```\nNo welcome configuration found.\n```')
          return
        }

        const channel = await client.channels.fetch(config.channelId).catch(() => null)
        const response = [
          '```js',
          '╭─[ WELCOME CONFIGURATION ]─╮',
          '',
          `Status: ${config.enabled ? 'Enabled ✅' : 'Disabled ❌'}`,
          `Channel: ${channel ? '#' + channel.name : 'Not Found'}`,
          `Template: ${config.template}`,
          `Background: ${config.background}`,
          `Text Color: ${config.textColor}`,
          `Message: ${config.customMessage}`,
          '',
          '╰──────────────────────────╯',
          '```'
        ].join('\n')
        await message.channel.send(response)
        return
      }

      await message.channel.send('```\nInvalid subcommand. Use "welcome" for help.\n```')
    } catch (err) {
      console.error('[Welcome] Execution error:', err.message)
      await message.channel.send('```\nAn unexpected error occurred.\n```')
    }
  }
}

async function generateWelcomeImage(user, guild, template, background, textColor) {
  const avatar = user.displayAvatarURL({ format: 'png', size: 512 })
  const url = `https://api.some-random-api.com/welcome/img/${template}/${background}?type=join&textcolor=${textColor}&username=${encodeURIComponent(user.username)}&guildName=${encodeURIComponent(guild.name)}&memberCount=${guild.memberCount}&avatar=${encodeURIComponent(avatar)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return await res.buffer()
}

function registerWelcomeListener(client) {
  console.log('[Welcome] Listener registered')
  client.on('guildMemberAdd', async (member) => {
    try {
      const config = welcomeConfigs[member.guild.id]
      if (!config || !config.enabled) return
      const channel = await client.channels.fetch(config.channelId).catch(() => null)
      if (!channel) return
      const image = await generateWelcomeImage(member.user, member.guild, config.template, config.background, config.textColor)
      const msg = config.customMessage
        .replace(/{user}/g, member.user.username)
        .replace(/{mention}/g, `<@${member.user.id}>`)
        .replace(/{server}/g, member.guild.name)
        .replace(/{count}/g, member.guild.memberCount.toString())
      await channel.send({ content: msg, files: [{ attachment: image, name: 'welcome.png' }] })
      console.log(`[Welcome] Welcomed ${member.user.tag} in ${member.guild.name}`)
    } catch (err) {
      console.error('[Welcome] Listener error:', err.message)
    }
  })
}

export async function initializeWelcome(client) {
  try {
    console.log('[Welcome] Initializing system...')
    welcomeConfigs = loadWelcomeConfigs()
    if (Object.keys(welcomeConfigs).length > 0) {
      registerWelcomeListener(client)
      welcomeListenerRegistered = true
      console.log(`[Welcome] Loaded ${Object.keys(welcomeConfigs).length} server configs`)
    } else {
      console.log('[Welcome] No configs found')
    }
  } catch (err) {
    console.error('[Welcome] Initialization error:', err.message)
  }
}
