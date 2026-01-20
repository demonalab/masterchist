import { createBot } from './bot';
import { startReminderCron } from './reminder';

const bot = createBot();

console.log('MAX Bot starting with official library...');

// Mini App URL is configured manually in MAX platform panel at platform.max.ru
// URL: https://xn--80akjnwedee1c.xn--p1ai

bot.start().catch(console.error);

// Start reminder cron
startReminderCron();
