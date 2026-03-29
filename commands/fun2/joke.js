import fetch from 'node-fetch';

export default {
  name: 'joke',
  aliases: ['jokes', 'dadjoke'],
  category: 'fun2',
  description: 'Get a random joke',
  usage: 'joke',
  async execute(message, args, client) {
    try {
      const response = await fetch('https://official-joke-api.appspot.com/random_joke');
      const data = await response.json();

      let jokeResponse = '```js\n';
      jokeResponse += '╭─[ RANDOM JOKE ]─╮\n\n';
      jokeResponse += `  ${data.setup}\n\n`;
      jokeResponse += `  ${data.punchline} 😄\n`;
      jokeResponse += '\n╰──────────────────────────────────╯\n```';

      await message.channel.send(jokeResponse);
    } catch (error) {
      console.error('[Joke Error]:', error);
      await message.channel.send('``````');
    }
  }
};
