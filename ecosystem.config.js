module.exports = {
  apps: [
    {
      name: 'bot',
      script: 'apps/bot/dist/index.js',
      env: {
        NODE_ENV: 'production',
        BOT_TOKEN: process.env.BOT_TOKEN,
        API_BASE_URL: 'http://localhost:3001',
        ADMIN_TELEGRAM_ID: process.env.ADMIN_TELEGRAM_ID,
        WEBHOOK_DOMAIN: 'xn--80akjnwedee1c.xn--p1ai',
        WEBHOOK_PORT: '3003'
      }
    },
    {
      name: 'api',
      script: 'apps/api/dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0',
        DATABASE_URL: process.env.DATABASE_URL,
        BOT_TOKEN: process.env.BOT_TOKEN,
        ADMIN_TELEGRAM_ID: process.env.ADMIN_TELEGRAM_ID
      }
    },
    {
      name: 'web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      cwd: './apps/web',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'http://localhost:3001'
      }
    }
  ]
};
