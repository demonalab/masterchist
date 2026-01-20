'use client';

import { create } from 'zustand';
import { BookingResponse } from './api';

export type BookingStep =
  | 'service'
  | 'city'
  | 'date'
  | 'time'
  | 'address'
  | 'confirm'
  | 'success'
  | 'orders'
  | 'help'
  | 'profile'
  | 'pro_cleaning';

export interface BookingDraft {
  serviceCode?: string;
  city?: string;
  cityName?: string;
  scheduledDate?: string;
  timeSlotId?: string;
  timeSlotLabel?: string;
  street?: string;
  house?: string;
  apartment?: string;
  contactName?: string;
  contactPhone?: string;
}

interface BookingStore {
  step: BookingStep;
  draft: BookingDraft;
  booking: BookingResponse | null;
  error: string | null;
  loading: boolean;

  setStep: (step: BookingStep) => void;
  updateDraft: (data: Partial<BookingDraft>) => void;
  setBooking: (booking: BookingResponse) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  step: 'service' as BookingStep,
  draft: {},
  booking: null,
  error: null,
  loading: false,
};

export const useBookingStore = create<BookingStore>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  updateDraft: (data) =>
    set((state) => ({
      draft: { ...state.draft, ...data },
    })),

  setBooking: (booking) => set({ booking }),

  setError: (error) => set({ error }),

  setLoading: (loading) => set({ loading }),

  reset: () => set(initialState),
}));
