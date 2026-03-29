import fetch from 'node-fetch';

export default {
  name: 'neko',
  aliases: ['catgirl'],
  category: 'fun',
  description: 'Get a cute neko image',
  usage: 'neko',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/neko');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      await message.channel.send(`🐱 Cute neko for ${message.author.username}! [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Neko Error]:', err);
    }
  }
};
