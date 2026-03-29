export default {
    name: 'say',
    aliases: ['echo', 'repeat'],
    category: 'fun',
    description: 'Make the bot say something',
    usage: 'say <message>',
    execute: async (message, args, client) => {
        if (args.length === 0) {
            await message.channel.send('``````');
            return;
        }
        
        const text = args.join(' ');
        await message.channel.send(text);
        
        if (message.deletable) {
            await message.delete().catch(() => {});
        }
    }
};
