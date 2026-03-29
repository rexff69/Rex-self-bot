const afkUsers = new Map();
let messageListenerRegistered = false;

export default {
    name: 'afk',
    aliases: ['away'],
    category: 'moderation',
    description: 'Set your AFK status with optional reason',
    usage: 'afk [reason]',
    
    async execute(message, args, client) {
        // Get the reason (all args)
        const reason = args.join(' ') || 'No reason provided';
        
        try {
            // Send initial message with reaction options
            let afkPrompt = '```js\n';
            afkPrompt += `  Reason: ${reason}\n\n`;
            afkPrompt += '  Select AFK Type:\n';
            afkPrompt += '    🪐 = Global AFK\n';
            afkPrompt += '    🌐 = Server-only AFK\n\n';
            afkPrompt += '  Or reply with:\n';
            afkPrompt += '    1 = Global AFK\n';
            afkPrompt += '    2 = Server-only AFK\n';
            afkPrompt += '\n╰──────────────────────────────────╯\n```';
            
            const afkMsg = await message.channel.send(afkPrompt);
            
            // Add the reactions
            await afkMsg.react('🪐').catch(() => {}); // Global AFK
            await afkMsg.react('🌐').catch(() => {}); // Server-only AFK
            
            // Set up reaction collector
            const reactionFilter = (reaction, user) => {
                return ['🪐', '🌐'].includes(reaction.emoji.name) && user.id === message.author.id;
            };
            
            // Set up message reply collector
            const messageFilter = m => {
                return m.author.id === message.author.id && 
                       (m.content === '1' || m.content === '2');
            };
            
            // Wait for user's reaction (30 seconds timeout)
            const reactionCollector = afkMsg.createReactionCollector({ 
                filter: reactionFilter, 
                time: 30000, 
                max: 1 
            });
            
            // Wait for user's text reply (30 seconds timeout)
            const messageCollector = message.channel.createMessageCollector({ 
                filter: messageFilter, 
                time: 30000, 
                max: 1 
            });
            
            // Function to set AFK status
            const setAfkStatus = async (isGlobal, responseMsg = null) => {
                // Stop both collectors
                reactionCollector.stop();
                messageCollector.stop();
                
                const afkType = isGlobal ? 'Global' : 'Server-only';
                
                // Try to remove all reactions (silently ignore if no permissions)
                await afkMsg.reactions.removeAll().catch(() => {});
                
                // Delete user's response message if it exists
                if (responseMsg && responseMsg.deletable) {
                    await responseMsg.delete().catch(() => {});
                }
                
                // Set AFK start time
                const startTime = Date.now();
                
                // Store AFK data
                afkUsers.set(message.author.id, {
                    reason: reason,
                    startTime: startTime,
                    isGlobal: isGlobal,
                    serverId: message.guild?.id,
                    mentions: [],
                    username: message.author.username
                });
                
                // Send confirmation
                let confirmMsg = '```js\n';
                confirmMsg += `  ✅ You are now AFK\n`;
                confirmMsg += `  Reason: ${reason}\n`;
                confirmMsg += `  Type: ${afkType}\n`;
                confirmMsg += `  Started: ${new Date().toLocaleTimeString()}\n`;
                confirmMsg += '\n╰──────────────────────────────────╯\n```';
                
                await afkMsg.edit(confirmMsg);
                
                // Register message listener if not already registered
                if (!messageListenerRegistered) {
                    registerMessageListener(client);
                    messageListenerRegistered = true;
                }
            };
            
            // Handle reaction response
            reactionCollector.on('collect', async (reaction, user) => {
                const isGlobal = reaction.emoji.name === '🪐';
                await setAfkStatus(isGlobal);
            });
            
            // Handle message response
            messageCollector.on('collect', async (msg) => {
                const isGlobal = msg.content === '1';
                await setAfkStatus(isGlobal, msg);
            });
            
            // Handle timeout
            const handleEnd = async () => {
                if (reactionCollector.ended && messageCollector.ended) {
                    if (reactionCollector.collected.size === 0 && messageCollector.collected.size === 0) {
                        let cancelMsg = '```js\n';
                        cancelMsg += '  ❌ No option selected\n';
                        cancelMsg += '  Timeout after 30 seconds\n';
                        cancelMsg += '\n╰──────────────────────────────────╯\n```';
                        
                        await afkMsg.edit(cancelMsg);
                        
                        // Silently try to remove reactions
                        await afkMsg.reactions.removeAll().catch(() => {});
                    }
                }
            };
            
            reactionCollector.on('end', handleEnd);
            messageCollector.on('end', handleEnd);
            
        } catch (error) {
            console.error('[AFK] Error setting status:', error);
            await message.channel.send('``````');
        }
    }
};

