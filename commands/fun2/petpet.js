import fetch from 'node-fetch';

export default {
  name: 'petpet',
  aliases: ['pet', 'headpat'],
  category: 'fun2',
  description: 'Generate a pet pet GIF',
  usage: 'petpet [@user|image_url]',
  async execute(message, args, client) {
    let targetUrl;

    // Check if user mentioned
    if (message.mentions.users.size > 0) {
      const user = message.mentions.users.first();
      targetUrl = user.displayAvatarURL({ format: 'png', size: 512, dynamic: false });
    } else if (args[0] && args[0].startsWith('http')) {
      targetUrl = args[0];
    } else {
      targetUrl = message.author.displayAvatarURL({ format: 'png', size: 512, dynamic: false });
    }

    try {
      const processingMsg = await message.channel.send('processing your pet pet... 🐾');

      const url = `https://api.some-random-api.com/premium/petpet?avatar=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        await processingMsg.edit('``````');
        console.error('[PetPet] API Error:', response.status);
        return;
      }

      const buffer = await response.buffer();

      let result = '```js\n';
      result += '╭─[ PET PET ]─╮\n\n';
      result += '  🐾 *pat pat*\n';
      result += '\n╰──────────────────────────────────╯\n```';

      await processingMsg.delete().catch(() => {});
      
      await message.channel.send({
        content: result,
        files: [{
          attachment: buffer,
          name: 'petpet.gif'
        }]
      });

    } catch (error) {
      console.error('[PetPet Error]:', error);
      await message.channel.send('``````');
    }
  }
};
