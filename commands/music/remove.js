export default {
  name: 'remove',
  aliases: ['rm'],
  category: 'music',
  description: 'Remove a song from the queue by position',
  usage: 'remove <position>',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('```\n❌ This command can only be used in a server.\n```');
      return;
    }

    const queue = client.queueManager.get(message.guild.id);
    if (!queue || queue.songs.length === 0) {
      await message.channel.send('```\n❌ The queue is empty.\n```');
      return;
    }

    const pos = parseInt(args[0]);
    if (isNaN(pos) || pos < 1 || pos > queue.songs.length) {
      await message.channel.send(`\`\`\`\n❌ Please provide a valid position between 1 and ${queue.songs.length}.\n\`\`\``);
      return;
    }

    const removed = queue.songs.splice(pos - 1, 1)[0];

    await message.channel.send([
      '```',
      '╭─[ REMOVED ]─╮\n',
      `  🗑️  ${removed.info.title}`,
      `  by ${removed.info.author}`,
      `  📝  ${queue.songs.length} song${queue.songs.length !== 1 ? 's' : ''} remaining`,
      '\n╰──────────────────────────────────╯',
      '```',
    ].join('\n'));

    if (message.deletable) await message.delete().catch(() => {});
  },
};
