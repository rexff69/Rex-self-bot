export default {
  name: 'pause',
  aliases: ['pa'],
  category: 'music',
  description: 'Pause the current track',
  usage: 'pause',
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

    if (queue.paused) {
      await message.channel.send('```\n⚠️  Already paused. Use resume to continue.\n```');
      return;
    }

    try {
      await client.lavalink.updatePlayerProperties(message.guild.id, { paused: true });
      queue.paused = true;

      await message.channel.send([
        '```',
        '╭─[ PAUSED ]─╮\n',
        `  ⏸️  ${queue.nowPlaying.info.title}`,
        '  Use resume to continue.',
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));

      if (message.deletable) await message.delete().catch(() => {});
    } catch (err) {
      console.error('[Pause Error]:', err);
      await message.channel.send(`\`\`\`\n❌ Error: ${err.message}\n\`\`\``);
    }
  },
};
