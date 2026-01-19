'use client';

import { useBookingStore } from '@/lib/booking-store';
import { useTelegram } from '@/lib/telegram-provider';
import { motion } from 'framer-motion';
import { CheckCircle, Package, CalendarBlank, Clock, MapPin, CreditCard, Camera, Copy } from '@phosphor-icons/react';

export function SuccessStep() {
  const { booking, reset } = useBookingStore();
  const { webApp } = useTelegram();

  const handleClose = () => { reset(); webApp?.close(); };
  const handleNewBooking = () => { reset(); };

  if (!booking) {
    return (
      <div className="screen items-center justify-center">
        <div className="glass-card-static text-center p-8">
          <p className="text-white/40">Ошибка: данные не найдены</p>
        </div>
      </div>
    );
  }

  const formattedDate = booking.scheduledDate 
    ? new Date(booking.scheduledDate).toLocaleDateString('ru', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';

  return (
    <div className="screen relative overflow-hidden">
      <div className="floating-glow bg-accent-green top-20 left-1/2 -translate-x-1/2 animate-glow-pulse" />

      {/* Success header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent-green mb-5">
          <CheckCircle weight="fill" className="w-10 h-10 text-black" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Заказ создан!</h1>
        <p className="text-white/40 text-sm">ID: {booking.id.slice(0, 8).toUpperCase()}</p>
      </motion.div>

      {/* Order card */}
      <motion.div 
        className="glass-card-static p-5 mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="badge-green">
            <Package weight="duotone" className="w-3 h-3" />
            Набор #{booking.kitNumber}
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <CalendarBlank weight="duotone" className="w-4 h-4 text-white/40" />
            <span className="text-white capitalize">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock weight="duotone" className="w-4 h-4 text-white/40" />
            <span className="text-white">{booking.timeSlot.startTime} – {booking.timeSlot.endTime}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin weight="duotone" className="w-4 h-4 text-white/40" />
            <span className="text-white">{booking.address.addressLine}</span>
          </div>
        </div>
      </motion.div>

      {/* Payment */}
      <motion.div 
        className="glass-card-static p-5 mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <CreditCard weight="duotone" className="w-5 h-5 text-accent-blue" />
          <p className="font-medium text-white">Оплата</p>
        </div>

        <div className="text-center mb-4 py-3 bg-white/5 rounded-2xl">
          <p className="text-3xl font-bold text-accent-green">1 500 ₽</p>
          <p className="text-xs text-white/40 mt-1">Предоплата за аренду</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 text-sm">₽</div>
            <div className="flex-1">
              <p className="text-xs text-white/40">Сбербанк</p>
              <p className="text-sm text-white font-mono">1234 5678 9012 3456</p>
            </div>
            <Copy weight="regular" className="w-4 h-4 text-white/30" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm">⚡</div>
            <div className="flex-1">
              <p className="text-xs text-white/40">СБП</p>
              <p className="text-sm text-white font-mono">+7 999 123-45-67</p>
            </div>
            <Copy weight="regular" className="w-4 h-4 text-white/30" />
          </div>
        </div>

        <div className="mt-4 p-3 bg-accent-purple/10 border border-accent-purple/20 rounded-xl flex items-center gap-2">
          <Camera weight="duotone" className="w-4 h-4 text-accent-purple" />
          <p className="text-xs text-accent-purple">Отправьте фото чека боту после оплаты</p>
        </div>
      </motion.div>

      {/* Buttons */}
      <div className="mt-auto pt-4 flex flex-col gap-3">
        <motion.button 
          onClick={handleClose} 
          className="btn-primary"
          whileTap={{ scale: 0.98 }}
        >
          Закрыть
        </motion.button>
        <motion.button 
          onClick={handleNewBooking} 
          className="btn-secondary"
          whileTap={{ scale: 0.98 }}
        >
          Новый заказ
        </motion.button>
      </div>
    </div>
  );
}
