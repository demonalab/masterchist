import { webhookCallback } from 'grammy';
import { createServer } from 'http';
import { createBot } from './bot';
import { config } from './config';

async function main() {
  const bot = createBot();

  const useWebhook = config.WEBHOOK_DOMAIN && config.WEBHOOK_PORT;

  if (useWebhook) {
    console.log(`Starting bot in webhook mode...`);
    console.log(`Webhook: https://${config.WEBHOOK_DOMAIN}/bot/webhook`);

    const handleUpdate = webhookCallback(bot, 'http');

    const server = createServer(async (req, res) => {
      if (req.method === 'POST' && req.url === '/webhook') {
        try {
          await handleUpdate(req, res);
        } catch (err) {
          console.error('Webhook error:', err);
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      } else if (req.method === 'GET' && req.url === '/health') {
        res.statusCode = 200;
        res.end('OK');
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    });

    const port = parseInt(config.WEBHOOK_PORT || '3003', 10);
    server.listen(port, () => {
      console.log(`Bot webhook server listening on port ${port}`);
    });
  } else {
    console.log(`Starting bot in polling mode...`);

    bot.start({
      onStart: (botInfo) => {
        console.log(`Bot @${botInfo.username} started successfully (polling)`);
      },
    });
  }
}

main().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
