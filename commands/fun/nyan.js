import fetch from 'node-fetch';

export default {
  name: 'nyan',
  aliases: [],
  category: 'fun',
  description: 'Get a nyan cat image',
  usage: 'nyan',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://api.waifu.pics/sfw/neko');
      const data = await res.json();
      const imageUrl = data.url;
      
      await message.channel.send(`🐱 Nyan! ${message.author.username} [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Nyan Error]:', err);
    }
  }
};
