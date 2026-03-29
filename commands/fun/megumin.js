import fetch from 'node-fetch';

export default {
  name: 'megumin',
  aliases: [],
  category: 'fun',
  description: 'Get a Megumin image',
  usage: 'megumin',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://api.waifu.pics/sfw/megumin');
      const data = await res.json();
      const imageUrl = data.url;
      
      await message.channel.send(`💥 EXPLOSION! Megumin is here! [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Megumin Error]:', err);
    }
  }
};
