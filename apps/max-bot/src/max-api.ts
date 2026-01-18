import { config } from './config';

interface MaxUser {
  user_id: number;
  name: string;
  username?: string;
  is_bot?: boolean;
}

interface MaxMessage {
  sender: MaxUser;
  recipient: { chat_id: number };
  timestamp: number;
  body: {
    mid: string;
    seq: number;
    text?: string;
  };
}

interface MaxCallbackUpdate {
  callback_id: string;
  timestamp: number;
  user: MaxUser;
  payload: string;
  message?: MaxMessage;
}

interface MaxUpdate {
  update_id: number;
  update_type: string;
  timestamp: number;
  message?: MaxMessage;
  callback?: MaxCallbackUpdate;
}

interface InlineButton {
  type: 'callback' | 'link' | 'message';
  text: string;
  payload?: string;
  url?: string;
}

interface InlineKeyboard {
  type: 'inline_keyboard';
  payload: {
    buttons: InlineButton[][];
  };
}

export class MaxApi {
  private baseUrl = config.MAX_API_URL;
  private token = config.BOT_TOKEN;

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.token,
    };
  }

  async getMe(): Promise<MaxUser> {
    const res = await fetch(`${this.baseUrl}/me`, {
      method: 'GET',
      headers: this.headers,
    });
    return res.json() as Promise<MaxUser>;
  }

  async getUpdates(marker?: number, timeout = 30): Promise<{ updates: MaxUpdate[]; marker?: number }> {
    const params = new URLSearchParams();
    if (marker) params.set('marker', String(marker));
    params.set('timeout', String(timeout));
    
    const res = await fetch(`${this.baseUrl}/updates?${params}`, {
      method: 'GET',
      headers: this.headers,
    });
    return res.json() as Promise<{ updates: MaxUpdate[]; marker?: number }>;
  }

  async sendMessage(chatId: number, text: string, keyboard?: InlineButton[][]): Promise<void> {
    const body: {
      text: string;
      format?: string;
      attachments?: InlineKeyboard[];
    } = {
      text,
      format: 'html',
    };

    if (keyboard && keyboard.length > 0) {
      body.attachments = [{
        type: 'inline_keyboard',
        payload: { buttons: keyboard },
      }];
    }

    const res = await fetch(`${this.baseUrl}/messages?chat_id=${chatId}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const err = await res.text();
      console.error('sendMessage error:', err);
    }
  }

  async sendPhoto(chatId: number, photoUrl: string, caption?: string): Promise<void> {
    const body = {
      chat_id: chatId,
      text: caption || '',
      format: 'html',
      attachments: [{
        type: 'image',
        payload: { url: photoUrl },
      }],
    };

    await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
  }

  async answerCallback(callbackId: string, text?: string): Promise<void> {
    await fetch(`${this.baseUrl}/answers`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        callback_id: callbackId,
        notification: text || '',
      }),
    });
  }
}

export type { MaxUpdate, MaxMessage, MaxUser, MaxCallbackUpdate, InlineButton };
