import Groq from 'groq-sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

const STORAGE_PATH = path.join(__dirname, '..', '..', 'database')
const AI_CONFIG_FILE = path.join(STORAGE_PATH, 'ai_config.json')
const AI_BLOCKED_FILE = path.join(STORAGE_PATH, 'ai_blocked.json')
const PERSONALITY_FILE = path.join(STORAGE_PATH, 'personality.txt')
const DATABASE_FILE = path.join(STORAGE_PATH, 'database.json')

if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true })
}

if (!fs.existsSync(PERSONALITY_FILE)) {
  const defaultPersonality = `You are a helpful, friendly, and knowledgeable AI assistant. You provide clear, concise, and accurate responses. You are respectful and professional in all interactions.`
  fs.writeFileSync(PERSONALITY_FILE, defaultPersonality)
}

function loadAIConfig() {
  try {
    if (fs.existsSync(AI_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(AI_CONFIG_FILE, 'utf8'))
    }
  } catch (error) {
    console.error('[AI] Error loading config:', error)
  }
  return {}
}

function saveAIConfig(data) {
  try {
    fs.writeFileSync(AI_CONFIG_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('[AI] Error saving config:', error)
  }
}

function loadBlockedUsers() {
  try {
    if (fs.existsSync(AI_BLOCKED_FILE)) {
      return JSON.parse(fs.readFileSync(AI_BLOCKED_FILE, 'utf8'))
    }
  } catch (error) {
    console.error('[AI] Error loading blocked users:', error)
  }
  return {}
}

function saveBlockedUsers(data) {
  try {
    fs.writeFileSync(AI_BLOCKED_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('[AI] Error saving blocked users:', error)
  }
}

function loadPersonality() {
  try {
    if (fs.existsSync(PERSONALITY_FILE)) {
      return fs.readFileSync(PERSONALITY_FILE, 'utf8')
    }
  } catch (error) {
    console.error('[AI] Error loading personality:', error)
  }
  return 'You are a helpful AI assistant.'
}

function loadDatabase() {
  try {
    if (fs.existsSync(DATABASE_FILE)) {
      return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'))
    }
  } catch (error) {
    console.error('[AI] Error loading database:', error)
  }
  return { config: { allowedUsers: [] } }
}

let aiConfig = loadAIConfig()
let blockedUsers = loadBlockedUsers()
let aiListenerRegistered = false
const conversationHistory = new Map()

export default {
  name: 'ai',
  aliases: ['aichat', 'chatai'],
  category: 'ai',
  description: 'AI chat management system',
  usage: 'ai <on/off/owner/block/unblock/status/clear>',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('```Error: This command can only be used in a server.```')
      return
    }

    const subCommand = args[0]?.toLowerCase()
    const guildId = message.guild.id
    const channelId = message.channel.id

    if (!subCommand) {
      let response = '```\n'
      response += '╭─[ AI CHAT ]─╮\n\n'
      response += '  Commands:\n'
      response += '    ai on - Enable in this channel\n'
      response += '    ai off - Disable in this channel\n'
      response += '    ai owner <on/off> - Owner only mode\n'
      response += '    ai block <@user> - Block user\n'
      response += '    ai unblock <@user> - Unblock user\n'
      response += '    ai status - Show config\n'
      response += '    ai clear - Clear chat history\n\n'
      response += '  Usage:\n'
      response += '    Just mention the bot to chat!\n'
      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)
      return
    }

    if (!aiConfig[guildId]) {
      aiConfig[guildId] = {
        enabled: false,
        channels: [],
        ownerOnly: false
      }
    }

    if (subCommand === 'on' || subCommand === 'enable') {
      if (!aiConfig[guildId].channels.includes(channelId)) {
        aiConfig[guildId].channels.push(channelId)
      }
      aiConfig[guildId].enabled = true
      saveAIConfig(aiConfig)

      let response = '```\n'
      response += '╭─[ AI ENABLED ]─╮\n\n'
      response += `  Channel: #${message.channel.name}\n`
      response += '  Status: Active ✅\n'
      response += `  Owner Only: ${aiConfig[guildId].ownerOnly ? 'Yes' : 'No'}\n\n`
      response += '  Mention me to start chatting!\n'
      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)

      if (!aiListenerRegistered) {
        registerAIListener(client)
        aiListenerRegistered = true
      }
      return
    }

    if (subCommand === 'off' || subCommand === 'disable') {
      aiConfig[guildId].channels = aiConfig[guildId].channels.filter(id => id !== channelId)
      if (aiConfig[guildId].channels.length === 0) aiConfig[guildId].enabled = false
      saveAIConfig(aiConfig)
      let response = '```\n'
      response += '╭─[ AI DISABLED ]─╮\n\n'
      response += `  Channel: #${message.channel.name}\n`
      response += '  Status: Inactive ❌\n'
      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)
      return
    }

    if (subCommand === 'owner') {
      if (message.author.id !== process.env.OWNER_ID) {
        await message.channel.send('```Error: You do not have permission to use this command.```')
        return
      }
      const mode = args[1]?.toLowerCase()
      if (!mode || (mode !== 'on' && mode !== 'off')) {
        await message.channel.send('```Error: Usage - ai owner <on/off>```')
        return
      }
      aiConfig[guildId].ownerOnly = mode === 'on'
      saveAIConfig(aiConfig)
      let response = '```\n'
      response += '╭─[ OWNER MODE ]─╮\n\n'
      response += `  Status: ${aiConfig[guildId].ownerOnly ? 'Enabled ✅' : 'Disabled ❌'}\n`
      response += '\n  Only owner and allowed users can use AI chat when enabled.\n'
      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)
      return
    }

    if (subCommand === 'block') {
      if (!args[1] && message.mentions.users.size === 0) {
        await message.channel.send('```Error: Please mention a user or provide a user ID.```')
        return
      }
      let targetUser
      if (message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first()
      } else {
        try {
          targetUser = await client.users.fetch(args[1])
        } catch {
          await message.channel.send('```Error: Invalid user.```')
          return
        }
      }
      if (!blockedUsers[guildId]) blockedUsers[guildId] = []
      if (blockedUsers[guildId].includes(targetUser.id)) {
        await message.channel.send('```Error: User is already blocked.```')
        return
      }
      blockedUsers[guildId].push(targetUser.id)
      saveBlockedUsers(blockedUsers)
      let response = '```\n'
      response += '╭─[ USER BLOCKED ]─╮\n\n'
      response += `  User: ${targetUser.username}\n`
      response += `  ID: ${targetUser.id}\n`
      response += '\n  They can no longer use AI chat.\n'
      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)
      return
    }

    if (subCommand === 'unblock') {
      if (!args[1] && message.mentions.users.size === 0) {
        await message.channel.send('```Error: Please mention a user or provide a user ID.```')
        return
      }
      let targetUser
      if (message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first()
      } else {
        try {
          targetUser = await client.users.fetch(args[1])
        } catch {
          await message.channel.send('```Error: Invalid user.```')
          return
        }
      }
      if (!blockedUsers[guildId] || !blockedUsers[guildId].includes(targetUser.id)) {
        await message.channel.send('```Error: User is not blocked.```')
        return
      }
      blockedUsers[guildId] = blockedUsers[guildId].filter(id => id !== targetUser.id)
      saveBlockedUsers(blockedUsers)
      let response = '```\n'
      response += '╭─[ USER UNBLOCKED ]─╮\n\n'
      response += `  User: ${targetUser.username}\n`
      response += `  ID: ${targetUser.id}\n`
      response += '\n  They can now use AI chat.\n'
      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)
      return
    }

    if (subCommand === 'status' || subCommand === 'config') {
      const config = aiConfig[guildId]
      const blockedCount = blockedUsers[guildId]?.length || 0
      let response = '```\n'
      response += '╭─[ AI CONFIG ]─╮\n\n'
      response += `  Status: ${config.enabled ? 'Enabled ✅' : 'Disabled ❌'}\n`
      response += `  Active Channels: ${config.channels.length}\n`
      response += `  Owner Only: ${config.ownerOnly ? 'Yes ✅' : 'No ❌'}\n`
      response += `  Blocked Users: ${blockedCount}\n\n`
      if (config.channels.length > 0) {
        response += '  Enabled in:\n'
        for (const chId of config.channels.slice(0, 5)) {
          try {
            const ch = await client.channels.fetch(chId)
            response += `    #${ch.name}\n`
          } catch {
            response += `    Unknown Channel\n`
          }
        }
        if (config.channels.length > 5) response += `    ... and ${config.channels.length - 5} more\n`
      }
      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)
      return
    }

    if (subCommand === 'clear' || subCommand === 'reset') {
      conversationHistory.delete(channelId)
      let response = '```\n'
      response += '╭─[ HISTORY CLEARED ]─╮\n\n'
      response += '  Conversation history cleared!\n'
      response += '  Starting fresh conversation.\n'
      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)
      return
    }

    await message.channel.send('```Error: Invalid subcommand. Use "ai" to see available commands.```')
  }
}

