import { conversationHistory } from './chat.js';

export default {
  name: 'aiclear',
  aliases: ['clearai', 'resetai'],
  category: 'ai',
  description: 'Clear AI conversation history for this channel',
  usage: 'aiclear',

  async execute(message, args, client) {
    const channelId = message.channel.id;
    conversationHistory.delete(channelId);

    await message.channel.send([
      '```',
      '╭─[ HISTORY CLEARED ]─╮\n',
      '  Conversation history cleared.',
      '  Starting a fresh conversation.',
      '\n╰──────────────────────────────────╯',
      '```',
    ].join('\n'));
  },
};
