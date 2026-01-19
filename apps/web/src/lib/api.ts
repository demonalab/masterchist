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

export interface MyBooking {
  id: string;
  status: string;
  scheduledDate: string;
  timeSlot: string;
  kitNumber?: number;
  service?: string;
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
  private devMode: boolean = false;

  setInitData(initData: string) {
    this.initData = initData;
  }

  setDevMode(enabled: boolean) {
    this.devMode = enabled;
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.devMode) {
      h['X-Dev-Mode'] = '1';
    } else if (this.initData) {
      h['X-Telegram-Init-Data'] = this.initData;
    }
    return h;
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

  async getMyBookings(): Promise<ApiResult<MyBooking[]>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/my`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      const data: MyBooking[] = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async uploadReceipt(bookingId: string, file: File): Promise<ApiResult<{ message: string }>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (this.devMode) {
        headers['X-Dev-Mode'] = '1';
      } else if (this.initData) {
        headers['X-Telegram-Init-Data'] = this.initData;
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${bookingId}/receipt`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async getPendingBooking(): Promise<ApiResult<BookingResponse | null>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/pending`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!res.ok) {
        if (res.status === 404) {
          return { ok: true, data: null };
        }
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      const data: BookingResponse = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }
}

export const api = new ApiClient();
