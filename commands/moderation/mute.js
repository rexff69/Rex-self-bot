export default {
  name: 'mute',
  aliases: ['timeout'],
  category: 'moderation',
  description: 'Timeout (mute) a user for 1 hour',
  usage: 'mute <@user|userID>',
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
    if (!target.moderatable) {
      await message.channel.send('❌ I cannot mute this user. Check my permissions.');
      return;
    }

    try {
      // Timeout duration: 1 hour (3600000 ms)
      await target.timeout(3600000, `Muted by ${message.author.tag} via selfbot.`);
      await message.channel.send(`✅ ${target.user.tag} has been muted (1 hour).`);
      if (message.deletable) await message.delete().catch(() => {});
    } catch (err) {
      console.error('[Mute Error]:', err);
      await message.channel.send('❌ Failed to mute the member.');
    }
  },
};