// Check if user is allowed to use AI
function isUserAllowed(userId, guildId) {
  // Check if owner
  if (userId === process.env.OWNER_ID) return true;

  // Load allowed users from separate file
  try {
    const allowedUsersPath = path.join(STORAGE_PATH, 'allowedUsers.json');
    if (fs.existsSync(allowedUsersPath)) {
      const data = JSON.parse(fs.readFileSync(allowedUsersPath, 'utf8'));
      if (data.allowedUsers && data.allowedUsers.includes(userId)) {
        return true;
      }
    }
  } catch (error) {
    console.error('[AI] Error checking allowed users:', error);
  }

  // Check owner only mode
  const config = aiConfig[guildId];
  if (config && config.ownerOnly) return false;

  return true;
}

function isUserBlocked(userId, guildId) {
  if (!blockedUsers[guildId]) return false
  return blockedUsers[guildId].includes(userId)
}

async function generateAIResponse(userMessage, channelId) {
  const personality = loadPersonality()
  if (!conversationHistory.has(channelId)) {
    conversationHistory.set(channelId, [{ role: 'system', content: personality }])
  }
  const history = conversationHistory.get(channelId)
  history.push({ role: 'user', content: userMessage })
  if (history.length > 21) history.splice(1, history.length - 21)
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: history,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false
    })
    const aiResponse = chatCompletion.choices[0]?.message?.content || 'Error: No response generated.'
    history.push({ role: 'assistant', content: aiResponse })
    conversationHistory.set(channelId, history)
    return aiResponse
  } catch (error) {
    console.error('[AI] Error generating response:', error)
    return 'Error: Unable to generate AI response. Please try again later.'
  }
}

