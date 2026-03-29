export default {
  name: 'ltc',
  aliases: ['litecoin', 'ltcwallet'],
  category: 'utility',
  description: 'Send Litecoin wallet address',
  usage: 'ltc',
  async execute(message, args, client) {
    // Replace with your actual LTC address
    const ltcAddress = 'wcgwucbwcbwbwlblscwlcbwlcwblcwblcwblcw';

    let response = '```js\n';
    response += `  ${ltcAddress}\n\n`;
    response += '  💰 Litecoin (LTC)\n';
    await message.channel.send(response);
  }
};
