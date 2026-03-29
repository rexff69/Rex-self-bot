export default {
  name: 'avatar',
  aliases: ['av', 'pfp'],
  category: 'utility',
  description: 'Get user avatar',
  usage: 'avatar [@user|userID]',
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

    const avatarURL = user.displayAvatarURL({ format: 'png', size: 4096, dynamic: true });
    
    let response = '```js\n';
    response += '╭───🌐 Avatar Info 🌐───╮\n';
    response += `  User: ${user.tag}\n`;
    response += `  ID: ${user.id}\n`;
    response += '\n╰──────────────────────────────────╯\n```';
    response += `**${user.username}'s Avatar** [.](${avatarURL})`;
    
    await message.channel.send(response);
  }
};
