import { createBot } from './bot';

const bot = createBot();

console.log('MAX Bot starting with official library...');
bot.start().catch(console.error);
