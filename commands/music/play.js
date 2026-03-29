function createIdentifier(query) {
  return /^(https?:\/\/|www\.)/i.test(query) ? query : `ytmsearch:${query}`;
}

// Join voice channel via raw Discord gateway (required for selfbots)
function joinVoiceChannel(client, guildId, channelId) {
  client.ws.broadcast({
    op: 4,
    d: {
      guild_id: guildId,
      channel_id: channelId,
      self_mute: false,
      self_deaf: false,
    },
  });
}

// Wait until both VOICE_STATE_UPDATE and VOICE_SERVER_UPDATE have arrived
function waitForVoiceState(client, guildId, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const vs = client.voiceStates[guildId];
    if (vs?.token && vs?.sessionId && vs?.endpoint && vs?.channelId) {
      return resolve(vs);
    }

    let resolved = false;

    const done = (val) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      client.ws.off('VOICE_STATE_UPDATE', stateHandler);
      client.ws.off('VOICE_SERVER_UPDATE', serverHandler);
      resolve(val);
    };

    const check = () => {
      const vs = client.voiceStates[guildId];
      if (vs?.token && vs?.sessionId && vs?.endpoint && vs?.channelId) done(vs);
    };

    const stateHandler = (packet) => {
      if (packet.guild_id !== guildId || packet.user_id !== client.user.id) return;
      check();
    };

    const serverHandler = (packet) => {
      if (packet.guild_id !== guildId) return;
      check();
    };

    client.ws.on('VOICE_STATE_UPDATE', stateHandler);
    client.ws.on('VOICE_SERVER_UPDATE', serverHandler);

    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      client.ws.off('VOICE_STATE_UPDATE', stateHandler);
      client.ws.off('VOICE_SERVER_UPDATE', serverHandler);
      reject(new Error('Timed out waiting for voice state'));
    }, timeoutMs);
  });
}

export default {
  name: 'play',
  aliases: ['p'],
  category: 'music',
  description: 'Play a song from YouTube or search query',
  usage: 'play <song name or URL>',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('```\n❌ This command can only be used in a server.\n```');
      return;
    }

    const vc = message.member?.voice?.channel;
    if (!vc) {
      await message.channel.send('```\n❌ You must be in a voice channel.\n```');
      return;
    }

    if (!args.length) {
      await message.channel.send('```\n❌ Please provide a song name or URL.\n```');
      return;
    }

    try {
      const guildId = message.guild.id;

      // Use raw gateway OP4 — @discordjs/voice does not work with selfbots
      joinVoiceChannel(client, guildId, vc.id);

      // Wait for BOTH voice events (including channelId for DAVE protocol)
      const voiceState = await waitForVoiceState(client, guildId);

      const identifier = createIdentifier(args.join(' '));
      const result = await client.lavalink.loadTracks(identifier);

      if (result.loadType === 'empty') {
        await message.channel.send('```\n❌ No results found.\n```');
        return;
      }

      if (result.loadType === 'error') {
        await message.channel.send(`\`\`\`js\n❌ Error: ${result.data.message}\n\`\`\``);
        return;
      }

      let track;
      if (result.loadType === 'track') track = result.data;
      else if (result.loadType === 'playlist') track = result.data.tracks[0];
      else if (result.loadType === 'search') track = result.data[0];

      if (!track) {
        await message.channel.send('```\n❌ Could not load track.\n```');
        return;
      }

      let queue = client.queueManager.get(guildId);
      if (!queue) {
        queue = client.queueManager.create(guildId);
        queue.textChannel = message.channel;
      }

      if (queue.nowPlaying) {
        client.queueManager.addSong(guildId, track);

        let response = '```\n';
        response += `  Title: ${track.info.title}\n`;
        response += `  Artist: ${track.info.author}\n`;
        response += `  Position: ${queue.songs.length}\n`;
        response += '\n╰──────────────────────────────────╯\n```';

        await message.channel.send(response);
      } else {
        queue.nowPlaying = track;

        await client.lavalink.updatePlayer(guildId, track, voiceState, {
          volume: queue.volume,
          filters: queue.filters,
        });

        let response = '```\n';
        response += `  🎵 ${track.info.title}\n`;
        response += `  👤 ${track.info.author}\n`;
        response += `  ⏱️ ${formatDuration(track.info.length)}\n`;
        response += '\n╰──────────────────────────────────╯\n```';

        await message.channel.send(response);
      }

      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Play Error]:', err);
      await message.channel.send(`\`\`\`js\n❌ Error: ${err.message}\n\`\`\``);
    }
  },
};

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
