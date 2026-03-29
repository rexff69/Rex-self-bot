import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Storage path setup
const STORAGE_PATH = path.join(__dirname, '..', '..', 'database')
const ALLOWED_USERS_FILE = path.join(STORAGE_PATH, 'allowedUsers.json')

// Ensure the database directory exists
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true })
}

// Load allowed users
function loadAllowedUsers() {
  try {
    if (fs.existsSync(ALLOWED_USERS_FILE)) {
      return JSON.parse(fs.readFileSync(ALLOWED_USERS_FILE, 'utf8'))
    }
  } catch (error) {
    console.error('[User Management] Error loading allowed users:', error)
  }
  return { allowedUsers: [] }
}

// Save allowed users
function saveAllowedUsers(data) {
  try {
    fs.writeFileSync(ALLOWED_USERS_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('[User Management] Error saving allowed users:', error)
  }
}

export default {
  name: 'user',
  aliases: ['allowuser', 'manageuser'],
  category: 'moderation',
  description: 'Manage allowed users for the bot',
  usage: 'user <add/remove/list> [@user|userID]',

  async execute(message, args, client) {
    // Only owner can use this command
    if (message.author.id !== process.env.OWNER_ID) {
      await message.channel.send('```❌ Only the bot owner can use this command.```')
      return
    }

    const subCommand = args[0]?.toLowerCase()
    const allowedUsersData = loadAllowedUsers()

    // No subcommand → show help
    if (!subCommand) {
      let response = '```\n'
      response += '╭─[ USER MANAGEMENT ]─╮\n\n'
      response += '  Commands:\n'
      response += '    user add <@user|userID>\n'
      response += '    user remove <@user|userID>\n'
      response += '    user list\n\n'
      response += '  Allowed users can use all bot commands.\n'
      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)
      return
    }

    // ─── ADD USER ─────────────────────────────────────────────
    if (subCommand === 'add') {
      if (!args[1] && message.mentions.users.size === 0) {
        await message.channel.send('```⚠️ Please mention a user or provide a user ID.```')
        return
      }

      let targetUser
      let targetId

      if (message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first()
        targetId = targetUser.id
      } else {
        targetId = args[1]
        try {
          targetUser = await client.users.fetch(targetId)
        } catch {
          await message.channel.send('```⚠️ Invalid user ID.```')
          return
        }
      }

      if (targetId === process.env.OWNER_ID) {
        await message.channel.send('```⚠️ The owner is already allowed by default.```')
        return
      }

      if (allowedUsersData.allowedUsers.includes(targetId)) {
        await message.channel.send('```⚠️ This user is already allowed.```')
        return
      }

      allowedUsersData.allowedUsers.push(targetId)
      saveAllowedUsers(allowedUsersData)

      let response = '```\n'
      response += '╭─[ USER ADDED ]─╮\n\n'
      response += `  User: ${targetUser.username}\n`
      response += `  ID: ${targetId}\n`
      response += `  Total Allowed: ${allowedUsersData.allowedUsers.length}\n`
      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)

      console.log(`[User Management] Added user: ${targetId}`)
      return
    }

    // ─── REMOVE USER ──────────────────────────────────────────
    if (subCommand === 'remove' || subCommand === 'delete') {
      if (!args[1] && message.mentions.users.size === 0) {
        await message.channel.send('```⚠️ Please mention a user or provide a user ID.```')
        return
      }

      let targetUser
      let targetId

      if (message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first()
        targetId = targetUser.id
      } else {
        targetId = args[1]
        try {
          targetUser = await client.users.fetch(targetId)
        } catch {
          targetUser = null
        }
      }

      if (!allowedUsersData.allowedUsers.includes(targetId)) {
        await message.channel.send('```⚠️ This user is not in the allowed list.```')
        return
      }

      allowedUsersData.allowedUsers = allowedUsersData.allowedUsers.filter(id => id !== targetId)
      saveAllowedUsers(allowedUsersData)

      let response = '```\n'
      response += '╭─[ USER REMOVED ]─╮\n\n'
      response += `  User: ${targetUser ? targetUser.username : 'Unknown'}\n`
      response += `  ID: ${targetId}\n`
      response += `  Total Allowed: ${allowedUsersData.allowedUsers.length}\n`
      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)

      console.log(`[User Management] Removed user: ${targetId}`)
      return
    }

    // ─── LIST USERS ───────────────────────────────────────────
    if (subCommand === 'list') {
      if (allowedUsersData.allowedUsers.length === 0) {
        await message.channel.send('```ℹ️ No allowed users found.```')
        return
      }

      let response = '```\n'
      response += '╭─[ ALLOWED USERS ]─╮\n\n'
      response += `  Total: ${allowedUsersData.allowedUsers.length}\n\n`

      for (let i = 0; i < Math.min(allowedUsersData.allowedUsers.length, 10); i++) {
        const userId = allowedUsersData.allowedUsers[i]
        try {
          const user = await client.users.fetch(userId)
          response += `  [${i + 1}] ${user.username}\n`
          response += `      ID: ${userId}\n`
        } catch {
          response += `  [${i + 1}] Unknown User\n`
          response += `      ID: ${userId}\n`
        }
      }

      if (allowedUsersData.allowedUsers.length > 10) {
        response += `\n  ... and ${allowedUsersData.allowedUsers.length - 10} more\n`
      }

      response += '\n╰──────────────────────────────────╯\n```'
      await message.channel.send(response)
      return
    }

    // ─── INVALID SUBCOMMAND ───────────────────────────────────
    await message.channel.send('```⚠️ Invalid subcommand. Use "user" to see available options.```')
  }
}
