'use client';

import { useEffect, useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { useTelegram } from '@/lib/telegram-provider';
import { api, TimeSlotAvailability } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Package, CheckCircle, XCircle } from 'lucide-react';

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
    setTimeout(() => setStep('address'), 300);
  };

  const handleBack = () => {
    setStep('date');
  };

  const availableSlots = slots.filter((s) => s.available);

  return (
    <motion.div 
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="mb-6">
        <motion.button 
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </motion.button>
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
        <motion.div 
          className="card-premium text-center py-12"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="text-5xl mb-4">😔</div>
          <h3 className="text-xl font-semibold text-white mb-2">Нет свободных слотов</h3>
          <p className="text-gray-400 mb-6">На выбранную дату все наборы заняты</p>
          <button onClick={handleBack} className="btn-primary">
            Выбрать другую дату
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {slots.map((slot, index) => (
            <motion.button
              key={slot.timeSlotId}
              onClick={() => handleSelect(slot)}
              disabled={!slot.available}
              className={`card-premium flex items-center gap-4 text-left
                ${slot.available ? '' : 'opacity-40 cursor-not-allowed'}
                ${selectedSlot === slot.timeSlotId ? 'ring-2 ring-purple-500 bg-purple-500/20' : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={slot.available ? { scale: 1.02 } : {}}
              whileTap={slot.available ? { scale: 0.98 } : {}}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center
                ${slot.available 
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20' 
                  : 'bg-red-500/10'}`}
              >
                {slot.available ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
              </div>
              
              <div className="flex-1">
                <div className={`text-lg font-semibold ${slot.available ? 'text-white' : 'text-gray-500 line-through'}`}>
                  {slot.startTime} - {slot.endTime}
                </div>
                {slot.available && slot.availableKitNumber && (
                  <div className="flex items-center gap-1 text-sm text-purple-400 mt-1">
                    <Package className="w-3 h-3" />
                    <span>Набор №{slot.availableKitNumber}</span>
                  </div>
                )}
                {!slot.available && (
                  <div className="text-xs text-gray-500 mt-1">Занято</div>
                )}
              </div>

              {slot.available && (
                <div className="text-purple-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Info */}
      <motion.div 
        className="mt-auto pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>Аренда на 24 часа</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
