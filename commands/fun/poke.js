import fetch from 'node-fetch';

export default {
  name: 'poke',
  aliases: [],
  category: 'fun',
  description: 'Poke someone',
  usage: 'poke <@user>',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/poke');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      const user = message.mentions.users.first();
      const text = user ? `${message.author} pokes ${user}! 👈` : `${message.author.username} pokes! 👈`;
      
      await message.channel.send(`${text} [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Poke Error]:', err);
    }
  }
};
