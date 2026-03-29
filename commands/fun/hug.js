import fetch from 'node-fetch';

export default {
  name: 'hug',
  aliases: [],
  category: 'fun',
  description: 'Give someone a warm hug',
  usage: 'hug <@user>',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/hug');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      const user = message.mentions.users.first();
      const text = user ? `${message.author} hugs ${user}! 🤗` : `${message.author.username} gives a hug! 🤗`;
      
      await message.channel.send(`${text} [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Hug Error]:', err);
    }
  }
};
