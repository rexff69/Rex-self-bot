export default {
  name: 'nowplaying',
  aliases: ['np', 'current'],
  category: 'music',
  description: 'Show currently playing song',
  usage: 'nowplaying',
  execute(message, args, client) {
    if (!message.guild) {
      message.channel.send('```\n❌ This command can only be used in a server.\n```');
      return;
    }

    const queue = client.queueManager.get(message.guild.id);
    if (!queue || !queue.nowPlaying) {
      message.channel.send('```\n❌ Nothing is currently playing.\n```');
      return;
    }

    const song = queue.nowPlaying;
    const activeFilters = Object.keys(queue.filters || {}).join(', ') || 'None';

    message.channel.send([
      '```',
      '╭─[ NOW PLAYING ]─╮\n',
      `  🎵  ${song.info.title}`,
      `  👤  ${song.info.author}`,
      `  ⏱️  ${formatDuration(song.info.length)}`,
      `  🔊  Volume: ${queue.volume}%`,
      `  🎛️  Filters: ${activeFilters}`,
      `  📝  Queue: ${queue.songs.length} song${queue.songs.length !== 1 ? 's' : ''} up next`,
      '\n╰──────────────────────────────────╯',
      '```',
    ].join('\n'));

    if (message.deletable) message.delete().catch(() => {});
  },
};

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
