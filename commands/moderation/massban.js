export default {
  name: 'massban',
  aliases: ['mass-ban'],
  category: 'moderation',
  description: 'Ban multiple users by IDs or mentions (space separated)',
  usage: 'massban <@user|userID> [@user|userID] ...',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('❌ This command only works in servers.');
      return;
    }
    if (args.length === 0) {
      await message.channel.send('❌ Please provide user IDs or mentions.');
      return;
    }

    const banned = [];
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
        await message.guild.members.ban(userId, { reason: `Mass ban by ${message.author.tag}` });
        banned.push(userId);
        await new Promise(res => setTimeout(res, 300)); // Rate limit delay
      } catch {
        failed.push(userId);
      }
    }

    let report = `✅ Banned: ${banned.length}`;
    if (failed.length > 0) report += `\n❌ Failed: ${failed.join(', ')}`;
    await message.channel.send(report);

    if (message.deletable) await message.delete().catch(() => {});
  },
};
