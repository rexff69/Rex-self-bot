import fetch from 'node-fetch';

export default {
  name: 'cry',
  aliases: [],
  category: 'fun',
  description: 'Express sadness',
  usage: 'cry',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/cry');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      await message.channel.send(`${message.author.username} is crying! 😢 [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Cry Error]:', err);
    }
  }
};
