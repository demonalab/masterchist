import { config } from './config';

export interface TimeSlotAvailability {
  timeSlotId: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface BookingResponse {
  id: string;
  status: string;
  scheduledDate: string;
  timeSlot: {
    startTime: string;
    endTime: string;
  };
  kitNumber: number;
  address: {
    addressLine: string;
    contactName: string;
    contactPhone: string;
  };
  createdAt: string;
}

export interface BookingDetails {
  id: string;
  status: string;
  scheduledDate: string;
  createdAt: string;
  user: { telegramId: string; firstName: string };
  cleaningKit: { number: number } | null;
  timeSlot: { startTime: string; endTime: string } | null;
  address: { addressLine: string; contactName: string; contactPhone: string } | null;
  service: { code: string; name: string } | null;
}

export interface AdminActionResponse {
  id: string;
  status: string;
  userTelegramId: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

function buildInitData(telegramId: number, firstName?: string, username?: string): string {
  const user = JSON.stringify({
    id: telegramId,
    first_name: firstName ?? '',
    username: username ?? '',
  });
  const authDate = Math.floor(Date.now() / 1000);
  return `user=${encodeURIComponent(user)}&auth_date=${authDate}&hash=bot_direct`;
}

export class ApiClient {
  private baseUrl: string;
  private initData: string;

  constructor(telegramId: number, firstName?: string, username?: string) {
    this.baseUrl = config.API_BASE_URL;
    this.initData = buildInitData(telegramId, firstName, username);
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': this.initData,
    };
  }

  async getAvailability(
    city: string,
    scheduledDate: string,
    serviceCode: string
  ): Promise<ApiResult<TimeSlotAvailability[]>> {
    try {
      const params = new URLSearchParams({ city, scheduledDate, serviceCode });
      const res = await fetch(`${this.baseUrl}/api/v1/availability?${params}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      const data: TimeSlotAvailability[] = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async createBooking(body: {
    serviceCode: string;
    city: string;
    scheduledDate: string;
    timeSlotId: string;
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
  }): Promise<ApiResult<BookingResponse>> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/bookings`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: errBody.message ?? res.statusText };
      }

      const data: BookingResponse = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async uploadPaymentProof(
    bookingId: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<ApiResult<{ bookingId: string; status: string }>> {
    try {
      const formData = new FormData();
      formData.append('bookingId', bookingId);
      formData.append('file', new Blob([fileBuffer], { type: mimeType }), filename);

      const res = await fetch(`${this.baseUrl}/api/v1/payment-proofs`, {
        method: 'POST',
        headers: {
          'X-Telegram-Init-Data': this.initData,
        },
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: errBody.message ?? res.statusText };
      }

      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async getBooking(bookingId: string): Promise<ApiResult<BookingDetails>> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/bookings/${bookingId}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: errBody.message ?? res.statusText };
      }

      const data: BookingDetails = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async confirmBooking(bookingId: string): Promise<ApiResult<AdminActionResponse>> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/bookings/${bookingId}/confirm`, {
        method: 'PATCH',
        headers: this.headers,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: errBody.message ?? res.statusText };
      }

      const data: AdminActionResponse = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async rejectBooking(bookingId: string): Promise<ApiResult<AdminActionResponse>> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/bookings/${bookingId}/reject`, {
        method: 'PATCH',
        headers: this.headers,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: errBody.message ?? res.statusText };
      }

      const data: AdminActionResponse = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }
}
