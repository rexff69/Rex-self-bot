export default {
  name: 'screenshot',
  aliases: ['ss', 'snap'],
  category: 'fun2',
  description: 'Take a screenshot of a website',
  usage: 'screenshot <url>',
  async execute(message, args, client) {
    if (args.length === 0) {
      await message.channel.send('``````');
      return;
    }

    let url = args[0];
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      const apiUrl = `https://api.popcat.xyz/screenshot?url=${encodeURIComponent(url)}`;

      let response = '```js\n';
      response += '╭─[ SCREENSHOT ]─╮\n\n';
      response += `  📸 URL: ${url}\n`;
      response += '\n╰──────────────────────────────────╯\n```';
      response += `[.](${apiUrl})`;

      await message.channel.send(response);
    } catch (error) {
      console.error('[Screenshot Error]:', error);
      await message.channel.send('``````');
    }
  }
};
