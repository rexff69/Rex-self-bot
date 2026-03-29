export default {
  name: 'blur',
  aliases: ['blurimage'],
  category: 'fun2',
  description: 'Blur a user avatar',
  usage: 'blur [@user|userID]',
  async execute(message, args, client) {
    let user;
    
    if (message.mentions.users.size > 0) {
      user = message.mentions.users.first();
    } else if (args[0]) {
      try {
        user = await client.users.fetch(args[0]);
      } catch {
        await message.channel.send('``````');
        return;
      }
    } else {
      user = message.author;
    }

    try {
      const avatarUrl = encodeURIComponent(user.displayAvatarURL({ format: 'png', size: 512 }));
      const apiUrl = `https://api.popcat.xyz/blur?image=${avatarUrl}`;

      let response = '```js\n';
      response += '╭─[ BLUR EFFECT ]─╮\n\n';
      response += `  User: ${user.username}\n`;
      response += `  Effect: Blur\n`;
      response += '\n╰──────────────────────────────────╯\n```';
      response += `[.](${apiUrl})`;

      await message.channel.send(response);
    } catch (error) {
      console.error('[Blur Error]:', error);
      await message.channel.send('``````');
    }
  }
};
