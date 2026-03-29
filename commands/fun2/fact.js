import fetch from 'node-fetch';

export default {
  name: 'fact',
  aliases: ['randomfact', 'funfact'],
  category: 'fun2',
  description: 'Get a random fun fact',
  usage: 'fact',
  async execute(message, args, client) {
    try {
      const response = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
      const data = await response.json();

      let factResponse = '```js\n';
      factResponse += '╭─[ RANDOM FACT ]─╮\n\n';
      factResponse += `  ${data.text}\n`;
      factResponse += '\n╰──────────────────────────────────╯\n```';

      await message.channel.send(factResponse);
    } catch (error) {
      console.error('[Fact Error]:', error);
      await message.channel.send('``````');
    }
  }
};
