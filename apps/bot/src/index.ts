import { createBot } from './bot';
import { config } from './config';

async function main() {
  const bot = createBot();

  console.log(`Starting bot in ${config.NODE_ENV} mode...`);

  bot.start({
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} started successfully`);
    },
  });
}

main().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
