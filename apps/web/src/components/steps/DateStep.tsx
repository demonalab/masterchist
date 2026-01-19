'use client';

import { useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { DayPicker } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import { format, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarBlank, CaretLeft, Check } from '@phosphor-icons/react';
import 'react-day-picker/dist/style.css';

export function DateStep() {
  const { updateDraft, setStep } = useBookingStore();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [error, setError] = useState('');

  const handleBack = () => setStep('city');
  const handleSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setError('');
  };
  const handleContinue = () => {
    if (!selectedDate) {
      setError('Выберите дату');
      return;
    }
    updateDraft({ scheduledDate: format(selectedDate, 'yyyy-MM-dd') });
    setStep('time');
  };

  const today = new Date();
  const disabledDays = { before: addDays(today, 1) };

  return (
    <div className="screen relative overflow-hidden">
      <div className="floating-glow bg-accent-purple top-60 -left-20 animate-glow-pulse" />

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
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="label-sm">Шаг 3 из 6</p>
        <h1 className="text-hero">
          Когда <span className="text-hero-accent">удобно?</span>
        </h1>
      </motion.div>

      {/* Calendar */}
      <motion.div 
        className="glass-card-static p-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <style>{`
          .rdp { --rdp-cell-size: 42px; --rdp-accent-color: #22c55e; margin: 0; }
          .rdp-months { justify-content: center; }
          .rdp-caption { padding: 0 0 12px 0; }
          .rdp-caption_label { font-size: 1rem; font-weight: 600; color: white; text-transform: capitalize; }
          .rdp-nav_button { color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.05); border-radius: 10px; width: 32px; height: 32px; }
          .rdp-nav_button:hover { background: rgba(255,255,255,0.1); }
          .rdp-head_cell { color: rgba(255,255,255,0.4); font-weight: 500; font-size: 0.7rem; text-transform: uppercase; }
          .rdp-cell { padding: 2px; }
          .rdp-day { color: white; border-radius: 10px; font-weight: 500; transition: all 0.2s; }
          .rdp-day:hover:not(.rdp-day_disabled):not(.rdp-day_selected) { background: rgba(255,255,255,0.08); }
          .rdp-day_selected { background: #22c55e !important; color: black !important; font-weight: 600; }
          .rdp-day_disabled { color: rgba(255,255,255,0.2); }
          .rdp-day_today { border: 1px solid rgba(34,197,94,0.5); }
        `}</style>
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={disabledDays}
          locale={ru}
          showOutsideDays={false}
        />
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div 
            className="glass-card-static p-4 border-accent-red/30 text-accent-red text-center text-sm mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div 
            className="glass-card-static p-4 flex items-center gap-3 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="icon-box w-10 h-10">
              <CalendarBlank weight="duotone" className="w-5 h-5 text-accent-green" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-white/40">Выбрано</p>
              <p className="font-medium text-white capitalize">
                {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
              </p>
            </div>
            <Check weight="bold" className="w-5 h-5 text-accent-green" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <div className="mt-auto pt-4">
        <motion.button
          onClick={handleContinue}
          disabled={!selectedDate}
          className="btn-primary"
          whileTap={{ scale: 0.98 }}
        >
          Продолжить
        </motion.button>
      </div>
    </div>
  );
}
