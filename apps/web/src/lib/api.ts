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

  protected get headers(): Record<string, string> {
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
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings`, {
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

      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${bookingId}/payment-proof`, {
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

export interface DayAvailability {
  date: string;
  status: 'available' | 'limited' | 'full' | 'past';
  slotsLeft: number;
}

export interface SavedAddress {
  id: string;
  city: string;
  addressLine: string;
  contactName: string;
  contactPhone: string;
  label?: string;
  isDefault: boolean;
}

export interface CreateAddressRequest {
  city: string;
  addressLine: string;
  contactName: string;
  contactPhone: string;
  label?: string;
  isDefault?: boolean;
}

class ApiClientExtended extends ApiClient {
  // Saved addresses
  async getSavedAddresses(): Promise<ApiResult<SavedAddress[]>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/addresses`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      const data: SavedAddress[] = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async createSavedAddress(address: CreateAddressRequest): Promise<ApiResult<SavedAddress>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/addresses`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(address),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      const data: SavedAddress = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async deleteSavedAddress(id: string): Promise<ApiResult<{ success: boolean }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/addresses/${id}`, {
        method: 'DELETE',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: { success: true } };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async setDefaultAddress(id: string): Promise<ApiResult<{ success: boolean }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/addresses/${id}/default`, {
        method: 'POST',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: { success: true } };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async getMonthlyAvailability(
    city: string,
    month: string,
    serviceCode: string
  ): Promise<ApiResult<DayAvailability[]>> {
    try {
      const params = new URLSearchParams({ city, month, serviceCode });
      const res = await fetch(`${API_BASE_URL}/api/v1/availability/monthly?${params}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      const data: DayAvailability[] = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  // ============ ADMIN API ============

  async getAdminRole(): Promise<ApiResult<{ role: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/role`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: await res.json() };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async getAdminStats(): Promise<ApiResult<{
    totalBookings: number;
    newBookings: number;
    awaitingPrepaymentBookings: number;
    prepaidBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
  }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/stats`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: await res.json() };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async getAdminBookings(status?: string): Promise<ApiResult<Array<{
    id: string;
    status: string;
    scheduledDate: string | null;
    createdAt: string;
    kitNumber: number | null;
    timeSlot: string | null;
    service: string | null;
    user: { telegramId: string; firstName: string } | null;
    address: { addressLine: string; contactName: string; contactPhone: string } | null;
  }>>> {
    try {
      const params = status ? new URLSearchParams({ status }) : '';
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/bookings${params ? `?${params}` : ''}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: await res.json() };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async confirmBooking(bookingId: string): Promise<ApiResult<{ success: boolean; userTelegramId: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/bookings/${bookingId}/confirm`, {
        method: 'POST',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: await res.json() };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async rejectBooking(bookingId: string): Promise<ApiResult<{ success: boolean; userTelegramId: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: await res.json() };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async deleteBooking(bookingId: string): Promise<ApiResult<{ success: boolean }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: await res.json() };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async exportBookings(period?: string): Promise<ApiResult<Blob>> {
    try {
      const params = period ? new URLSearchParams({ period }) : '';
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/export${params ? `?${params}` : ''}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: await res.blob() };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async getAdmins(): Promise<ApiResult<Array<{ id: string; telegramId: string; role: string }>>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/admins`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: await res.json() };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async addAdmin(telegramId: string): Promise<ApiResult<{ id: string; telegramId: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/admins`, {
        method: 'POST',
        headers: { ...this.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: await res.json() };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }

  async removeAdmin(telegramId: string): Promise<ApiResult<{ success: boolean }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/admins/${telegramId}`, {
        method: 'DELETE',
        headers: this.headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        return { ok: false, status: res.status, error: body.message ?? res.statusText };
      }

      return { ok: true, data: await res.json() };
    } catch (err) {
      return { ok: false, status: 0, error: (err as Error).message };
    }
  }
}

export const api = new ApiClientExtended();
