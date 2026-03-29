export default {
  name: 'resume',
  aliases: ['r', 're'],
  category: 'music',
  description: 'Resume the paused track',
  usage: 'resume',
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

    if (!queue.paused) {
      await message.channel.send('```\n⚠️  Not paused.\n```');
      return;
    }

    try {
      await client.lavalink.updatePlayerProperties(message.guild.id, { paused: false });
      queue.paused = false;

      await message.channel.send([
        '```',
        '╭─[ RESUMED ]─╮\n',
        `  ▶️  ${queue.nowPlaying.info.title}`,
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));

      if (message.deletable) await message.delete().catch(() => {});
    } catch (err) {
      console.error('[Resume Error]:', err);
      await message.channel.send(`\`\`\`\n❌ Error: ${err.message}\n\`\`\``);
    }
  },
};
