export default {
    name: 'purge',
    aliases: ['clean', 'delete'],
    category: 'tools',
    description: 'Delete your own messages in channel',
    usage: 'purge <amount>',
    execute: async (message, args, client) => {
        const amount = parseInt(args[0]);
        
        if (isNaN(amount) || amount < 1 || amount > 100) {
            await message.channel.send('``````');
            return;
        }
        
        const fetched = await message.channel.messages.fetch({ limit: 100 });
        const myMessages = fetched.filter(m => m.author.id === client.user.id);
        const toDelete = Array.from(myMessages.values()).slice(0, amount);
        
        let deleted = 0;
        for (const msg of toDelete) {
            try {
                await msg.delete();
                deleted++;
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error('Error deleting message:', error);
            }
        }
        
        const sent = await message.channel.send(`\`\`\`js\n✅ Deleted ${deleted} message(s)\n\`\`\``);
        
        setTimeout(() => {
            sent.delete().catch(() => {});
        }, 3000);
    }
};
