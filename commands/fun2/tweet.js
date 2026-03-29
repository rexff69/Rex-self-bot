import fetch from 'node-fetch';

export default {
  name: 'tweet',
  aliases: ['twitter', 'faketweet'],
  category: 'fun2',
  description: 'Generate a fake tweet',
  usage: 'tweet <@user|username> <text>',
  async execute(message, args, client) {
    if (args.length < 2) {
      await message.channel.send('``````');
      return;
    }

    let username, text;
    
    // Check if first arg is a mention
    if (message.mentions.users.size > 0) {
      const user = message.mentions.users.first();
      username = user.username;
      text = args.slice(1).join(' ');
    } else {
      username = args[0];
      text = args.slice(1).join(' ');
    }

    try {
      const processingMsg = await message.channel.send('processing...');

      const url = `https://nekobot.xyz/api/imagegen?type=tweet&username=${encodeURIComponent(username)}&text=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        await processingMsg.edit('``````');
        return;
      }

      let result = '```js\n';
      result += '╭─[ FAKE TWEET ]─╮\n\n';
      result += `  User: @${username}\n`;
      result += `  Text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}\n`;
      result += '\n╰──────────────────────────────────╯\n```';
      result += `[.](${data.message})`;

      await processingMsg.edit(result);

    } catch (error) {
      console.error('[Tweet Error]:', error);
      await message.channel.send('``````');
    }
  }
};
