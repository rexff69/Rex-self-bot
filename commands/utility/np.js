import { saveDatabase } from '../../functions/database.js';

export default {
    name: 'nop',
    aliases: ['noprefix', 'np'],
    category: 'utility',
    description: 'Toggle no-prefix mode on/off',
    usage: 'nop <on/off>',
    execute: async (message, args, client) => {
        if (!args[0]) {
            const status = client.db.noPrefixMode ? 'Enabled ✅' : 'Disabled ❌';
            await message.channel.send(`\`\`\`js\nNo-Prefix Mode: ${status}\nUsage: ${process.env.PREFIX}nop <on/off>\n\`\`\``);
            return;
        }
        
        const action = args[0].toLowerCase();
        
        if (action === 'on' || action === 'enable' || action === '1') {
            client.db.noPrefixMode = true;
            saveDatabase(client.db);
            await message.channel.send('```js\nNo-Prefix Mode has been enabled ✅\n```');
        } else if (action === 'off' || action === 'disable' || action === '0') {
            client.db.noPrefixMode = false;
            saveDatabase(client.db);
            await message.channel.send('```js\nNo-Prefix Mode has been disabled ❌\n```');
        } else {
            await message.channel.send('```js\nInvalid option. Use "on" or "off".\n```');
        }
        
        if (message.deletable) {
            await message.delete().catch(() => {});
        }
    }
};
