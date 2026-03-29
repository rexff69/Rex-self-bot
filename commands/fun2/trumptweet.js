import fetch from 'node-fetch';

export default {
  name: 'trumptweet',
  aliases: ['trump', 'donaldtweet'],
  category: 'fun2',
  description: 'Generate a fake Trump tweet',
  usage: 'trumptweet <text>',
  async execute(message, args, client) {
    if (args.length === 0) {
      await message.channel.send('``````');
      return;
    }

    const text = args.join(' ');

    try {
      const processingMsg = await message.channel.send('```js\nprocessing...\n```');

      const url = `https://nekobot.xyz/api/imagegen?type=trumptweet&text=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        await processingMsg.edit('``````');
        return;
      }

      let result = '```js\n';
      result += '╭─[ TRUMP TWEET ]─╮\n\n';
      result += `  Text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}\n`;
      result += '\n╰──────────────────────────────────╯\n```';
      result += `[.](${data.message})`;

      await processingMsg.edit(result);

    } catch (error) {
      console.error('[Trump Tweet Error]:', error);
      await message.channel.send('``````');
    }
  }
};
