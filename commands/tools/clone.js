import https from 'https';

// Helper Functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');
                const mimeType = res.headers['content-type'] || 'image/png';
                resolve(`data:${mimeType};base64,${base64}`);
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

// ServerCloner Class
class ServerCloner {
    constructor(client) {
        this.client = client;
        this.roleMapping = new Map();
        this.stats = {
            rolesCreated: 0,
            categoriesCreated: 0,
            channelsCreated: 0,
            emojisCreated: 0,
            failed: 0
        };
    }

    log(message) {
        console.log(`[Clone] ${message}`);
    }

    async cloneServer(sourceGuildId, targetGuildId, cloneEmojis = true) {
        const sourceGuild = this.client.guilds.cache.get(sourceGuildId);
        const targetGuild = this.client.guilds.cache.get(targetGuildId);

        if (!sourceGuild) throw new Error('Source server not found.');
        if (!targetGuild) throw new Error('Target server not found.');

        this.log(`Starting clone: ${sourceGuild.name} -> ${targetGuild.name}`);
        
        await this.deleteExistingContent(targetGuild);
        await this.cloneRoles(sourceGuild, targetGuild);
        await this.cloneCategories(sourceGuild, targetGuild);
        await this.cloneChannels(sourceGuild, targetGuild);
        if (cloneEmojis) await this.cloneEmojis(sourceGuild, targetGuild);
        await this.cloneServerInfo(sourceGuild, targetGuild);

        this.showStats();
        this.log('Server cloning completed!');
        
        return this.stats;
    }

    async deleteExistingContent(guild) {
        this.log('Deleting existing content...');
        
        for (const [, channel] of guild.channels.cache) {
            try {
                await channel.delete('Server clone cleanup');
                await delay(100);
            } catch (err) {
                this.log(`Failed to delete channel: ${err.message}`);
                this.stats.failed++;
            }
        }
        
        for (const [, role] of guild.roles.cache.filter(r => r.editable && !r.managed)) {
            try {
                await role.delete('Server clone cleanup');
                await delay(100);
            } catch (err) {
                this.log(`Failed to delete role: ${err.message}`);
                this.stats.failed++;
            }
        }
        
        this.log('Cleanup complete.');
    }
    
    async cloneRoles(sourceGuild, targetGuild) {
        this.log('Cloning roles...');
        const roles = sourceGuild.roles.cache
            .filter(r => r.name !== '@everyone')
            .sort((a, b) => a.position - b.position);
        
        for (const [, role] of roles) {
            try {
                const newRole = await targetGuild.roles.create({
                    name: role.name,
                    color: role.color,
                    permissions: role.permissions,
                    hoist: role.hoist,
                    mentionable: role.mentionable
                });
                
                this.roleMapping.set(role.id, newRole.id);
                this.log(`✓ Created role: ${role.name}`);
                this.stats.rolesCreated++;
                await delay(200);
            } catch (err) {
                this.log(`✗ Failed to create role ${role.name}: ${err.message}`);
                this.stats.failed++;
            }
        }
        
        await this.fixRolePositions(sourceGuild, targetGuild);
    }
    
    async fixRolePositions(sourceGuild, targetGuild) {
        this.log('Fixing role positions...');
        const roles = sourceGuild.roles.cache
            .filter(r => r.name !== '@everyone')
            .sort((a, b) => b.position - a.position);
        
        for (const [, role] of roles) {
            const newRole = targetGuild.roles.cache.find(r => r.name === role.name);
            if (newRole && newRole.editable) {
                try {
                    await newRole.setPosition(role.position);
                    await delay(100);
                } catch (err) {
                    this.log(`Failed to set position for role ${role.name}`);
                }
            }
        }
    }

