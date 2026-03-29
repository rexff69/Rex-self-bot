import fetch from 'node-fetch';

export default {
  name: 'waifu',
  aliases: [],
  category: 'fun',
  description: 'Get a random waifu image',
  usage: 'waifu',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://api.waifu.pics/sfw/waifu');
      const data = await res.json();
      const imageUrl = data.url;
      
      await message.channel.send(`✨ Waifu for ${message.author.username}! [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Waifu Error]:', err);
    }
  }
};
