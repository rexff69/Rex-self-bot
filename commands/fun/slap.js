import fetch from 'node-fetch';

export default {
  name: 'slap',
  aliases: [],
  category: 'fun',
  description: 'Slap someone',
  usage: 'slap <@user>',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/slap');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      const user = message.mentions.users.first();
      const text = user ? `${message.author} slaps ${user}! 👋💥` : `${message.author.username} slaps the air! 👋💥`;
      
      await message.channel.send(`${text} [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Slap Error]:', err);
    }
  }
};
