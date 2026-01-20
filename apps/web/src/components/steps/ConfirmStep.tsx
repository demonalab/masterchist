'use client';

import { useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { useTelegram } from '@/lib/telegram-provider';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { CaretLeft, Gift, Check, MapPin, CalendarBlank, Clock, User } from '@phosphor-icons/react';
import { useHaptic } from '@/lib/haptic';

export function ConfirmStep() {
  const { draft, setStep, setBooking, setError } = useBookingStore();
  const { initData, webApp } = useTelegram();
  const [loading, setLoading] = useState(false);
  const haptic = useHaptic();

  const handleConfirm = async () => {
    if (!draft.serviceCode || !draft.city || !draft.cityName || !draft.scheduledDate || 
        !draft.timeSlotId || !draft.street || !draft.house || !draft.contactName || !draft.contactPhone) {
      haptic.error();
      setError('Не все данные заполнены');
      return;
    }
    haptic.medium();
    setLoading(true);
    api.setInitData(initData);
    const result = await api.createBooking({
      serviceCode: draft.serviceCode, city: draft.city, scheduledDate: draft.scheduledDate,
      timeSlotId: draft.timeSlotId,
      address: { city: draft.cityName, street: draft.street, house: draft.house, apartment: draft.apartment },
      contact: { name: draft.contactName, phone: draft.contactPhone },
    });
    setLoading(false);
    if (!result.ok) {
      haptic.error();
      if (result.status === 409) { webApp?.showAlert('Слот уже занят'); setStep('time'); }
      else { setError(result.error); }
      return;
    }
    haptic.success();
    setBooking(result.data);
    setStep('success');
  };

  const handleBack = () => setStep('address');
  const addressLine = [draft.street, draft.house, draft.apartment].filter(Boolean).join(', ');
  const formattedDate = draft.scheduledDate 
    ? new Date(draft.scheduledDate).toLocaleDateString('ru', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';

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
        <p className="label-sm">Шаг 6 из 6</p>
        <h1 className="text-hero">
          Всё <span className="text-hero-accent">верно?</span>
        </h1>
      </motion.div>

      {/* Order summary */}
      <motion.div 
        className="glass-card-static p-5 mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <MapPin weight="duotone" className="w-5 h-5 text-accent-green" />
            <div className="flex-1">
              <p className="text-xs text-white/40">{draft.cityName}</p>
              <p className="text-sm text-white">{addressLine}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CalendarBlank weight="duotone" className="w-5 h-5 text-accent-purple" />
            <div className="flex-1">
              <p className="text-xs text-white/40">Дата и время</p>
              <p className="text-sm text-white capitalize">{formattedDate}, {draft.timeSlotLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User weight="duotone" className="w-5 h-5 text-accent-blue" />
            <div className="flex-1">
              <p className="text-xs text-white/40">Контакт</p>
              <p className="text-sm text-white">{draft.contactName}, {draft.contactPhone}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Price card */}
      <motion.div 
        className="glass-card-static p-5 border-accent-green/20 bg-accent-green/5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/40 text-sm">Итого</p>
            <p className="text-3xl font-bold text-accent-green">1 500 ₽</p>
          </div>
          <div className="text-right">
            <p className="text-white/30 line-through text-sm">2 500 ₽</p>
            <p className="text-accent-green text-sm font-medium">-40%</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-accent-green text-sm">
          <Gift weight="duotone" className="w-4 h-4" />
          <span>Сушилка и химия в подарок!</span>
        </div>
      </motion.div>

      {/* Button */}
      <div className="mt-auto pt-6">
        <motion.button
          onClick={handleConfirm}
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-2"
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <>
              <span className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
              Создаю...
            </>
          ) : (
            <>
              <Check weight="bold" className="w-5 h-5" />
              Подтвердить заказ
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
