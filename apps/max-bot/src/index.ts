import { createBot } from './bot';
import { startReminderCron } from './reminder';

const bot = createBot();

console.log('MAX Bot starting with official library...');
bot.start().catch(console.error);

// Start reminder cron
startReminderCron();
