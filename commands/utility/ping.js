export default {
    name: 'ping',
    aliases: ['latency', 'pong'],
    category: 'utility',
    description: 'Check bot latency and response time',
    usage: 'ping',
    execute: async (message, args, client) => {
        const sent = await message.channel.send('🏓 Pinging...');
        
        const timeDiff = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        
        await sent.edit(`🏓 Pong!\n\`\`\`js\n📨 Message Latency: ${timeDiff}ms\n💓 API Latency: ${apiLatency}ms\n\`\`\``);
        
        if (message.deletable) {
            await message.delete().catch(() => {});
        }
    }
};
