import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadCommands(client, commandsPath) {
    const categories = fs.readdirSync(commandsPath).filter(file => {
        return fs.statSync(path.join(commandsPath, file)).isDirectory();
    });

    for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(categoryPath, file);
            
            try {
                // Dynamic import with file:// protocol for proper ESM loading
                const command = await import(`file://${filePath}`);
                const cmd = command.default;
                
                if (cmd && cmd.name) {
                    client.commands.set(cmd.name, cmd);
                    
                    // Register aliases
                    if (cmd.aliases && Array.isArray(cmd.aliases)) {
                        cmd.aliases.forEach(alias => {
                            client.aliases.set(alias, cmd.name);
                        });
                    }
                }
            } catch (error) {
                console.error(`Error loading command from ${file}:`, error);
            }
        }
    }
}

export function reloadCommand(client, commandName, commandsPath) {
    const command = client.commands.get(commandName);
    
    if (!command) {
        return { success: false, message: 'Command not found' };
    }
    
    // Remove from collections
    client.commands.delete(commandName);
    
    if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach(alias => {
            client.aliases.delete(alias);
        });
    }
    
    // Clear module cache (ESM doesn't cache like CommonJS, but we track it)
    return { success: true, message: `Command ${commandName} unloaded` };
}

export function getCommandInfo(client, commandName) {
    const command = client.commands.get(commandName) || 
                   client.commands.get(client.aliases.get(commandName));
    
    if (!command) {
        return null;
    }
    
    return {
        name: command.name,
        aliases: command.aliases || [],
        category: command.category || 'uncategorized',
        description: command.description || 'No description',
        usage: command.usage || command.name
    };
}

export function getAllCommands(client) {
    return Array.from(client.commands.values());
}

export function getCommandsByCategory(client, category) {
    const commands = Array.from(client.commands.values());
    return commands.filter(cmd => cmd.category === category);
}

export function getCategories(client) {
    const commands = Array.from(client.commands.values());
    const categories = new Set();
    
    commands.forEach(cmd => {
        if (cmd.category) {
            categories.add(cmd.category);
        }
    });
    
    return Array.from(categories).sort();
}
