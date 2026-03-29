export default {
  name: 'servericon',
  aliases: ['sicon', 'guildicon'],
  category: 'utility',
  description: 'Get server icon',
  usage: 'servericon',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('```js\nNo server information available.\n```');
      return;
    }

    const guild = message.guild;
    
    if (!guild.iconURL()) {
      await message.channel.send('```js\nNo server icon available.\n```');
      return;
    }

    const iconURL = guild.iconURL({ format: 'png', size: 4096, dynamic: true });
    
    let response = '```js\n';
    response += '╭───🌐 Server Icon 🌐───╮\n';
    response += `  Server: ${guild.name}\n`;
    response += `  ID: ${guild.id}\n`;
    response += '\n╰──────────────────────────────────╯\n```';
    response += `**${guild.name}'s Icon** [.](${iconURL})`;
    
    await message.channel.send(response);
  }
};
