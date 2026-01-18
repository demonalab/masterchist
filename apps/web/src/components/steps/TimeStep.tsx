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
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

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
    setSelectedSlot(slot.timeSlotId);
    updateDraft({
      timeSlotId: slot.timeSlotId,
      timeSlotLabel: `${slot.startTime} - ${slot.endTime}`,
    });
    // Auto-continue after selection
    setTimeout(() => setStep('address'), 300);
  };

  const handleBack = () => {
    setStep('date');
  };

  const availableSlots = slots.filter((s) => s.available);

  return (
    <div className="screen">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <span>←</span>
          <span>Назад</span>
        </button>
        <h1 className="screen-title">Выберите время</h1>
        <p className="screen-subtitle">
          {draft.scheduledDate && new Date(draft.scheduledDate).toLocaleDateString('ru', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
          <p className="text-gray-400 mt-4">Загружаем доступные слоты...</p>
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="card-premium text-center py-12 animate-fade-in">
          <div className="text-5xl mb-4">😔</div>
          <h3 className="text-xl font-semibold text-white mb-2">Нет свободных слотов</h3>
          <p className="text-gray-400 mb-6">На выбранную дату все наборы заняты</p>
          <button onClick={handleBack} className="btn-primary">
            Выбрать другую дату
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {slots.map((slot, index) => (
            <button
              key={slot.timeSlotId}
              onClick={() => handleSelect(slot)}
              disabled={!slot.available}
              className={`card-premium text-center py-5 animate-scale-in
                ${slot.available ? 'hover:scale-[1.02]' : 'opacity-30 cursor-not-allowed'}
                ${selectedSlot === slot.timeSlotId ? 'ring-2 ring-purple-500 bg-purple-500/20' : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center
                ${slot.available 
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400' 
                  : 'bg-red-500/10 text-red-400'}`}
              >
                <span className="text-lg">{slot.available ? '✓' : '✕'}</span>
              </div>
              <div className={`text-lg font-semibold ${slot.available ? 'text-white' : 'text-gray-500 line-through'}`}>
                {slot.startTime} - {slot.endTime}
              </div>
              {slot.available && (
                <div className="text-xs text-gray-500 mt-1">Набор доступен</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-auto pt-8">
        <div className="card text-center">
          <div className="text-gray-400 text-sm">
            <span>⏰</span> Аренда на 24 часа
          </div>
        </div>
      </div>
    </div>
  );
}
