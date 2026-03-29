import fetch from 'node-fetch';

export default {
  name: 'phcomment',
  aliases: ['phub', 'ph'],
  category: 'fun2',
  description: 'Generate a fake PH comment',
  usage: 'phcomment <@user|username> <text>',
  async execute(message, args, client) {
    if (args.length < 2) {
      let response = '```js\n';
      response += '╭─[ PH COMMENT ]─╮\n\n';
      response += '  Usage:\n';
      response += '    phcomment <@user|username> <text>\n\n';
      response += '  Examples:\n';
      response += '    phcomment @user Great content!\n';
      response += '    phcomment john Nice video\n';
      response += '\n╰──────────────────────────────────╯\n```';
      await message.channel.send(response);
      return;
    }

    let username, avatarUrl, text;
    
    // Check if first arg is a mention
    if (message.mentions.users.size > 0) {
      const user = message.mentions.users.first();
      username = user.username;
      avatarUrl = user.displayAvatarURL({ format: 'png', size: 512, dynamic: false });
      text = args.slice(1).join(' ');
    } else {
      username = args[0];
      // Try to fetch user by username or use default avatar
      try {
        const user = await client.users.fetch(args[0]).catch(() => null);
        if (user) {
          avatarUrl = user.displayAvatarURL({ format: 'png', size: 512, dynamic: false });
        } else {
          // Use message author's avatar as fallback
          avatarUrl = message.author.displayAvatarURL({ format: 'png', size: 512, dynamic: false });
        }
      } catch {
        avatarUrl = message.author.displayAvatarURL({ format: 'png', size: 512, dynamic: false });
      }
      text = args.slice(1).join(' ');
    }

    try {
      const processingMsg = await message.channel.send('``````');

      // Build URL with proper parameters
      const url = `https://nekobot.xyz/api/imagegen?type=phcomment&image=${encodeURIComponent(avatarUrl)}&text=${encodeURIComponent(text)}&username=${encodeURIComponent(username)}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!data.success || !data.message) {
        await processingMsg.edit('``````');
        console.error('[PHComment] API Error:', data);
        return;
      }

      let result = '```js\n';
      result += '╭─[ PH COMMENT ]─╮\n\n';
      result += `  User: ${username}\n`;
      result += `  Text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}\n`;
      result += '\n╰──────────────────────────────────╯\n```';
      result += `[.](${data.message})`;

      await processingMsg.edit(result);

    } catch (error) {
      console.error('[PHComment Error]:', error);
      await message.channel.send('``````');
    }
  }
};
