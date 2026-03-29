export default {
    name: 'clear',
    aliases: ['cls', 'clean'],
    category: 'tools',
    description: 'Clear console screen',
    usage: 'clear',
    execute: async (message, args, client) => {
        console.clear();
        
        console.log('╭─────────────────────────╮');
        console.log('│  Console Cleared!       │');
        console.log('╰─────────────────────────╯\n');
        
        const sent = await message.channel.send('``````');
        
        setTimeout(() => {
            sent.delete().catch(() => {});
            if (message.deletable) {
                message.delete().catch(() => {});
            }
        }, 2000);
    }
};
