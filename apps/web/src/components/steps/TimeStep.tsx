'use client';

import { useEffect, useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { useTelegram } from '@/lib/telegram-provider';
import { api, TimeSlotAvailability } from '@/lib/api';
import { motion } from 'framer-motion';
import { CaretLeft, Clock, CheckCircle, XCircle, CaretRight } from '@phosphor-icons/react';
import { useHaptic } from '@/lib/haptic';

export function TimeStep() {
  const { draft, updateDraft, setStep, setError } = useBookingStore();
  const { initData } = useTelegram();
  const [slots, setSlots] = useState<TimeSlotAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const haptic = useHaptic();

  useEffect(() => {
    async function loadSlots() {
      if (!draft.city || !draft.scheduledDate || !draft.serviceCode) return;
      api.setInitData(initData);
      const result = await api.getAvailability(draft.city, draft.scheduledDate, draft.serviceCode);
      setLoading(false);
      if (!result.ok) { setError(result.error); return; }
      setSlots(result.data);
    }
    loadSlots();
  }, [draft.city, draft.scheduledDate, draft.serviceCode, initData, setError]);

  const handleSelect = (slot: TimeSlotAvailability) => {
    if (!slot.available) return;
    haptic.selection();
    setSelectedSlot(slot.timeSlotId);
    updateDraft({ timeSlotId: slot.timeSlotId, timeSlotLabel: `${slot.startTime} - ${slot.endTime}` });
    setTimeout(() => setStep('address'), 300);
  };

  const handleBack = () => setStep('date');
  const availableSlots = slots.filter((s) => s.available);

  return (
    <div className="screen relative overflow-hidden">
      <div className="floating-glow bg-accent-green top-40 -right-20 animate-glow-pulse" />

      {/* Back */}
      <motion.button 
        onClick={handleBack}
        className="btn-ghost flex items-center gap-2 -ml-4 mb-6"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileTap={{ scale: 0.95 }}
      >
        <CaretLeft weight="bold" className="w-4 h-4" />
        <span>Назад</span>
      </motion.button>

      {/* Hero */}
      <motion.div className="mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-sm">Шаг 4 из 6</p>
        <h1 className="text-hero">
          Выберите <span className="text-hero-accent">время доставки</span>
        </h1>
        {draft.scheduledDate && (
          <p className="text-white/40 mt-2 capitalize">
            {new Date(draft.scheduledDate).toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        )}
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-accent-green/30 border-t-accent-green animate-spin" />
          <p className="text-white/40 mt-4 text-sm">Загружаем слоты...</p>
        </div>
      ) : availableSlots.length === 0 ? (
        <motion.div className="glass-card-static text-center py-12 px-6" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="text-4xl mb-4">😔</div>
          <h3 className="text-lg font-semibold text-white mb-2">Нет свободных слотов</h3>
          <p className="text-white/40 text-sm mb-6">На эту дату все наборы заняты</p>
          <button onClick={handleBack} className="btn-primary">Другая дата</button>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {slots.map((slot, index) => (
            <motion.button
              key={slot.timeSlotId}
              onClick={() => handleSelect(slot)}
              disabled={!slot.available}
              className={`glass-card p-4 flex items-center gap-4 text-left
                ${!slot.available ? 'opacity-40 cursor-not-allowed hover:bg-white/[0.03]' : ''}
                ${selectedSlot === slot.timeSlotId ? 'border-accent-green bg-accent-green/10' : ''}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={slot.available ? { scale: 0.98 } : {}}
            >
              <div className={`icon-box ${slot.available ? 'bg-accent-green/10 border-accent-green/20' : 'bg-accent-red/10 border-accent-red/20'}`}>
                {slot.available ? (
                  <CheckCircle weight="duotone" className="w-5 h-5 text-accent-green" />
                ) : (
                  <XCircle weight="duotone" className="w-5 h-5 text-accent-red" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${slot.available ? 'text-white' : 'text-white/30 line-through'}`}>
                  {slot.startTime} – {slot.endTime}
                </p>
                                {!slot.available && <p className="text-xs text-white/20 mt-1">Занято</p>}
              </div>
              {slot.available && <CaretRight weight="bold" className="w-5 h-5 text-white/30" />}
            </motion.button>
          ))}
        </div>
      )}

      {/* Info */}
      <motion.div className="mt-auto pt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div className="glass-card-static p-4 flex items-center justify-center gap-2 text-white/40 text-sm">
          <Clock weight="duotone" className="w-4 h-4" />
          <span>Аренда на 24 часа</span>
        </div>
      </motion.div>
    </div>
  );
}
