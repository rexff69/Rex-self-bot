import fetch from 'node-fetch';

export default {
  name: 'threats',
  aliases: ['threat'],
  category: 'fun2',
  description: 'Generate a threat image',
  usage: 'threats [@user|image_url]',
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
      const processingMsg = await message.channel.send('`processing...`');

      const url = `https://nekobot.xyz/api/imagegen?type=threats&url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        await processingMsg.edit('``````');
        return;
      }

      let result = '```js\n';
      result += '╭─[ THREAT ]─╮\n\n';
      result += '  ⚠️ This is a threat ⚠️\n';
      result += '\n╰──────────────────────────────────╯\n```';
      result += `[.](${data.message})`;

      await processingMsg.edit(result);

    } catch (error) {
      console.error('[Threats Error]:', error);
      await message.channel.send('``````');
    }
  }
};
