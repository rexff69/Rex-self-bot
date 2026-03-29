import fetch from 'node-fetch';

export default {
  name: 'bored',
  aliases: [],
  category: 'fun',
  description: 'Express boredom',
  usage: 'bored',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/bored');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      await message.channel.send(`${message.author.username} is bored! 😑 [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Bored Error]:', err);
    }
  }
};
