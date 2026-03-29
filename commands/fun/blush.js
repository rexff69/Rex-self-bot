import fetch from 'node-fetch';

export default {
  name: 'blush',
  aliases: [],
  category: 'fun',
  description: 'Show embarrassment',
  usage: 'blush',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/blush');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      await message.channel.send(`${message.author.username} is blushing! 😳 [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Blush Error]:', err);
    }
  }
};
