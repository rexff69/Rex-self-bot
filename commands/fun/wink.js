import fetch from 'node-fetch';

export default {
  name: 'wink',
  aliases: [],
  category: 'fun',
  description: 'Wink at someone',
  usage: 'wink <@user>',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/wink');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      const user = message.mentions.users.first();
      const text = user ? `${message.author} winks at ${user}! 😉` : `${message.author.username} winks! 😉`;
      
      await message.channel.send(`${text} [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Wink Error]:', err);
    }
  }
};
