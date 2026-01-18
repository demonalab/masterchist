import { Bot } from 'grammy';
import { BotContext } from '../types';
import { config } from '../config';

const API_BASE_URL = config.API_BASE_URL;

interface AbandonedConversation {
  id: string;
  telegramId: string;
  serviceCode: string;
  startedAt: string;
  reminder2hSent: boolean;
  reminderNextDay: boolean;
}

const SERVICE_NAMES: Record<string, string> = {
  self_cleaning: 'Химчистка (самообслуживание)',
  pro_cleaning: 'Проф. химчистка',
  cleaning: 'Клининг',
};

export async function startConversationTracking(telegramId: number, serviceCode: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/conversations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: String(telegramId), serviceCode }),
    });
  } catch (err) {
    console.error('Failed to track conversation start:', err);
  }
}

export async function completeConversationTracking(telegramId: number, serviceCode: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/conversations/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: String(telegramId), serviceCode }),
    });
  } catch (err) {
    console.error('Failed to track conversation completion:', err);
  }
}

export async function sendReminders(bot: Bot<BotContext>): Promise<void> {
  try {
    // Get conversations needing 2h reminder
    const res2h = await fetch(`${API_BASE_URL}/api/v1/conversations/reminders/2h`);
    if (res2h.ok) {
      const conversations = (await res2h.json()) as AbandonedConversation[];
      for (const conv of conversations) {
        try {
          const serviceName = SERVICE_NAMES[conv.serviceCode] || conv.serviceCode;
          await bot.api.sendMessage(
            conv.telegramId,
            `👋 Привет! Вы начали оформлять заявку на "${serviceName}", но не завершили её.\n\nХотите продолжить? Просто нажмите на нужную услугу в меню! 👇`
          );
          // Mark as sent
          await fetch(`${API_BASE_URL}/api/v1/conversations/${conv.id}/mark-2h-sent`, { method: 'POST' });
        } catch (err) {
          console.error(`Failed to send 2h reminder to ${conv.telegramId}:`, err);
        }
      }
    }

    // Get conversations needing next day reminder (check if it's around 12:00)
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 11 && hour <= 13) {
      const resNextDay = await fetch(`${API_BASE_URL}/api/v1/conversations/reminders/next-day`);
      if (resNextDay.ok) {
        const conversations = (await resNextDay.json()) as AbandonedConversation[];
        for (const conv of conversations) {
          try {
            const serviceName = SERVICE_NAMES[conv.serviceCode] || conv.serviceCode;
            await bot.api.sendMessage(
              conv.telegramId,
              `🌞 Добрый день! Напоминаем, что вы вчера начали оформлять заявку на "${serviceName}".\n\nМы будем рады помочь вам! Нажмите на услугу в меню, чтобы продолжить. 👇`
            );
            // Mark as sent
            await fetch(`${API_BASE_URL}/api/v1/conversations/${conv.id}/mark-next-day-sent`, { method: 'POST' });
          } catch (err) {
            console.error(`Failed to send next day reminder to ${conv.telegramId}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to send reminders:', err);
  }
}

export function startReminderCron(bot: Bot<BotContext>): void {
  // Check every 10 minutes
  setInterval(() => {
    sendReminders(bot).catch(console.error);
  }, 10 * 60 * 1000);

  // Initial check after 1 minute
  setTimeout(() => {
    sendReminders(bot).catch(console.error);
  }, 60 * 1000);

  console.log('Reminder cron started (every 10 minutes)');
}
