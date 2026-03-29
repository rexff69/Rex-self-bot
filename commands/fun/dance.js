import fetch from 'node-fetch';

export default {
  name: 'dance',
  aliases: [],
  category: 'fun',
  description: 'Show off your dance moves',
  usage: 'dance',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/dance');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      await message.channel.send(`${message.author.username} is dancing! 💃 [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Dance Error]:', err);
    }
  }
};
