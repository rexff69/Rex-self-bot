export default {
  name: 'coinflip',
  aliases: ['flip', 'coin'],
  category: 'fun2',
  description: 'Flip a coin',
  usage: 'coinflip',
  async execute(message, args, client) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '🪙' : '💿';

    let response = '```js\n';
    response += '╭─[ COIN FLIP ]─╮\n\n';
    response += `  ${emoji} Result: ${result}!\n`;
    response += '\n╰──────────────────────────────────╯\n```';

    await message.channel.send(response);
  }
};