    async cloneCategories(sourceGuild, targetGuild) {
        this.log('Cloning categories...');
        const categories = sourceGuild.channels.cache
            .filter(ch => ch.type === 4)
            .sort((a, b) => a.position - b.position);
        
        for (const [, category] of categories) {
            try {
                const overwrites = this.mapPermissionOverwrites(category.permissionOverwrites, targetGuild);
                await targetGuild.channels.create({
                    name: category.name,
                    type: 4,
                    permissionOverwrites: overwrites,
                    position: category.position
                });
                
                this.log(`✓ Created category: ${category.name}`);
                this.stats.categoriesCreated++;
                await delay(200);
            } catch (err) {
                this.log(`✗ Failed to create category ${category.name}: ${err.message}`);
                this.stats.failed++;
            }
        }
    }

    async cloneChannels(sourceGuild, targetGuild) {
        this.log('Cloning channels...');
        const channels = sourceGuild.channels.cache
            .filter(ch => ch.type === 0 || ch.type === 2)
            .sort((a, b) => a.position - b.position);
        
        for (const [, channel] of channels) {
            try {
                const overwrites = this.mapPermissionOverwrites(channel.permissionOverwrites, targetGuild);
                const parent = channel.parent 
                    ? targetGuild.channels.cache.find(c => c.name === channel.parent.name && c.type === 4) 
                    : null;
                
                const options = {
                    name: channel.name,
                    type: channel.type,
                    permissionOverwrites: overwrites,
                    position: channel.position,
                    parent: parent?.id,
                    topic: channel.topic,
                    nsfw: channel.nsfw,
                    rateLimitPerUser: channel.rateLimitPerUser,
                    bitrate: channel.bitrate,
                    userLimit: channel.userLimit
                };
                
                await targetGuild.channels.create(options);
                this.log(`✓ Created channel: ${channel.name}`);
                this.stats.channelsCreated++;
                await delay(200);
            } catch (err) {
                this.log(`✗ Failed to create channel ${channel.name}: ${err.message}`);
                this.stats.failed++;
            }
        }
    }

    async cloneEmojis(sourceGuild, targetGuild) {
        this.log('Cloning emojis...');
        
        for (const [, emoji] of sourceGuild.emojis.cache) {
            try {
                const img = await downloadImage(emoji.url);
                await targetGuild.emojis.create({
                    attachment: img,
                    name: emoji.name
                });
                
                this.log(`✓ Created emoji: ${emoji.name}`);
                this.stats.emojisCreated++;
                await delay(2000);
            } catch (err) {
                this.log(`✗ Failed to create emoji ${emoji.name}: ${err.message}`);
                this.stats.failed++;
            }
        }
    }

    async cloneServerInfo(sourceGuild, targetGuild) {
        this.log('Cloning server info...');
        
        try {
            if (sourceGuild.iconURL()) {
                const iconData = await downloadImage(sourceGuild.iconURL({ format: 'png', size: 1024 }));
                await targetGuild.setIcon(iconData);
            }
            
            await targetGuild.setName(sourceGuild.name);
            this.log('✓ Updated server name and icon');
        } catch (err) {
            this.log(`✗ Failed to update server info: ${err.message}`);
            this.stats.failed++;
        }
    }
    
    mapPermissionOverwrites(overwrites, targetGuild) {
        return overwrites.cache.map(ow => {
            let id = ow.id;
            
            if (ow.type === 0) {
                const sourceRole = ow.channel.guild.roles.cache.get(id);
                if (!sourceRole) return null;
                
                const newRole = targetGuild.roles.cache.find(r => r.name === sourceRole.name);
                if (!newRole) return null;
                
                id = newRole.id;
            }
            
            return {
                id,
                type: ow.type,
                allow: ow.allow.bitfield.toString(),
                deny: ow.deny.bitfield.toString()
            };
        }).filter(Boolean);
    }
    
