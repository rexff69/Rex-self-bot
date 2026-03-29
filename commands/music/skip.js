export default {
  name: 'skip',
  aliases: ['s', 'next'],
  category: 'music',
  description: 'Skip to the next song',
  usage: 'skip',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('```\n❌ This command can only be used in a server.\n```');
      return;
    }

    const guildId = message.guild.id;
    const queue = client.queueManager.get(guildId);

    if (!queue || !queue.nowPlaying) {
      await message.channel.send('```\n❌ Nothing is currently playing.\n```');
      return;
    }

    try {
      const skipped = queue.nowPlaying;
      const nextSong = client.queueManager.getNext(guildId);

      if (!nextSong) {
        await client.lavalink.destroyPlayer(guildId);
        client.queueManager.delete(guildId);
        await message.channel.send([
          '```',
          '╭─[ SKIPPED ]─╮\n',
          `  ⏭️  ${skipped.info.title}`,
          '  📭  Queue is now empty',
          '\n╰──────────────────────────────────╯',
          '```',
        ].join('\n'));
        return;
      }

      queue.nowPlaying = nextSong;

      const voiceState = client.voiceStates[guildId];
      if (!voiceState?.token || !voiceState?.sessionId || !voiceState?.endpoint || !voiceState?.channelId) {
        await message.channel.send('```\n❌ Voice state lost. Please rejoin and use play again.\n```');
        return;
      }

      await client.lavalink.updatePlayer(guildId, nextSong, voiceState, {
        volume: queue.volume,
        filters: queue.filters,
      });

      await message.channel.send([
        '```',
        '╭─[ SKIPPED ]─╮\n',
        `  ⏭️  Skipped: ${skipped.info.title}`,
        '',
        '  🎵 Now Playing:',
        `     ${nextSong.info.title}`,
        `     by ${nextSong.info.author}`,
        `     ${formatDuration(nextSong.info.length)}`,
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));

      if (message.deletable) await message.delete().catch(() => {});
    } catch (err) {
      console.error('[Skip Error]:', err);
      await message.channel.send(`\`\`\`\n❌ Error: ${err.message}\n\`\`\``);
    }
  },
};

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
