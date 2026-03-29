export default {
  name: 'shutdown',
  aliases: ['stop', 'exit'],
  category: 'utility',
  description: 'Shutdown the bot (Owner only)',
  usage: 'shutdown',
  async execute(message, args, client) {
    // Only owner can use this command
    if (message.author.id !== process.env.OWNER_ID) {
      await message.channel.send('``````');
      return;
    }

    let response = '```js\n';
    response += '  ⚠️ Bot shutting down...\n';
    response += '  👋 Goodbye!\n';
    response += '\n╰──────────────────────────────────╯\n```';

    await message.channel.send(response);

    console.log('[Shutdown] Bot shutting down by owner command');
    
    // Wait a moment for the message to send
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
};
