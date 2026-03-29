export default {
    name: 'reverse',
    aliases: ['rev'],
    category: 'fun',
    description: 'Reverse text or message',
    usage: 'reverse <text>',
    execute: async (message, args, client) => {
        if (args.length === 0) {
            await message.channel.send('``````');
            return;
        }
        
        const text = args.join(' ');
        const reversed = text.split('').reverse().join('');
        
        await message.channel.send(reversed);
        
        if (message.deletable) {
            await message.delete().catch(() => {});
        }
    }
};
