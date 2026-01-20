import { createBot } from './bot';
import { startReminderCron } from './reminder';
import { config } from './config';

const WEBAPP_URL = 'https://xn--80akjnwedee1c.xn--p1ai';

async function setMiniApp() {
  try {
    console.log('Setting Mini App URL:', WEBAPP_URL);
    // Try to set mini app via API
    const res = await fetch(`${config.MAX_API_URL}/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': config.BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mini_app: { url: WEBAPP_URL },
      }),
    });
    const text = await res.text();
    console.log('Mini App config response:', res.status, text);
  } catch (err) {
    console.error('Failed to set Mini App:', err);
  }
}

const bot = createBot();

console.log('MAX Bot starting with official library...');
bot.start().then(() => {
  setMiniApp();
}).catch(console.error);

// Start reminder cron
startReminderCron();
