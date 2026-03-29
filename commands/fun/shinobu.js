import fetch from 'node-fetch';

export default {
  name: 'shinobu',
  aliases: [],
  category: 'fun',
  description: 'Get a Shinobu image',
  usage: 'shinobu',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://api.waifu.pics/sfw/shinobu');
      const data = await res.json();
      const imageUrl = data.url;
      
      await message.channel.send(`🦋 Shinobu appears! [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Shinobu Error]:', err);
    }
  }
};
