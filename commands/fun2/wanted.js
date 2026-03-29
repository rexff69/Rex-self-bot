import fetch from 'node-fetch';

export default {
  name: 'wanted',
  aliases: ['wantedposter'],
  category: 'fun2',
  description: 'Generate a wanted poster',
  usage: 'wanted [@user|image_url]',
  async execute(message, args, client) {
    let targetUrl;

    // Check if user mentioned
    if (message.mentions.users.size > 0) {
      const user = message.mentions.users.first();
      targetUrl = user.displayAvatarURL({ format: 'png', size: 512 });
    } else if (args[0]) {
      targetUrl = args[0];
    } else {
      targetUrl = message.author.displayAvatarURL({ format: 'png', size: 512 });
    }

    try {
      const processingMsg = await message.channel.send('``````');

      const url = `https://nekobot.xyz/api/imagegen?type=wanted&url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        await processingMsg.edit('``````');
        return;
      }

      let result = '```js\n';
      result += '╭─[ WANTED POSTER ]─╮\n\n';
      result += '  🚨 WANTED 🚨\n';
      result += '  Dead or Alive\n';
      result += '\n╰──────────────────────────────────╯\n```';
      result += `[.](${data.message})`;

      await processingMsg.edit(result);

    } catch (error) {
      console.error('[Wanted Error]:', error);
      await message.channel.send('``````');
    }
  }
};
