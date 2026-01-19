const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface TimeSlotAvailability {
  timeSlotId: string;
  startTime: string;
  endTime: string;
  available: boolean;
  availableKitNumber?: number;
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

export interface CreateBookingRequest {
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
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

class ApiClient {
  private initData: string = '';

  setInitData(initData: string) {
    this.initData = initData;
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
      const res = await fetch(`${API_BASE_URL}/api/v1/availability?${params}`, {
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

  async createBooking(body: CreateBookingRequest): Promise<ApiResult<BookingResponse>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings`, {
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
}

export const api = new ApiClient();
