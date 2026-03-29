import fetch from 'node-fetch';

export default {
  name: 'wave',
  aliases: [],
  category: 'fun',
  description: 'Wave at someone',
  usage: 'wave <@user>',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/wave');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      const user = message.mentions.users.first();
      const text = user ? `${message.author} waves at ${user}! 👋` : `${message.author.username} waves! 👋`;
      
      await message.channel.send(`${text} [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Wave Error]:', err);
    }
  }
};
