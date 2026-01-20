'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardText, Package, CalendarBlank, Clock, ArrowLeft, SpinnerGap, ArrowClockwise, MapPin } from '@phosphor-icons/react';
import { api, MyBooking } from '@/lib/api';
import { useBookingStore } from '@/lib/booking-store';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'Новый', color: 'text-blue-400' },
  awaiting_prepayment: { label: 'Ожидает оплаты', color: 'text-yellow-400' },
  prepaid: { label: 'Оплачен', color: 'text-purple-400' },
  confirmed: { label: 'Подтверждён', color: 'text-green-400' },
  in_progress: { label: 'В работе', color: 'text-cyan-400' },
  completed: { label: 'Завершён', color: 'text-gray-400' },
  cancelled: { label: 'Отменён', color: 'text-red-400' },
};

interface MyOrdersStepProps {
  onBack: () => void;
}

export function MyOrdersStep({ onBack }: MyOrdersStepProps) {
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { updateDraft, setStep } = useBookingStore();

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      const result = await api.getMyBookings();
      if (result.ok) {
        setBookings(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    fetchBookings();
  }, []);

  const handleRepeatOrder = (booking: MyBooking) => {
    // Pre-fill draft with service code and start new booking flow
    updateDraft({
      serviceCode: 'self_cleaning',
    });
    setStep('city');
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ru', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="screen">
      {/* Header */}
      <motion.div 
        className="flex items-center gap-4 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"
        >
          <ArrowLeft weight="bold" className="w-5 h-5 text-white/60" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Мои заказы</h1>
          <p className="text-sm text-white/40">История бронирований</p>
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <SpinnerGap weight="bold" className="w-8 h-8 text-accent-green animate-spin" />
        </div>
      ) : error ? (
        <motion.div 
          className="glass-card-static p-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-red-400">{error}</p>
          <button onClick={onBack} className="btn-secondary mt-4">
            Назад
          </button>
        </motion.div>
      ) : bookings.length === 0 ? (
        <motion.div 
          className="flex-1 flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <ClipboardText weight="duotone" className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-white/40 mb-2">У вас пока нет заказов</p>
          <p className="text-sm text-white/20">Создайте первый заказ!</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking, index) => {
            const status = STATUS_LABELS[booking.status] || { label: booking.status, color: 'text-white/40' };
            
            return (
              <motion.div
                key={booking.id}
                className="glass-card-static p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {booking.kitNumber && (
                      <div className="badge-green">
                        <Package weight="duotone" className="w-3 h-3" />
                        №{booking.kitNumber}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-white/60">
                    <CalendarBlank weight="duotone" className="w-4 h-4" />
                    <span>{formatDate(booking.scheduledDate)}</span>
                  </div>
                  {booking.timeSlot && (
                    <div className="flex items-center gap-2 text-white/60">
                      <Clock weight="duotone" className="w-4 h-4" />
                      <span>{booking.timeSlot}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <p className="text-xs text-white/30 font-mono">
                    ID: {booking.id.slice(0, 8).toUpperCase()}
                  </p>
                  {(booking.status === 'completed' || booking.status === 'cancelled') && (
                    <button
                      onClick={() => handleRepeatOrder(booking)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green/10 hover:bg-accent-green/20 text-accent-green text-xs font-medium rounded-lg transition-colors"
                    >
                      <ArrowClockwise weight="bold" className="w-3.5 h-3.5" />
                      Повторить
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