    showStats() {
        const total = this.stats.rolesCreated + this.stats.categoriesCreated + 
                     this.stats.channelsCreated + this.stats.emojisCreated;
        const successRate = total + this.stats.failed > 0 
            ? Math.round((total / (total + this.stats.failed)) * 100) 
            : 0;
        
        console.log('\n╭─[ CLONE STATISTICS ]─╮');
        console.log(`  Roles: ${this.stats.rolesCreated}`);
        console.log(`  Categories: ${this.stats.categoriesCreated}`);
        console.log(`  Channels: ${this.stats.channelsCreated}`);
        console.log(`  Emojis: ${this.stats.emojisCreated}`);
        console.log(`  Failures: ${this.stats.failed}`);
        console.log(`  Success Rate: ${successRate}%`);
        console.log('╰──────────────────────────────────╯\n');
    }
}

// Export pending operations map so index.js can access it
export const pendingCloneOperations = new Map();

export default {
    name: 'clone',
    aliases: ['serverclone', 'cloneserver'],
    category: 'tools',
    description: 'Clone a server structure, roles, and channels',
    usage: 'clone <source_id> <target_id>',
    
    async execute(message, args, client) {
        const [sourceGuildId, targetGuildId] = args;
        
        if (!sourceGuildId || !targetGuildId) {
            let response = '```js\n';
            response += '  Usage:\n';
            response += '    clone <source_id> <target_id>\n\n';
            response += '  Example:\n';
            response += '    clone 123456789 987654321\n\n';
            response += '  Warning:\n';
            response += '    This will DELETE ALL content\n';
            response += '    on the target server!\n';
            response += '\n╰──────────────────────────────────╯\n```';
            await message.channel.send(response);
            return;
        }

        const sourceGuild = client.guilds.cache.get(sourceGuildId);
        const targetGuild = client.guilds.cache.get(targetGuildId);

        if (!sourceGuild) {
            await message.channel.send(`\`\`\`js\n❌ Source server not found: ${sourceGuildId}\n\`\`\``);
            return;
        }
        
        if (!targetGuild) {
            await message.channel.send(`\`\`\`js\n❌ Target server not found: ${targetGuildId}\n\`\`\``);
            return;
        }

        // Store pending operation
        pendingCloneOperations.set(message.author.id, {
            step: 'confirmProceed',
            sourceGuildId,
            targetGuildId,
            channelId: message.channel.id
        });

        let response = '```js\n';
        response += `  Source: ${sourceGuild.name}\n`;
        response += `  Target: ${targetGuild.name}\n\n`;
        response += '  ⚠️ WARNING:\n';
        response += '    This will DELETE ALL content\n';
        response += '    on the target server!\n\n';
        response += '  Proceed? (y/n)\n';
        response += '\n╰──────────────────────────────────╯\n```';

        await message.channel.send(response);
        
        // Set timeout to clear pending operation after 60 seconds
        setTimeout(() => {
            if (pendingCloneOperations.has(message.author.id)) {
                pendingCloneOperations.delete(message.author.id);
                message.channel.send('``````').catch(() => {});
            }
        }, 60000);
    },
    
    // Function to handle clone execution
    async executeClone(client, channel, sourceGuildId, targetGuildId, cloneEmojis) {
        await channel.send('``````');
        
        const cloner = new ServerCloner(client);
        try {
            const stats = await cloner.cloneServer(sourceGuildId, targetGuildId, cloneEmojis);
            
            let response = '```js\n';
            response += `  ✅ Roles: ${stats.rolesCreated}\n`;
            response += `  ✅ Categories: ${stats.categoriesCreated}\n`;
            response += `  ✅ Channels: ${stats.channelsCreated}\n`;
            response += `  ✅ Emojis: ${stats.emojisCreated}\n`;
            response += `  ❌ Failures: ${stats.failed}\n`;
            response += '\n╰──────────────────────────────────╯\n```';
            
            await channel.send(response);
        } catch (err) {
            console.error('[Clone Error]:', err);
            await channel.send(`\`\`\`js\n❌ Clone failed: ${err.message}\n\`\`\``);
        }
    }
};
