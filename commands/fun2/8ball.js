export default {
  name: '8ball',
  aliases: ['8b', 'eightball'],
  category: 'fun2',
  description: 'Ask the magic 8ball a question',
  usage: '8ball <question>',
  async execute(message, args, client) {
    if (args.length === 0) {
      await message.channel.send('``````');
      return;
    }

    const responses = [
      'Yes, definitely!',
      'It is certain.',
      'Without a doubt.',
      'Most likely.',
      'Outlook good.',
      'Yes.',
      'Signs point to yes.',
      'Reply hazy, try again.',
      'Ask again later.',
      'Better not tell you now.',
      'Cannot predict now.',
      'Concentrate and ask again.',
      'Don\'t count on it.',
      'My reply is no.',
      'My sources say no.',
      'Outlook not so good.',
      'Very doubtful.',
      'Absolutely not.',
      'No way!',
      'Definitely not.'
    ];

    const question = args.join(' ');
    const answer = responses[Math.floor(Math.random() * responses.length)];

    let response = '```js\n';
    response += '╭─[ MAGIC 8BALL ]─╮\n\n';
    response += `  ❓ ${question}\n\n`;
    response += `  🎱 ${answer}\n`;
    response += '\n╰──────────────────────────────────╯\n```';

    await message.channel.send(response);
  }
};
