import os from 'os'
import { version } from 'discord.js-selfbot-v13'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
  name: 'stats',
  aliases: ['botstats', 'info', 'botinfo'],
  category: 'info',
  description: 'Show bot statistics',
  usage: 'stats',

  async execute(message, args, client) {
    try {
      // ─── Uptime ─────────────────────────────────────────────
      const uptime = process.uptime()
      const days = Math.floor(uptime / 86400)
      const hours = Math.floor((uptime % 86400) / 3600)
      const minutes = Math.floor((uptime % 3600) / 60)
      const seconds = Math.floor(uptime % 60)
      const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`

      // ─── Memory Usage ───────────────────────────────────────
      const memUsage = process.memoryUsage()
      const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2)
      const memTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2)

      // ─── System Info ────────────────────────────────────────
      const platform = os.platform()
      const arch = os.arch()
      const cpus = os.cpus().length
      const nodeVersion = process.version

      // ─── Discord Stats ──────────────────────────────────────
      const guilds = client.guilds.cache.size
      const channels = client.channels.cache.size
      const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)

      // ─── Count Commands, Aliases & Subcommands ──────────────
      let totalCommands = 0
      let totalAliases = 0
      let totalSubCommands = 0
      const commandsPath = path.join(__dirname, '..')

      async function countCommands(dir) {
        const files = fs.readdirSync(dir)
        for (const file of files) {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          if (stat.isDirectory()) {
            await countCommands(filePath)
            continue
          }
          if (!file.endsWith('.js')) continue

          try {
            const fileURL = pathToFileURL(filePath).href
            const commandModule = await import(fileURL)
            const command = commandModule.default

            if (command?.name) {
              totalCommands++
              if (Array.isArray(command.aliases)) {
                totalAliases += command.aliases.length
              }

              // Read file text once
              const fileContent = fs.readFileSync(filePath, 'utf8')
              const subCmdMatches =
                fileContent.match(/case ['"`](\w+)['"`]:/g) ||
                fileContent.match(/args\[0\]\.toLowerCase\(\)\s*===\s*['"`](\w+)['"`]/g) ||
                []
              const uniqueSubs = new Set(
                subCmdMatches.map(m => (m.match(/['"`](\w+)['"`]/) || [])[1])
              )
              totalSubCommands += uniqueSubs.size
            }
          } catch (err) {
            console.error(`[Stats] Failed to load ${file}:`, err.message)
          }
        }
      }

      await countCommands(commandsPath)
      const grandTotal = totalCommands + totalSubCommands

      // ─── Lavalink Stats ─────────────────────────────────────
      let lavalinkStats = null
      if (client.lavalink?.sessionId) {
        try {
          const res = await fetch(`${process.env.LAVALINK_REST}/info`, {
            headers: { Authorization: process.env.LAVALINK_PASSWORD }
          })
          if (res.ok) lavalinkStats = await res.json()
        } catch (err) {
          console.error('[Stats] Lavalink fetch error:', err)
        }
      }

      // ─── Allowed Users ──────────────────────────────────────
      let allowedUsersCount = 0
      try {
        const allowedPath = path.join(__dirname, '..', '..', 'database', 'allowedUsers.json')
        if (fs.existsSync(allowedPath)) {
          const data = JSON.parse(fs.readFileSync(allowedPath, 'utf8'))
          allowedUsersCount = data.allowedUsers?.length || 0
        }
      } catch (err) {
        console.error('[Stats] Allowed user file error:', err)
      }

      // ─── Build Response ─────────────────────────────────────
      let response = '```\n'
      response += '╭─[ BOT STATISTICS ]─╮\n\n'

      // Bot Info
      response += '  Bot Info:\n'
      response += `    User: ${client.user.username}#${client.user.discriminator}\n`
      response += `    ID: ${client.user.id}\n`
      response += `    Prefix: ${process.env.PREFIX}\n`
      response += `    Uptime: ${uptimeStr}\n\n`

      // Discord Stats
      response += '  Discord Stats:\n'
      response += `    Guilds: ${guilds}\n`
      response += `    Channels: ${channels}\n`
      response += `    Users: ${users.toLocaleString()}\n`
      response += `    Allowed Users: ${allowedUsersCount}\n\n`

      // Commands
      response += '  Commands:\n'
      response += `    Base Commands: ${totalCommands}\n`
      response += `    Sub-Commands: ${totalSubCommands}\n`
      response += `    Aliases: ${totalAliases}\n`
      response += `    Total: ${grandTotal}\n\n`

      // Lavalink
      if (lavalinkStats) {
        response += '  Lavalink:\n'
        response += `    Status: Connected ✅\n`
        response += `    Version: ${lavalinkStats.version?.semver || 'Unknown'}\n`
        response += `    Session: ${client.lavalink.sessionId.slice(0, 8)}...\n`
        if (lavalinkStats.git) {
          response += `    Branch: ${lavalinkStats.git.branch}\n`
          response += `    Commit: ${lavalinkStats.git.commit.slice(0, 7)}\n`
        }
        response += '\n'
      } else {
        response += '  Lavalink:\n'
        response += '    Status: Disconnected ❌\n\n'
      }

      // System Info
      response += '  System:\n'
      response += `    Platform: ${platform} (${arch})\n`
      response += `    CPU Cores: ${cpus}\n`
      response += `    Memory: ${memUsedMB}MB / ${memTotalMB}MB\n`
      response += `    Node.js: ${nodeVersion}\n`
      response += `    Discord.js: v${version}\n`
      response += '\n╰──────────────────────────────────╯\n```'

      await message.channel.send(response)
    } catch (err) {
      console.error('[Stats] Fatal error:', err)
      await message.channel.send('```❌ An error occurred while fetching stats.```')
    }
  }
}
