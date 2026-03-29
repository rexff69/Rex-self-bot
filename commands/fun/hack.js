import fetch from 'node-fetch';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
  name: 'hack',
  aliases: ['hax'],
  category: 'fun',
  description: 'Prank hack a user (joke command)',
  usage: 'hack <@user|userID>',
  async execute(message, args, client) {
    let target;
    let targetId;
    
    if (message.mentions.users.size > 0) {
      target = message.mentions.users.first();
      targetId = target.id;
    } else if (args[0]) {
      targetId = args[0];
      try {
        target = await client.users.fetch(targetId);
      } catch {
        await message.channel.send('``````');
        return;
      }
    } else {
      await message.channel.send('``````');
      return;
    }

    const hackingStages = [
      `\`[▓░░░░░░░░░] 10%\` Finding Discord login...`,
      `\`[▓▓░░░░░░░░] 20%\` Found: ${target.tag}`,
      `\`[▓▓▓░░░░░░░] 30%\` Fetching user data...`,
      `\`[▓▓▓▓░░░░░░] 40%\` Accessing email protocols...`,
      `\`[▓▓▓▓▓░░░░░] 50%\` Email found: ${target.username}@gmail.com`,
      `\`[▓▓▓▓▓▓░░░░] 60%\` Injecting trojan virus...`,
      `\`[▓▓▓▓▓▓▓░░░] 70%\` Virus injected successfully!`,
      `\`[▓▓▓▓▓▓▓▓░░] 80%\` Retrieving password...`,
      `\`[▓▓▓▓▓▓▓▓▓░] 90%\` Password: ${generateFakePassword()}`,
      `\`[▓▓▓▓▓▓▓▓▓▓] 100%\` Hack complete!`
    ];

    let hackMsg = await message.channel.send('``````');

    for (const stage of hackingStages) {
      await delay(1500);
      await hackMsg.edit(stage);
    }

    await delay(1000);

    // Fetch real user data from API
    try {
      const response = await fetch(`https://user.inosuke-za-smoker.workers.dev/?id=${targetId}`);
      
      if (!response.ok) {
        throw new Error('API request failed');
      }

      const userData = await response.json();

      let finalMsg = '```js\n';
      finalMsg += '```js\n';
      finalMsg += JSON.stringify(userData, null, 2);
      finalMsg += '\n```';

      await hackMsg.edit(finalMsg);

    } catch (err) {
      console.error('[Hack API Error]:', err);

      // Fallback if API fails
      let finalMsg = '```js\n';
      finalMsg += `  ✅ Successfully hacked: ${target.tag}\n`;
      finalMsg += `  📧 Email: ${target.username}@gmail.com\n`;
      finalMsg += `  🔑 Password: ${generateFakePassword()}\n`;
      finalMsg += `  📱 IP Address: ${generateFakeIP()}\n`;
      finalMsg += `  🌍 Location: ${generateFakeLocation()}\n\n`;
      finalMsg += '  ⚠️ THIS IS A JOKE! No actual hacking occurred.\n';
      finalMsg += '  ⚠️ (API data unavailable)\n';
      finalMsg += '\n╰──────────────────────────────────╯\n```';

      await hackMsg.edit(finalMsg);
    }
  }
};

// Helper functions for fake data
function generateFakePassword() {
  const words = ['Dragon', 'Shadow', 'Lightning', 'Thunder', 'Phoenix', 'Galaxy', 'Storm', 'Crystal'];
  const numbers = Math.floor(Math.random() * 9999);
  return `${words[Math.floor(Math.random() * words.length)]}${numbers}!`;
}

function generateFakeIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function generateFakeLocation() {
  const cities = [
    'New York, USA',
    'London, UK',
    'Tokyo, Japan',
    'Paris, France',
    'Berlin, Germany',
    'Sydney, Australia',
    'Mumbai, India',
    'Toronto, Canada'
  ];
  return cities[Math.floor(Math.random() * cities.length)];
}
