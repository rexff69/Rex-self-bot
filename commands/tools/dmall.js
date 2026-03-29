export default {
  name: 'dmall',
  aliases: ['massdm', 'dmmembers'],
  category: 'moderation',
  description: 'DM all server members with a message',
  usage: 'dmall <message>',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('``````');
      return;
    }

    // Only owner can use this command
    if (message.author.id !== process.env.OWNER_ID) {
      await message.channel.send('``````');
      return;
    }

    if (args.length === 0) {
      let response = '```js\n';
      response += '╭─[ DM ALL ]─╮\n\n';
      response += '  Usage:\n';
      response += '    dmall <message>\n\n';
      response += '  Example:\n';
      response += '    dmall Hello everyone!\n\n';
      response += '  ⚠️ Warning:\n';
      response += '    This will DM ALL members\n';
      response += '    Use responsibly!\n';
      response += '\n╰──────────────────────────────────╯\n```';
      await message.channel.send(response);
      return;
    }

    const dmMessage = args.join(' ');

    try {
      // Fetch all members
      await message.guild.members.fetch();

      const members = message.guild.members.cache.filter(
        member => !member.user.bot && member.id !== client.user.id
      );

      let response = '```js\n';
      response += '╭─[ DM ALL STARTED ]─╮\n\n';
      response += `  Target: ${members.size} members\n`;
      response += `  Message: ${dmMessage.substring(0, 40)}${dmMessage.length > 40 ? '...' : ''}\n`;
      response += '  Status: Sending...\n';
      response += '\n╰──────────────────────────────────╯\n```';

      const statusMsg = await message.channel.send(response);

      let sent = 0;
      let failed = 0;

      // Send DMs without delay
      const promises = members.map(async (member) => {
        try {
          await member.send(dmMessage);
          sent++;
        } catch (error) {
          failed++;
          console.error(`[DM All] Failed to DM ${member.user.tag}:`, error.message);
        }
      });

      // Wait for all DMs to complete
      await Promise.all(promises);

      // Update status message
      let finalResponse = '```js\n';
      finalResponse += '╭─[ DM ALL COMPLETE ]─╮\n\n';
      finalResponse += `  Total Members: ${members.size}\n`;
      finalResponse += `  ✅ Sent: ${sent}\n`;
      finalResponse += `  ❌ Failed: ${failed}\n`;
      finalResponse += `  Success Rate: ${Math.round((sent / members.size) * 100)}%\n`;
      finalResponse += '\n╰──────────────────────────────────╯\n```';

      await statusMsg.edit(finalResponse);

      console.log(`[DM All] Completed: ${sent} sent, ${failed} failed`);

    } catch (error) {
      console.error('[DM All Error]:', error);
      await message.channel.send('``````');
    }
  }
};
