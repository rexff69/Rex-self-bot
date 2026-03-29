import fetch from 'node-fetch';

export default {
  name: 'smile',
  aliases: [],
  category: 'fun',
  description: 'Show a smile',
  usage: 'smile',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/smile');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      await message.channel.send(`${message.author.username} is smiling! 😊 [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Smile Error]:', err);
    }
  }
};