function splitMessage(text, maxLength = 2000) {
  if (text.length <= maxLength) return [text]
  const messages = []
  let currentMessage = ''
  const lines = text.split('\n')
  for (const line of lines) {
    if ((currentMessage + line + '\n').length > maxLength) {
      if (currentMessage) {
        messages.push(currentMessage.trim())
        currentMessage = ''
      }
      if (line.length > maxLength) {
        for (let i = 0; i < line.length; i += maxLength) messages.push(line.substring(i, i + maxLength))
      } else {
        currentMessage = line + '\n'
      }
    } else {
      currentMessage += line + '\n'
    }
  }
  if (currentMessage) messages.push(currentMessage.trim())
  return messages
}

function registerAIListener(client) {
  console.log('[AI] Listener registered')
  client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return
    const guildId = message.guild.id
    const channelId = message.channel.id
    if (!aiConfig[guildId] || !aiConfig[guildId].enabled) return
    if (!aiConfig[guildId].channels.includes(channelId)) return
    if (!message.mentions.has(client.user.id)) return
    if (!isUserAllowed(message.author.id, guildId)) {
      await message.reply('```Error: You are not allowed to use AI chat.```')
      return
    }
    if (isUserBlocked(message.author.id, guildId)) {
      await message.reply('```Error: You are blocked from using AI chat.```')
      return
    }
    let userMessage = message.content.replace(/<@!?\d+>/g, '').trim()
    if (!userMessage) {
      await message.reply('```Error: Please include a message to send to the AI.```')
      return
    }
    try {
      await message.channel.sendTyping()
      const aiResponse = await generateAIResponse(userMessage, channelId)
      const messageParts = splitMessage(aiResponse)
      for (const part of messageParts) await message.reply(part)
      console.log(`[AI] Responded to ${message.author.tag} in ${message.guild.name}`)
    } catch (error) {
      console.error('[AI] Error in conversation:', error)
      await message.reply('```Error: Something went wrong while generating a response.```')
    }
  })
}

export async function initializeAI(client) {
  console.log('[AI] Initializing AI chat system...')
  aiConfig = loadAIConfig()
  blockedUsers = loadBlockedUsers()
  const enabledGuilds = Object.values(aiConfig).filter(c => c.enabled).length
  if (enabledGuilds > 0) {
    registerAIListener(client)
    aiListenerRegistered = true
    console.log(`[AI] Loaded ${enabledGuilds} enabled guild configs`)
  } else {
    console.log('[AI] No enabled configs found')
  }
}
