export default {
  name: 'ban',
  aliases: [],
  category: 'moderation',
  description: 'Ban a user from the server',
  usage: 'ban <@user|userID>',
  async execute(message, args, client) {
    if (!message.guild) {
      await message.channel.send('❌ This command can only be used in servers.');
      return;
    }
    if (!args[0]) {
      await message.channel.send('❌ Please mention a user or provide a user ID.');
      return;
    }

    let target;
    if (message.mentions.members.size > 0) {
      target = message.mentions.members.first();
    } else {
      try {
        target = await message.guild.members.fetch(args[0]);
      } catch {
        await message.channel.send('❌ User not found.');
        return;
      }
    }

    if (!target) {
      await message.channel.send('❌ Member not found.');
      return;
    }
    if (!target.bannable) {
      await message.channel.send('❌ I cannot ban this user. Check my permissions.');
      return;
    }

    try {
      await target.ban({ reason: `Banned by ${message.author.tag} via selfbot.` });
      await message.channel.send(`✅ ${target.user.tag} has been banned.`);
      if (message.deletable) await message.delete().catch(() => {});
    } catch (err) {
      console.error('[Ban Error]:', err);
      await message.channel.send('❌ Failed to ban the member.');
    }
  },
};
