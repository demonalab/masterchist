import { config } from './config';

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

async function sendMessageToUser(userId: string, text: string) {
  try {
    const res = await fetch(`${config.MAX_API_URL}/messages?user_id=${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': config.BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, format: 'html' }),
    });
    if (!res.ok) {
      console.error('Failed to send reminder:', await res.text());
    }
  } catch (err) {
    console.error('Failed to send reminder to user:', err);
  }
}

export async function sendReminders(): Promise<void> {
  try {
    // Get conversations needing 2h reminder
    const res2h = await fetch(`${API_BASE_URL}/api/v1/conversations/reminders/2h`);
    if (res2h.ok) {
      const conversations = (await res2h.json()) as AbandonedConversation[];
      for (const conv of conversations) {
        try {
          const serviceName = SERVICE_NAMES[conv.serviceCode] || conv.serviceCode;
          await sendMessageToUser(
            conv.telegramId,
            `👋 Привет! Вы начали оформлять заявку на "${serviceName}", но не завершили её.\n\nХотите продолжить? Откройте приложение и завершите заказ! 📱`
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
            await sendMessageToUser(
              conv.telegramId,
              `🌞 Добрый день! Напоминаем, что вы вчера начали оформлять заявку на "${serviceName}".\n\nМы будем рады помочь вам! Откройте приложение для завершения заказа. 📱`
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

export function startReminderCron(): void {
  // Check every 10 minutes
  setInterval(() => {
    sendReminders().catch(console.error);
  }, 10 * 60 * 1000);

  // Initial check after 1 minute
  setTimeout(() => {
    sendReminders().catch(console.error);
  }, 60 * 1000);

  console.log('MAX Bot reminder cron started (every 10 minutes)');
}
