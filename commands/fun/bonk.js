import fetch from 'node-fetch';

export default {
  name: 'bonk',
  aliases: [],
  category: 'fun',
  description: 'Bonk someone',
  usage: 'bonk <@user>',
  async execute(message, args, client) {
    try {
      const res = await fetch('https://api.waifu.pics/sfw/bonk');
      const data = await res.json();
      const imageUrl = data.url;
      
      const user = message.mentions.users.first();
      const text = user ? `${message.author} bonks ${user}! 🔨` : `${message.author.username} bonks! 🔨`;
      
      await message.channel.send(`${text} [.](${imageUrl})`);
      
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('[Bonk Error]:', err);
    }
  }
};
