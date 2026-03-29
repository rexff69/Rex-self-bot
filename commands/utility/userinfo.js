export default {
  name: 'userinfo',
  aliases: ['ui', 'whois', 'user'],
  category: 'utility',
  description: 'Get user information',
  usage: 'userinfo [@user|userID]',
  async execute(message, args, client) {
    let user;
    let member;
    
    if (message.mentions.users.size > 0) {
      user = message.mentions.users.first();
      member = message.mentions.members.first();
    } else if (args[0]) {
      try {
        user = await client.users.fetch(args[0]);
        if (message.guild) {
          member = await message.guild.members.fetch(args[0]).catch(() => null);
        }
      } catch {
        await message.channel.send('```js\nInvalid user ID.\n```');
        return;
      }
    } else {
      user = message.author;
      member = message.member;
    }

    const createdAt = user.createdAt.toDateString();
    const avatarURL = user.displayAvatarURL({ format: 'png', size: 1024, dynamic: true });
    
    let response = '```js\n';
    response += `  Username: ${user.tag}\n`;
    response += `  ID: ${user.id}\n`;
    response += `  Bot: ${user.bot ? 'Yes' : 'No'}\n`;
    response += `  Created: ${createdAt}\n`;
    
    if (member) {
      const joinedAt = member.joinedAt ? member.joinedAt.toDateString() : 'Unknown';
      const roles = member.roles.cache
        .filter(r => r.id !== message.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => r.name)
        .slice(0, 5);
      
      response += `\n  Joined: ${joinedAt}\n`;
      response += `  Nickname: ${member.nickname || 'None'}\n`;
      response += `  Roles: ${roles.length > 0 ? roles.join(', ') : 'None'}\n`;
      
      if (roles.length > 5) {
        response += `  (+${member.roles.cache.size - 6} more)\n`;
      }
    }
    
    response += '\n╰──────────────────────────────────╯\n```';
    response += `[.](${avatarURL})`;
    
    await message.channel.send(response);
  }
};
