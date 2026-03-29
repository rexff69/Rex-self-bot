export default {
  name: 'seek',
  aliases: ['sk'],
  category: 'music',
  description: 'Seek to a position in the track (e.g. 1:30 or 90)',
  usage: 'seek <time>',
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

    if (!args[0]) {
      await message.channel.send('```\n❌ Usage: seek <time>  e.g. seek 1:30 or seek 90\n```');
      return;
    }

    const ms = parseTime(args[0]);
    if (ms === null) {
      await message.channel.send('```\n❌ Invalid time format. Use 1:30 or 90 (seconds).\n```');
      return;
    }

    const duration = queue.nowPlaying.info.length;
    if (ms > duration) {
      await message.channel.send(`\`\`\`\n❌ Cannot seek past ${formatDuration(duration)}.\n\`\`\``);
      return;
    }

    try {
      await client.lavalink.updatePlayerProperties(message.guild.id, { position: ms });

      await message.channel.send([
        '```',
        '╭─[ SEEKED ]─╮\n',
        `  ⏩  Seeked to ${formatDuration(ms)}`,
        `  🎵  ${queue.nowPlaying.info.title}`,
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));

      if (message.deletable) await message.delete().catch(() => {});
    } catch (err) {
      console.error('[Seek Error]:', err);
      await message.channel.send(`\`\`\`\n❌ Error: ${err.message}\n\`\`\``);
    }
  },
};

function parseTime(str) {
  if (/^\d+$/.test(str)) return parseInt(str) * 1000;
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  return null;
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
