export default {
    name: 'uptime',
    aliases: ['up', 'runtime'],
    category: 'utility',
    description: 'Show selfbot uptime statistics',
    usage: 'uptime',
    execute: async (message, args, client) => {
        const uptime = process.uptime();
        
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        let uptimeStr = '```\n';
        uptimeStr += `  Days: ${days}\n`;
        uptimeStr += `  Hours: ${hours}\n`;
        uptimeStr += `  Minutes: ${minutes}\n`;
        uptimeStr += `  Seconds: ${seconds}\n`;
        uptimeStr += `\n  Total: ${days}d ${hours}h ${minutes}m ${seconds}s\n`;
        uptimeStr += '\n╰──────────────────────╯\n```';
        
        await message.channel.send(uptimeStr);
        
        if (message.deletable) {
            await message.delete().catch(() => {});
        }
    }
};
