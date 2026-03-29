import fetch from 'node-fetch';

export default {
  name: 'captcha',
  aliases: ['fakecaptcha'],
  category: 'fun2',
  description: 'Generate a fake captcha',
  usage: 'captcha [@user|image_url] <text>',
  async execute(message, args, client) {
    let targetUrl, text;

    // Check if user mentioned
    if (message.mentions.users.size > 0) {
      const user = message.mentions.users.first();
      targetUrl = user.displayAvatarURL({ format: 'png', size: 512 });
      text = args.slice(1).join(' ') || user.username;
    } else if (args.length >= 2) {
      targetUrl = args[0];
      text = args.slice(1).join(' ');
    } else if (args.length === 1) {
      targetUrl = message.author.displayAvatarURL({ format: 'png', size: 512 });
      text = args[0];
    } else {
      targetUrl = message.author.displayAvatarURL({ format: 'png', size: 512 });
      text = message.author.username;
    }

    try {
      const processingMsg = await message.channel.send('`processing...`');

      const url = `https://nekobot.xyz/api/imagegen?type=captcha&url=${encodeURIComponent(targetUrl)}&username=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        await processingMsg.edit('``````');
        return;
      }

      let result = '```js\n';
      result += '╭─[ CAPTCHA ]─╮\n\n';
      result += `  Username: ${text}\n`;
      result += '  🤖 Verify you are human\n';
      result += '\n╰──────────────────────────────────╯\n```';
      result += `[.](${data.message})`;

      await processingMsg.edit(result);

    } catch (error) {
      console.error('[Captcha Error]:', error);
      await message.channel.send('``````');
    }
  }
};
