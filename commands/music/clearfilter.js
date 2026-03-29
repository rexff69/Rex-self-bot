export default {
  name: 'clearfilter',
  aliases: ['cf', 'clearfilters'],
  category: 'music',
  description: 'Clear all audio filters',
  usage: 'clearfilter',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('```\n❌ This command can only be used in a server.\n```');
      return;
    }

    const queue = client.queueManager.get(message.guild.id);
    if (!queue || !queue.nowPlaying) {
      await message.channel.send('```\n❌ Nothing is currently playing.\n```');
      return;
    }

    try {
      queue.filters = {};
      await client.lavalink.updatePlayerProperties(message.guild.id, { filters: {} });

      await message.channel.send([
        '```',
        '╭─[ FILTERS CLEARED ]─╮\n',
        '  🎛️  All filters removed',
        '  ✅  Audio reset to normal',
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));
    } catch (err) {
      console.error('[ClearFilter Error]:', err);
      await message.channel.send(`\`\`\`\n❌ Error: ${err.message}\n\`\`\``);
    }
  },
};
