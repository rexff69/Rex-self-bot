import { generateHelpMenu } from '../../functions/helpMenu.js';

export default {
    name: 'help',
    aliases: ['h', 'commands', 'cmds'],
    category: 'utility',
    description: 'Display all available commands',
    usage: 'help [category]',
    execute: async (message, args, client) => {
        // If no args, show homepage with categories
        // If args provided, show specific category
        const category = args[0] || null;
        const helpMenu = generateHelpMenu(client, category);
        
        await message.channel.send(helpMenu);
        
        // Delete the command message
        if (message.deletable) {
            await message.delete().catch(() => {});
        }
    }
};
