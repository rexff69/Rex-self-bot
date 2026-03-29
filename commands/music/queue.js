export default {
  name: 'queue',
  aliases: ['q'],
  category: 'music',
  description: 'Show current music queue',
  usage: 'queue [page]',
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

    const PAGE_SIZE = 10;
    const page = Math.max(1, parseInt(args[0]) || 1);
    const totalPages = Math.max(1, Math.ceil(queue.songs.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const slice = queue.songs.slice(start, start + PAGE_SIZE);

    const lines = [
      '```',
      '╭─[ QUEUE ]─╮\n',
      '  🎵 Now Playing:',
      `     ${queue.nowPlaying.info.title}`,
      `     by ${queue.nowPlaying.info.author}  [${formatDuration(queue.nowPlaying.info.length)}]`,
      '',
    ];

    if (queue.songs.length === 0) {
      lines.push('  📭 No songs in queue');
    } else {
      lines.push(`  📝 Up Next: (${queue.songs.length} song${queue.songs.length !== 1 ? 's' : ''})`);
      slice.forEach((song, i) => {
        const pos = String(start + i + 1).padStart(2, ' ');
        lines.push(`  [${pos}] ${song.info.title}`);
        lines.push(`        by ${song.info.author}  [${formatDuration(song.info.length)}]`);
      });

      if (queue.songs.length > PAGE_SIZE) {
        lines.push('');
        lines.push(`  Page ${currentPage}/${totalPages} — use queue <page> to navigate`);
      }
    }

    lines.push('\n╰──────────────────────────────────╯', '```');
    message.channel.send(lines.join('\n'));

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
