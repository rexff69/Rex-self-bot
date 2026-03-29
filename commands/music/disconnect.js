export default {
  name: 'disconnect',
  aliases: ['dc', 'leave'],
  category: 'music',
  description: 'Disconnect from voice channel',
  usage: 'disconnect',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('```\n❌ This command can only be used in a server.\n```');
      return;
    }

    const guildId = message.guild.id;

    try {
      await client.lavalink.destroyPlayer(guildId).catch(() => {});
      client.queueManager.delete(guildId);

      // Disconnect via raw gateway OP4
      client.ws.broadcast({
        op: 4,
        d: { guild_id: guildId, channel_id: null, self_mute: false, self_deaf: false },
      });

      if (client.voiceStates[guildId]) delete client.voiceStates[guildId];

      await message.channel.send('```\n👋 Disconnected from voice channel.\n```');

      if (message.deletable) await message.delete().catch(() => {});
    } catch (err) {
      console.error('[DC Error]:', err);
      await message.channel.send(`\`\`\`\n❌ Error: ${err.message}\n\`\`\``);
    }
  },
};
