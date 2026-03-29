import figlet from 'figlet';
import { promisify } from 'util';

// Convert figlet.text to a Promise
const figletPromise = promisify(figlet.text);

export default {
    name: 'ascii',
    aliases: ['asciigen', 'text2ascii'],
    category: 'tools',
    description: 'Generate ASCII art from text',
    usage: 'ascii <text>',
    
    async execute(message, args, client) {
        // Check if text is provided
        if (args.length === 0) {
            let response = '```js\n';
            response += '╭─[ ASCII ART ]─╮\n\n';
            response += '  Usage:\n';
            response += '    ascii <text>\n\n';
            response += '  Examples:\n';
            response += '    ascii Hello\n';
            response += '    ascii Neonix\n\n';
            response += '  Note: Max 15 characters\n';
            response += '\n╰──────────────────────────────────╯\n```';
            await message.channel.send(response);
            return;
        }

        // Get the text from the args
        const text = args.join(' ');
        
        // Limit text length to prevent issues
        if (text.length > 15) {
            await message.channel.send('``````');
            return;
        }
        
        try {
            // Send initial processing message
            const processingMsg = await message.channel.send('``````');
            
            // Generate ASCII art using figlet with the default font
            const asciiArt = await figletPromise(text);
            
            // Format the response with a code block
            const formattedResponse = `\`\`\`\n${asciiArt}\n\`\`\``;
            
            // Check if response is too long for Discord
            if (formattedResponse.length > 2000) {
                await processingMsg.edit('``````');
                return;
            }
            
            // Update the processing message with the result
            await processingMsg.edit(formattedResponse);
            
            console.log(`[ASCII] Generated art for: "${text}"`);
            
        } catch (error) {
            console.error('[ASCII] Error:', error);
            await message.channel.send('``````');
        }
    }
};
