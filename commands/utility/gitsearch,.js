import fetch from 'node-fetch';

export default {
  name: 'gitsearch',
  aliases: ['github', 'ghsearch', 'gs'],
  category: 'utility',
  description: 'Search GitHub repositories',
  usage: 'gitsearch <keyword> [results]',
  async execute(message, args, client) {
    if (!args[0]) {
      await message.channel.send('``````');
      return;
    }

    // Get search keyword and number of results
    let resultCount = 1;
    const lastArg = args[args.length - 1];
    
    // Check if last argument is a number
    if (!isNaN(lastArg) && parseInt(lastArg) > 0) {
      resultCount = Math.min(parseInt(lastArg), 10); // Max 10 results
      args.pop(); // Remove the number from args
    }
    
    const keyword = args.join(' ');

    try {
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(keyword)}&sort=stars&order=desc&per_page=${resultCount}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Discord-Selfbot'
          }
        }
      );

      if (!response.ok) {
        await message.channel.send('``````');
        return;
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        await message.channel.send('``````');
        return;
      }

      let output = '```js\n';
      output += `  Query: ${keyword}\n`;
      output += `  Results: ${data.items.length}\n\n`;

      data.items.forEach((repo, index) => {
        const stars = repo.stargazers_count;
        const forks = repo.forks_count;
        const language = repo.language || 'Unknown';
        
        output += `  [${index + 1}] ${repo.full_name}\n`;
        output += `      ⭐ ${stars} | 🍴 ${forks} | 💻 ${language}\n`;
        output += `      ${repo.description ? repo.description.substring(0, 60) : 'No description'}${repo.description && repo.description.length > 60 ? '...' : ''}\n`;
        output += `      ${repo.html_url}\n\n`;
      });

      output += '╰──────────────────────────────────╯\n```';

      // Add hidden link to first repo
      if (data.items[0]) {
        output += `[.](${data.items[0].owner.avatar_url})`;
      }

      await message.channel.send(output);

    } catch (err) {
      console.error('[GitHub Search Error]:', err);
      await message.channel.send('``````');
    }
  }
};
