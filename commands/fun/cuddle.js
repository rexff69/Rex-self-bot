import fetch from 'node-fetch';

export default {
  name: 'cuddle',
  aliases: [],
  category: 'fun',
  description: 'Cuddle with someone',
  usage: 'cuddle <@user>',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/cuddle');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      const user = message.mentions.users.first();
      const text = user ? `${message.author} cuddles ${user}! 🤗` : `${message.author.username} wants cuddles! 🤗`;
      
      await message.channel.send(`${text} [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Cuddle Error]:', err);
    }
  }
};
