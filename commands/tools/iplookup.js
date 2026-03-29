import fetch from 'node-fetch';

export default {
  name: 'iplookup',
  aliases: ['ip', 'ipinfo', 'lookup'],
  category: 'tools',
  description: 'Lookup IP or domain information',
  usage: 'iplookup <ip/domain>',
  async execute(message, args, client) {
    if (!args[0]) {
      await message.channel.send('``````');
      return;
    }

    const target = args[0];

    try {
      // Using ip-api.com for IP lookup
      const response = await fetch(`http://ip-api.com/json/${target}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
      
      if (!response.ok) {
        await message.channel.send('``````');
      }

      const data = await response.json();

      if (data.status === 'fail') {
        await message.channel.send(`\`\`\`js\n❌ ${data.message || 'Invalid IP or domain'}\n\`\`\``);
        return;
      }

      let result = '```js\n';
      result += `  IP: ${data.query}\n\n`;
      result += `  Location:\n`;
      result += `    Country: ${data.country} (${data.countryCode})\n`;
      result += `    Region: ${data.regionName} (${data.region})\n`;
      result += `    City: ${data.city}\n`;
      result += `    ZIP: ${data.zip || 'N/A'}\n\n`;
      result += `  Coordinates:\n`;
      result += `    Latitude: ${data.lat}\n`;
      result += `    Longitude: ${data.lon}\n\n`;
      result += `  Network:\n`;
      result += `    ISP: ${data.isp}\n`;
      result += `    Organization: ${data.org}\n`;
      result += `    AS: ${data.as}\n\n`;
      result += `  Timezone: ${data.timezone}\n`;
      result += '\n╰──────────────────────────────────╯\n```';

      await message.channel.send(result);

    } catch (error) {
      console.error('[IP Lookup Error]:', error);
      await message.channel.send('``````');
    }
  }
};
