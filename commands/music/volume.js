export default {
  name: 'volume',
  aliases: ['vol', 'v'],
  category: 'music',
  description: 'Set or show volume (0-200)',
  usage: 'volume [0-200]',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('```\n❌ This command can only be used in a server.\n```');
      return;
    }

    const queue = client.queueManager.get(message.guild.id);
    if (!queue) {
      await message.channel.send('```\n❌ Nothing is currently playing.\n```');
      return;
    }

    // No arg = show current volume
    if (!args[0]) {
      const bar = buildBar(queue.volume);
      return message.channel.send([
        '```',
        `  🔊 Current Volume: ${queue.volume}%`,
        `  [${bar}]`,
        '```',
      ].join('\n'));
    }

    const vol = parseInt(args[0]);
    if (isNaN(vol) || vol < 0 || vol > 200) {
      await message.channel.send('```\n❌ Volume must be between 0 and 200.\n```');
      return;
    }

    try {
      queue.volume = vol;
      await client.lavalink.updatePlayerProperties(message.guild.id, { volume: vol });

      const bar = buildBar(vol);
      await message.channel.send([
        '```',
        '╭─[ VOLUME ]─╮\n',
        `  🔊 Volume set to ${vol}%`,
        `  [${bar}]`,
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));
    } catch (err) {
      console.error('[Volume Error]:', err);
      await message.channel.send(`\`\`\`\n❌ Error: ${err.message}\n\`\`\``);
    }
  },
};

function buildBar(vol) {
  const filled = Math.round(vol / 10);
  return '█'.repeat(Math.min(filled, 20)) + '░'.repeat(Math.max(0, 20 - filled));
}
