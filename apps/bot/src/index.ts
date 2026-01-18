import { webhookCallback } from 'grammy';
import { createServer } from 'http';
import { createBot } from './bot';
import { config } from './config';
import { startReminderCron } from './services/reminder';

const WEBAPP_URL = 'https://xn--80akjnwedee1c.xn--p1ai';

async function main() {
  const bot = createBot();

  const useWebhook = config.WEBHOOK_DOMAIN && config.WEBHOOK_PORT;

  if (useWebhook) {
    console.log(`Starting bot in webhook mode...`);
    console.log(`Webhook: https://${config.WEBHOOK_DOMAIN}/bot/webhook`);

    // Set Menu Button for Mini App
    try {
      await bot.api.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: '📱 Открыть приложение',
          web_app: { url: WEBAPP_URL }
        }
      });
      console.log('Menu button set successfully');
    } catch (err) {
      console.log('Failed to set menu button:', err);
    }

    // Register webhook with Telegram
    try {
      await bot.api.setWebhook(`https://${config.WEBHOOK_DOMAIN}/bot/webhook`);
      console.log('Webhook registered with Telegram');
    } catch (err) {
      console.log('Failed to set webhook:', err);
    }

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
      startReminderCron(bot);
    });
  } else {
    console.log(`Starting bot in polling mode...`);

    // Set Menu Button for Mini App
    try {
      await bot.api.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: '📱 Открыть приложение',
          web_app: { url: WEBAPP_URL }
        }
      });
      console.log('Menu button set successfully');
    } catch (err) {
      console.log('Failed to set menu button:', err);
    }

    bot.start({
      onStart: (botInfo) => {
        console.log(`Bot @${botInfo.username} started successfully (polling)`);
        startReminderCron(bot);
      },
    });
  }
}

main().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
