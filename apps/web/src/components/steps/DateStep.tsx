'use client';

import { useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { DayPicker } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import { format, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ArrowLeft } from 'lucide-react';
import 'react-day-picker/dist/style.css';

export function DateStep() {
  const { updateDraft, setStep } = useBookingStore();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [error, setError] = useState('');

  const handleBack = () => {
    setStep('city');
  };

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
    <motion.div 
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
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
        <h1 className="screen-title">Выберите дату</h1>
        <p className="screen-subtitle">Когда вам удобно получить набор?</p>
      </div>

      {/* Calendar */}
      <motion.div 
        className="card-premium mb-6 overflow-hidden"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <style>{`
          .rdp {
            --rdp-cell-size: 44px;
            --rdp-accent-color: #7c3aed;
            --rdp-background-color: rgba(124, 58, 237, 0.2);
            margin: 0;
          }
          .rdp-months {
            justify-content: center;
          }
          .rdp-month {
            background: transparent;
          }
          .rdp-caption {
            padding: 0 0 16px 0;
          }
          .rdp-caption_label {
            font-size: 1.1rem;
            font-weight: 600;
            color: white;
            text-transform: capitalize;
          }
          .rdp-nav_button {
            color: #a78bfa;
            background: rgba(124, 58, 237, 0.1);
            border-radius: 12px;
            width: 36px;
            height: 36px;
          }
          .rdp-nav_button:hover {
            background: rgba(124, 58, 237, 0.2);
          }
          .rdp-head_cell {
            color: #9ca3af;
            font-weight: 500;
            font-size: 0.75rem;
            text-transform: uppercase;
          }
          .rdp-cell {
            padding: 2px;
          }
          .rdp-day {
            color: white;
            border-radius: 12px;
            font-weight: 500;
            transition: all 0.2s;
          }
          .rdp-day:hover:not(.rdp-day_disabled):not(.rdp-day_selected) {
            background: rgba(255, 255, 255, 0.1);
          }
          .rdp-day_selected {
            background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%) !important;
            color: white !important;
            font-weight: 600;
          }
          .rdp-day_disabled {
            color: #4b5563;
            opacity: 0.4;
          }
          .rdp-day_today {
            border: 2px solid #a78bfa;
            font-weight: 700;
          }
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
            className="card bg-red-500/10 border-red-500/30 text-red-400 text-center mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected date info */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div 
            className="card mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="icon-circle-gold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Выбранная дата</div>
                <div className="font-semibold text-white">
                  {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue button */}
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
    </motion.div>
  );
}
