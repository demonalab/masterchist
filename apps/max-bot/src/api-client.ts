import { config } from './config';

type ApiResult<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  status: number;
  error: string;
};

interface TimeSlotAvailability {
  slotId: string;
  slotCode: string;
  startTime: string;
  endTime: string;
  availableKits: number;
}

interface BookingResponse {
  id: string;
  status: string;
  scheduledDate: string;
  timeSlot: { startTime: string; endTime: string };
  kitNumber: number;
  address: { addressLine: string; contactName: string; contactPhone: string };
  createdAt: string;
}

interface UserBooking {
  id: string;
  status: string;
  scheduledDate: string | null;
  createdAt: string;
  kitNumber: number | null;
  timeSlot: string | null;
  service: string | null;
}

export class ApiClient {
  private baseUrl = config.API_BASE_URL;
  private initData: string;
  private headers: Record<string, string>;
  private userId: number;

  constructor(userId: number, firstName?: string, username?: string) {
    this.userId = userId;
    this.initData = Buffer.from(JSON.stringify({
      user: { id: userId, first_name: firstName, username },
    })).toString('base64');

    this.headers = {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': this.initData,
    };
  }

  async getAvailability(city: string, date: string): Promise<ApiResult<TimeSlotAvailability[]>> {
    try {
      // Public endpoint - no auth required
      const res = await fetch(
        `${this.baseUrl}/api/v1/availability?city=${city}&scheduledDate=${date}&serviceCode=self_cleaning`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }
      const data = await res.json() as any[];
      // Transform API response to match expected format
      const transformed: TimeSlotAvailability[] = data
        .filter(s => s.available)
        .map(s => ({
          slotId: s.timeSlotId,
          slotCode: s.timeSlotId,
          startTime: s.startTime,
          endTime: s.endTime,
          availableKits: s.availableKitNumber ? 1 : 0,
        }));
      return { ok: true, data: transformed };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async createBooking(body: {
    serviceCode: string;
    city: string;
    scheduledDate?: string;
    timeSlotId?: string;
    address: {
      city: string;
      street: string;
      house: string;
      apartment?: string;
    };
    contact: {
      name: string;
      phone: string;
    };
    proCleaningDetails?: string;
  }): Promise<ApiResult<BookingResponse>> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/bookings`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
        return { ok: false, status: res.status, error: errBody.message ?? res.statusText };
      }
      const data = await res.json() as BookingResponse;
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async getUserBookings(): Promise<ApiResult<UserBooking[]>> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/bookings`, {
        headers: this.headers,
      });
      if (!res.ok) {
        return { ok: false, status: res.status, error: 'Failed to fetch bookings' };
      }
      const data = await res.json() as UserBooking[];
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async trackConversationStart(serviceCode: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/v1/conversations/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: String(this.userId), serviceCode }),
      });
    } catch (err) {
      console.error('Failed to track conversation start:', err);
    }
  }

  async trackConversationComplete(serviceCode: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/v1/conversations/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: String(this.userId), serviceCode }),
      });
    } catch (err) {
      console.error('Failed to track conversation complete:', err);
    }
  }
}

export type { TimeSlotAvailability, BookingResponse, UserBooking };
