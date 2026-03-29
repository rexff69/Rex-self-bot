export default {
  name: 'sendall',
  aliases: ['massend', 'channelspam', 'sendallchannels'],
  category: 'moderation',
  description: 'Send a message to all channels in the server',
  usage: 'sendall <message>',
  async execute(message, args, client) {
    try {
      if (!message.guild) {
        await message.channel.send('```\nThis command can only be used in servers.\n```')
        return
      }

      if (message.author.id !== process.env.OWNER_ID) {
        await message.channel.send('```\nYou are not authorized to use this command.\n```')
        return
      }

      if (args.length === 0) {
        const response = [
          '```js',
          '╭─[ SEND ALL HELP ]─╮',
          '',
          'Usage:',
          '  sendall <message>',
          '',
          'Example:',
          '  sendall Important announcement!',
          '',
          '⚠️ Warning:',
          '  This will send to all text channels in this server.',
          '',
          '╰────────────────────╯',
          '```'
        ].join('\n')
        await message.channel.send(response)
        return
      }

      const sendMessage = args.join(' ')
      const channels = message.guild.channels.cache.filter(c => c.isTextBased() && c.viewable)

      if (channels.size === 0) {
        await message.channel.send('```\nNo accessible text channels found.\n```')
        return
      }

      let response = [
        '```js',
        '╭─[ SEND ALL STARTED ]─╮',
        '',
        `Target: ${channels.size} channels`,
        `Message: ${sendMessage.substring(0, 40)}${sendMessage.length > 40 ? '...' : ''}`,
        'Status: Sending...',
        '',
        '╰──────────────────────╯',
        '```'
      ].join('\n')

      const statusMsg = await message.channel.send(response)
      let sent = 0
      let failed = 0

      for (const channel of channels.values()) {
        try {
          await channel.send(sendMessage)
          sent++
          console.log(`[SendAll] ✓ Sent to #${channel.name}`)
        } catch (err) {
          failed++
          console.log(`[SendAll] ✗ Failed in #${channel.name}: ${err.message}`)
        }
      }

      const finalResponse = [
        '```js',
        '╭─[ SEND ALL COMPLETE ]─╮',
        '',
        `Total Channels: ${channels.size}`,
        `✅ Sent: ${sent}`,
        `❌ Failed: ${failed}`,
        `Success Rate: ${Math.round((sent / channels.size) * 100)}%`,
        '',
        '╰────────────────────────╯',
        '```'
      ].join('\n')

      await statusMsg.edit(finalResponse)
      console.log(`[SendAll] Finished — ${sent} sent, ${failed} failed`)
    } catch (err) {
      console.error('[SendAll] Error:', err.message)
      await message.channel.send('```\nAn unexpected error occurred.\n```')
    }
  }
}
