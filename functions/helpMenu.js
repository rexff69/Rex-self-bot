export function generateHelpMenu(client, category = null) {
    const commands = Array.from(client.commands.values());
    
    // If no category specified, show homepage with categories
    if (!category) {
        return generateHomepage(client, commands);
    }
    
    // Show specific category
    const filtered = commands.filter(cmd => cmd.category && cmd.category.toLowerCase() === category.toLowerCase());
    
    if (filtered.length === 0) {
        return generateHomepage(client, commands, `Category "${category}" not found!`);
    }
    
    return generateCategoryHelp(filtered, category);
}

function generateHomepage(client, commands, errorMsg = null) {
    // Group commands by category
    const categories = {};
    commands.forEach(cmd => {
        const cat = cmd.category || 'uncategorized';
        if (!categories[cat]) {
            categories[cat] = [];
        }
        categories[cat].push(cmd);
    });

    let helpText = '```js\n';
    helpText += '╭─[ NEONIX SELFBOT ]─╮\n\n';
    
    if (errorMsg) {
        helpText += `  ❌ ${errorMsg}\n\n`;
    }
    
    helpText += '  📚 Available Categories:\n\n';
    
    let index = 1;
    Object.keys(categories).sort().forEach(cat => {
        const count = categories[cat].length;
        const paddedIndex = `[${index}]`.padEnd(6);
        const paddedCat = cat.toUpperCase().padEnd(15);
        
        helpText += `  ${paddedIndex}${paddedCat}(${count} commands)\n`;
        index++;
    });
    
    helpText += '\n  💡 Usage:\n';
    helpText += `     ${process.env.PREFIX}help <category>\n`;
    helpText += '     Example: help utility\n';
    
    helpText += '\n╰──────────────────────────────────╯\n';
    helpText += '```';
    
    return helpText;
}

function generateCategoryHelp(commands, categoryName) {
    let helpText = '```js\n';
    helpText += `╭─[ ${categoryName.toUpperCase()} COMMANDS ]─╮\n\n`;
    
    commands.forEach((cmd, idx) => {
        const aliases = cmd.aliases && cmd.aliases.length > 0 
            ? `/${cmd.aliases.join('/')}` 
            : '';
        const name = `<${cmd.name}${aliases}>`;
        const paddedIndex = `[${idx + 1}]`.padEnd(6);
        const paddedName = name.padEnd(22);
        
        helpText += `  ${paddedIndex}${paddedName}- "${cmd.description}"\n`;
    });
    
    helpText += '\n  💡 Tip:\n';
    helpText += `     Use ${process.env.PREFIX}help to see all categories\n`;
    
    helpText += '\n╰──────────────────────────────────╯\n';
    helpText += '```';
    
    return helpText;
}
