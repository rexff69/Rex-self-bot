export default {
  name: 'masskick',
  aliases: ['mass-kick'],
  category: 'moderation',
  description: 'Kick multiple users by IDs or mentions (space separated)',
  usage: 'masskick <@user|userID> [@user|userID] ...',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('❌ This command only works in servers.');
      return;
    }
    if (args.length === 0) {
      await message.channel.send('❌ Please provide user IDs or mentions.');
      return;
    }

    const kicked = [];
    const failed = [];

    for (const arg of args) {
      let userId = null;
      if (/^<@!?(\d+)>$/.test(arg)) {
        const match = arg.match(/^<@!?(\d+)>$/);
        userId = match[1];
      } else if (/^\d+$/.test(arg)) {
        userId = arg;
      } else {
        failed.push(arg);
        continue;
      }

      try {
        const member = await message.guild.members.fetch(userId);
        if (!member.kickable) {
          failed.push(userId);
          continue;
        }
        await member.kick(`Mass kick by ${message.author.tag}`);
        kicked.push(userId);
        await new Promise(res => setTimeout(res, 300));
      } catch {
        failed.push(userId);
      }
    }

    let report = `✅ Kicked: ${kicked.length}`;
    if (failed.length > 0) report += `\n❌ Failed: ${failed.join(', ')}`;
    await message.channel.send(report);

    if (message.deletable) await message.delete().catch(() => {});
  },
};
