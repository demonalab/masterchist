export const config = {
  BOT_TOKEN: process.env.MAX_BOT_TOKEN || 'f9LHodD0cOLi8Xu4_SlmRdmAjOLg0eXXSP8P5aPbXMZSmiRyubE1fArbdEfwWUiU14SQVBUIrkNsvI3awzrL',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
  MAX_API_URL: 'https://platform-api.max.ru',
  WEBHOOK_URL: process.env.MAX_WEBHOOK_URL || '',
  PORT: parseInt(process.env.MAX_BOT_PORT || '3004', 10),
  ADMIN_USER_ID: process.env.MAX_ADMIN_USER_ID || '18782420',
};
