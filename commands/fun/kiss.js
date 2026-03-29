import fetch from 'node-fetch';

export default {
  name: 'kiss',
  aliases: [],
  category: 'fun',
  description: 'Give someone a kiss',
  usage: 'kiss <@user>',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://nekos.best/api/v2/kiss');
      const data = await res.json();
      const imageUrl = data.results[0].url;
      
      const user = message.mentions.users.first();
      const text = user ? `${message.author} kisses ${user}! 💋` : `${message.author.username} blows a kiss! 💋`;
      
      await message.channel.send(`${text} [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Kiss Error]:', err);
    }
  }
};
