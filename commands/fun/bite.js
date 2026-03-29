import fetch from 'node-fetch';

export default {
  name: 'bite',
  aliases: [],
  category: 'fun',
  description: 'Bite someone playfully',
  usage: 'bite <@user>',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/bite');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      const user = message.mentions.users.first();
      const text = user ? `${message.author} bites ${user}! 🦷` : `${message.author.username} bites! 🦷`;
      
      await message.channel.send(`${text} [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Bite Error]:', err);
    }
  }
};
