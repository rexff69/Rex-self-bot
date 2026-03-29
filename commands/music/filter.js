const FILTERS = {
  bassboost: {
    equalizer: [
      { band: 0, gain: 0.20 }, { band: 1, gain: 0.15 }, { band: 2, gain: 0.10 },
      { band: 3, gain: 0.05 }, { band: 4, gain: 0.00 }, { band: 5, gain: 0.00 },
      { band: 6, gain: 0.00 }, { band: 7, gain: 0.00 }, { band: 8, gain: 0.00 },
      { band: 9, gain: 0.00 }, { band: 10, gain: 0.00 }, { band: 11, gain: 0.00 },
      { band: 12, gain: 0.00 }, { band: 13, gain: 0.00 }, { band: 14, gain: 0.00 },
    ],
  },
  nightcore: { timescale: { speed: 1.25, pitch: 1.25, rate: 1.0 } },
  vaporwave: { timescale: { speed: 0.85, pitch: 0.90, rate: 1.0 } },
  slowed: { timescale: { speed: 0.80, pitch: 0.90, rate: 1.0 } },
  tremolo: { tremolo: { frequency: 12, depth: 0.75 } },
  vibrato: { vibrato: { frequency: 14, depth: 0.75 } },
  distortion: {
    distortion: {
      sinOffset: 0.0, sinScale: 1.0, cosOffset: 0.0, cosScale: 1.0,
      tanOffset: 0.0, tanScale: 1.0, offset: 0.0, scale: 1.0,
    },
  },
  rotation: { rotation: { rotationHz: 0.2 } },
  karaoke: { karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220, filterWidth: 100 } },
  lowpass: { lowPass: { smoothing: 20.0 } },
};

export default {
  name: 'filter',
  aliases: ['fx'],
  category: 'music',
  description: 'Apply an audio filter',
  usage: 'filter <name>',
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

    const name = args[0]?.toLowerCase();

    if (!name || !FILTERS[name]) {
      const list = Object.keys(FILTERS).map((f, i) => `  [${i + 1}] ${f}`).join('\n');
      return message.channel.send([
        '```',
        '╭─[ AVAILABLE FILTERS ]─╮\n',
        list,
        '\n  Usage: filter <name>',
        '  Clear: clearfilter',
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));
    }

    try {
      queue.filters = FILTERS[name];
      await client.lavalink.updatePlayerProperties(message.guild.id, { filters: queue.filters });

      await message.channel.send([
        '```',
        '╭─[ FILTER APPLIED ]─╮\n',
        `  🎛️  Filter: ${name}`,
        `  🎵  Track: ${queue.nowPlaying.info.title}`,
        '\n╰──────────────────────────────────╯',
        '```',
      ].join('\n'));
    } catch (err) {
      console.error('[Filter Error]:', err);
      await message.channel.send(`\`\`\`\n❌ Error: ${err.message}\n\`\`\``);
    }
  },
};
