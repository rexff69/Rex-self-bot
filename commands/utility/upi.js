import { MessageAttachment } from 'discord.js-selfbot-v13';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: 'upi',
  aliases: ['payment', 'pay'],
  category: 'utility',
  description: 'Send UPI payment QR code',
  usage: 'upi',
  async execute(message, args, client) {
    try {
      const upiPath = path.join(__dirname, '..', '..', 'database', 'upi.png');
      
      if (!fs.existsSync(upiPath)) {
        await message.channel.send('``````');
        return;
      }

      const attachment = new MessageAttachment(upiPath, 'upi.png');
      
      let response = '```js\n';
      response += '  💳 Scan to pay\n';
      response += '  📱 UPI QR Code\n';
      response += '\n╰──────────────────────────────────╯\n```';

      await message.channel.send({ 
        content: response,
        files: [attachment]
      });

    } catch (error) {
      console.error('[UPI Error]:', error);
      await message.channel.send('``````');
    }
  }
};
