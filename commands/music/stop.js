export default {
  name: 'stop',
  aliases: ['st'],
  category: 'music',
  description: 'Stop music, clear the queue, and disconnect',
  usage: 'stop',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('```\n❌ This command can only be used in a server.\n```');
      return;
    }

    const guildId = message.guild.id;
    const queue = client.queueManager.get(guildId);

    if (!queue) {
      await message.channel.send('```\n❌ Nothing is playing.\n```');
      return;
    }

    try {
      await client.lavalink.destroyPlayer(guildId);
      client.queueManager.delete(guildId);

      // Disconnect via raw gateway OP4
      client.ws.broadcast({
        op: 4,
        d: { guild_id: guildId, channel_id: null, self_mute: false, self_deaf: false },
      });

      // Clear stored voice state
      if (client.voiceStates[guildId]) delete client.voiceStates[guildId];

      await message.channel.send([
        '```',
        '╭─[ STOPPED ]─╮\n',
        '  ⏹️  Player stopped',
        '  🗑️  Queue cleared',
        '  👋  Disconnected from voice',
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));

      if (message.deletable) await message.delete().catch(() => {});
    } catch (err) {
      console.error('[Stop Error]:', err);
      await message.channel.send(`\`\`\`\n❌ Error: ${err.message}\n\`\`\``);
    }
  },
};
