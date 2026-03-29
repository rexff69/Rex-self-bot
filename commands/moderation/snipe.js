export default {
    name: 'snipe',
    aliases: ['sn'],
    category: 'moderation',
    description: 'Retrieve last deleted message in channel',
    usage: 'snipe',
    execute: async (message, args, client) => {
        const snipedMessage = client.deletedMessages.get(message.channel.id);
        
        if (!snipedMessage) {
            await message.channel.send('``````');
            return;
        }
        
        const output = `\`\`\`js\n╭─[ SNIPED MESSAGE ]─╮\n\nAuthor: ${snipedMessage.author}\nContent: ${snipedMessage.content}\n\n╰─────────────────────╯\n\`\`\``;
        
        await message.channel.send(output);
        
        if (message.deletable) {
            await message.delete().catch(() => {});
        }
    }
};
