export default {
  name: 'serverinfo',
  aliases: ['si', 'guildinfo', 'server'],
  category: 'utility',
  description: 'Get server information',
  usage: 'serverinfo',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('```js\nNo server information available.\n```');
      return;
    }

    const guild = message.guild;
    
    // Fetch all members if not cached
    await guild.members.fetch().catch(() => {});
    
    const owner = await guild.fetchOwner().catch(() => null);
    const channels = guild.channels.cache;
    const roles = guild.roles.cache.size;
    const emojis = guild.emojis.cache.size;
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;
    
    const textChannels = channels.filter(c => c.type === 0).size;
    const voiceChannels = channels.filter(c => c.type === 2).size;
    const categories = channels.filter(c => c.type === 4).size;
    
    const createdAt = guild.createdAt.toDateString();

    let response = '```js\n';
    response += `  Name: ${guild.name}\n`;
    response += `  ID: ${guild.id}\n`;
    response += `  Owner: ${owner ? owner.user.tag : 'Unknown'}\n\n`;
    response += `  Members: ${guild.memberCount}\n`;
    response += `  Roles: ${roles}\n`;
    response += `  Emojis: ${emojis}\n\n`;
    response += `  Channels:\n`;
    response += `    Text: ${textChannels}\n`;
    response += `    Voice: ${voiceChannels}\n`;
    response += `    Categories: ${categories}\n\n`;
    response += `  Boost Level: ${boostLevel}\n`;
    response += `  Boost Count: ${boostCount}\n\n`;
    response += `  Created: ${createdAt}\n`;
    response += '\n╰──────────────────────────────────╯\n```';
    
    if (guild.iconURL()) {
      response += `[.](${guild.iconURL({ format: 'png', size: 1024 })})`;
    }
    
    await message.channel.send(response);
  }
};
