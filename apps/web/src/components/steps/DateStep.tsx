'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { DayPicker, DayProps } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import { format, addDays, startOfMonth, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarBlank, CaretLeft, Check, Circle } from '@phosphor-icons/react';
import { api, DayAvailability } from '@/lib/api';
import 'react-day-picker/dist/style.css';

export function DateStep() {
  const { draft, updateDraft, setStep } = useBookingStore();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Map<string, DayAvailability>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch availability for current month
  const fetchAvailability = useCallback(async (monthDate: Date) => {
    if (!draft.city) return;
    
    setLoading(true);
    const monthStr = format(monthDate, 'yyyy-MM');
    const result = await api.getMonthlyAvailability(draft.city, monthStr, 'self_cleaning');
    
    if (result.ok) {
      const map = new Map<string, DayAvailability>();
      for (const day of result.data) {
        map.set(day.date, day);
      }
      setAvailability(map);
    }
    setLoading(false);
  }, [draft.city]);

  useEffect(() => {
    fetchAvailability(month);
  }, [month, fetchAvailability]);

  const handleBack = () => setStep('city');
  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayInfo = availability.get(dateStr);
    
    // Don't allow selecting full or past days
    if (dayInfo?.status === 'full' || dayInfo?.status === 'past') {
      return;
    }
    
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

  // Custom day render with availability colors
  const getDayClassName = (date: Date): string => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayInfo = availability.get(dateStr);
    
    if (!dayInfo) return '';
    
    switch (dayInfo.status) {
      case 'available':
        return 'day-available';
      case 'limited':
        return 'day-limited';
      case 'full':
        return 'day-full';
      case 'past':
        return 'day-past';
      default:
        return '';
    }
  };

  const modifiers = {
    available: (date: Date) => availability.get(format(date, 'yyyy-MM-dd'))?.status === 'available',
    limited: (date: Date) => availability.get(format(date, 'yyyy-MM-dd'))?.status === 'limited',
    full: (date: Date) => availability.get(format(date, 'yyyy-MM-dd'))?.status === 'full',
  };

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
          .rdp-day { color: white; border-radius: 10px; font-weight: 500; transition: all 0.2s; position: relative; }
          .rdp-day:hover:not(.rdp-day_disabled):not(.rdp-day_selected):not(.rdp-day_full) { background: rgba(255,255,255,0.08); }
          .rdp-day_selected { background: #22c55e !important; color: black !important; font-weight: 600; }
          .rdp-day_disabled { color: rgba(255,255,255,0.2); }
          .rdp-day_today { border: 1px solid rgba(34,197,94,0.5); }
          
          /* Availability colors */
          .rdp-day_available { background: rgba(34, 197, 94, 0.15); }
          .rdp-day_available:hover { background: rgba(34, 197, 94, 0.25) !important; }
          .rdp-day_limited { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
          .rdp-day_limited:hover { background: rgba(251, 191, 36, 0.3) !important; }
          .rdp-day_full { background: rgba(239, 68, 68, 0.15); color: rgba(255,255,255,0.3); cursor: not-allowed; }
        `}</style>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
          </div>
        ) : (
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={disabledDays}
            locale={ru}
            showOutsideDays={false}
            month={month}
            onMonthChange={setMonth}
            modifiers={modifiers}
            modifiersClassNames={{
              available: 'rdp-day_available',
              limited: 'rdp-day_limited',
              full: 'rdp-day_full',
            }}
          />
        )}
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500/30" />
            <span className="text-xs text-white/50">Свободно</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
            <span className="text-xs text-white/50">Мало мест</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/30" />
            <span className="text-xs text-white/50">Занято</span>
          </div>
        </div>
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