// Register message listener for handling AFK responses and ending AFK
function registerMessageListener(client) {
    console.log('[AFK] Message listener registered');
    
    client.on('messageCreate', async (message) => {
        // Skip bot messages
        if (message.author.bot) return;
        
        const userId = message.author.id;
        const serverId = message.guild?.id;
        
        // Check if the user has an active AFK
        if (afkUsers.has(userId)) {
            const afkData = afkUsers.get(userId);
            
            // Check if the message is an AFK notification
            const isAfkNotification = message.content.includes('is currently AFK:') || 
                                     message.content.includes('AFK ACTIVE') ||
                                     message.content.includes('AFK ENDED');
            
            // For server-specific AFK, only end in the original server
            if (!afkData.isGlobal && serverId !== afkData.serverId) {
                return;
            }
            
            if (!isAfkNotification) {
                // End AFK session
                const endTime = Date.now();
                const duration = formatDuration(endTime - afkData.startTime);
                
                // Remove from AFK users
                afkUsers.delete(userId);
                
                // Send AFK end message
                let endMsg = '```js\n';
                endMsg += `  Welcome back, ${afkData.username}!\n`;
                endMsg += `  Reason: ${afkData.reason}\n`;
                endMsg += `  Duration: ${duration}\n`;
                endMsg += `  Mentions: ${afkData.mentions.length}\n`;
                endMsg += '\n╰──────────────────────────────────╯\n```';
                
                if (afkData.mentions.length > 0) {
                    endMsg += '\n**People who mentioned you:**\n';
                    afkData.mentions.slice(0, 5).forEach((mentionLink, index) => {
                        endMsg += `${index + 1}. ${mentionLink}\n`;
                    });
                    
                    if (afkData.mentions.length > 5) {
                        endMsg += `*...and ${afkData.mentions.length - 5} more*`;
                    }
                }
                
                await message.reply(endMsg).catch(() => {});
            }
        }
        
        // Check for mentions of AFK users
        if (message.mentions.users.size > 0) {
            for (const [mentionedId, mentionedUser] of message.mentions.users) {
                if (afkUsers.has(mentionedId)) {
                    const afkData = afkUsers.get(mentionedId);
                    
                    // For server-specific AFK, only respond in the original server
                    if (!afkData.isGlobal && serverId !== afkData.serverId) {
                        continue;
                    }
                    
                    // Calculate AFK duration
                    const duration = formatDuration(Date.now() - afkData.startTime);
                    
                    // Reply that the user is AFK
                    let afkNotification = '```js\n';
                    afkNotification += `  User: ${mentionedUser.username}\n`;
                    afkNotification += `  Reason: ${afkData.reason}\n`;
                    afkNotification += `  Duration: ${duration}\n`;
                    afkNotification += `  Type: ${afkData.isGlobal ? 'Global' : 'Server-only'}\n`;
                    afkNotification += '\n╰──────────────────────────────────╯\n```';
                    
                    await message.reply(afkNotification).catch(() => {});
                    
                    // Save the message link
                    const messageLink = `https://discord.com/channels/${message.guild?.id || '@me'}/${message.channel.id}/${message.id}`;
                    afkData.mentions.push(messageLink);
                }
            }
        }
    });
}

// Format duration in human-readable format
function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    
    return parts.join(' ');
}
