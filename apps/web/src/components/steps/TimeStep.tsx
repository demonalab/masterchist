'use client';

import { useEffect, useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { useTelegram } from '@/lib/telegram-provider';
import { api, TimeSlotAvailability } from '@/lib/api';

export function TimeStep() {
  const { draft, updateDraft, setStep, setError } = useBookingStore();
  const { initData } = useTelegram();
  const [slots, setSlots] = useState<TimeSlotAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSlots() {
      if (!draft.city || !draft.scheduledDate || !draft.serviceCode) return;

      api.setInitData(initData);
      const result = await api.getAvailability(
        draft.city,
        draft.scheduledDate,
        draft.serviceCode
      );

      setLoading(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSlots(result.data);
    }

    loadSlots();
  }, [draft.city, draft.scheduledDate, draft.serviceCode, initData, setError]);

  const handleSelect = (slot: TimeSlotAvailability) => {
    if (!slot.available) return;
    updateDraft({
      timeSlotId: slot.timeSlotId,
      timeSlotLabel: `${slot.startTime} - ${slot.endTime}`,
    });
    setStep('address');
  };

  const handleBack = () => {
    setStep('date');
  };

  const availableSlots = slots.filter((s) => s.available);

  return (
    <div className="screen">
      <h1 className="screen-title">Выберите время</h1>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tg-button" />
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-tg-hint">Нет свободных слотов на эту дату</p>
          <button onClick={handleBack} className="btn-primary mt-4">
            Выбрать другую дату
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {slots.map((slot) => (
            <button
              key={slot.timeSlotId}
              onClick={() => handleSelect(slot)}
              disabled={!slot.available}
              className={`card text-center py-4 ${
                slot.available
                  ? 'cursor-pointer active:scale-[0.98]'
                  : 'opacity-50 cursor-not-allowed line-through'
              }`}
            >
              <span className="text-lg">{slot.available ? '✅' : '❌'}</span>
              <div className="font-medium mt-1">
                {slot.startTime} - {slot.endTime}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4">
        <button onClick={handleBack} className="btn-secondary">
          ← Назад
        </button>
      </div>
    </div>
  );
}
