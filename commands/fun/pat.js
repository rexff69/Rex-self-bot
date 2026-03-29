import fetch from 'node-fetch';

export default {
  name: 'pat',
  aliases: ['headpat'],
  category: 'fun',
  description: 'Pat someone on the head',
  usage: 'pat <@user>',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/pat');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      const user = message.mentions.users.first();
      const text = user ? `${message.author} pats ${user}! 👋` : `${message.author.username} pats! 👋`;
      
      await message.channel.send(`${text} [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Pat Error]:', err);
    }
  }
};
