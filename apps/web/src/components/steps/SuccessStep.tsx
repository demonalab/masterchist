'use client';

import { useState, useRef, useEffect } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { useTelegram } from '@/lib/telegram-provider';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Package, CalendarBlank, Clock, MapPin, CreditCard, Camera, Copy, Upload, SpinnerGap, Check, X, Warning } from '@phosphor-icons/react';
import { useHaptic } from '@/lib/haptic';
import { toast } from 'sonner';

interface PaymentRequisites {
  prepaymentAmount: number;
  card: { number: string; bank: string; holder: string };
  sbp: { phone: string; bank: string };
}

export function SuccessStep() {
  const { booking, reset } = useBookingStore();
  const { webApp } = useTelegram();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const haptic = useHaptic();
  
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [requisites, setRequisites] = useState<PaymentRequisites | null>(null);

  useEffect(() => {
    api.getPaymentRequisites().then(result => {
      if (result.ok) {
        setRequisites(result.data);
      }
    });
  }, []);

  const [cancelling, setCancelling] = useState(false);

  const handleDone = () => { reset(); }; // Go to main page instead of closing
  
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const handleCancel = async () => {
    if (!booking) return;
    setShowCancelConfirm(true);
  };
  
  const confirmCancel = async () => {
    if (!booking) return;
    
    setShowCancelConfirm(false);
    setCancelling(true);
    const result = await api.cancelBooking(booking.id);
    setCancelling(false);
    
    if (result.ok) {
      haptic.medium();
      toast.success('Заказ отменён');
      reset();
    } else {
      toast.error(result.error || 'Не удалось отменить заказ');
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      haptic.light();
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !booking) return;
    
    setUploading(true);
    setUploadError(null);
    
    const result = await api.uploadReceipt(booking.id, file);
    
    if (result.ok) {
      setUploaded(true);
    } else {
      setUploadError(result.error);
    }
    
    setUploading(false);
  };

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
          <p className="text-3xl font-bold text-accent-green">
            {requisites ? `${requisites.prepaymentAmount.toLocaleString('ru')} ₽` : '...'}
          </p>
          <p className="text-xs text-white/40 mt-1">Предоплата за аренду</p>
        </div>

        {requisites ? (
          <div className="space-y-2">
            {requisites.card.number && (
              <button 
                onClick={() => copyToClipboard(requisites.card.number.replace(/\s/g, ''), 'card')}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl w-full text-left hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 text-sm">₽</div>
                <div className="flex-1">
                  <p className="text-xs text-white/40">{requisites.card.bank}</p>
                  <p className="text-sm text-white font-mono">
                    {requisites.card.number.replace(/(\d{4})/g, '$1 ').trim()}
                  </p>
                  {requisites.card.holder && (
                    <p className="text-xs text-white/30 mt-0.5">{requisites.card.holder}</p>
                  )}
                </div>
                {copiedField === 'card' ? (
                  <Check weight="bold" className="w-4 h-4 text-accent-green" />
                ) : (
                  <Copy weight="regular" className="w-4 h-4 text-white/30" />
                )}
              </button>
            )}
            {requisites.sbp.phone && (
              <button 
                onClick={() => copyToClipboard(requisites.sbp.phone.replace(/\D/g, ''), 'phone')}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl w-full text-left hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm">⚡</div>
                <div className="flex-1">
                  <p className="text-xs text-white/40">СБП · {requisites.sbp.bank}</p>
                  <p className="text-sm text-white font-mono">{requisites.sbp.phone}</p>
                </div>
                {copiedField === 'phone' ? (
                  <Check weight="bold" className="w-4 h-4 text-accent-green" />
                ) : (
                  <Copy weight="regular" className="w-4 h-4 text-white/30" />
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <SpinnerGap weight="bold" className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        )}

        {/* Upload receipt section */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        
        {uploaded ? (
          <div className="mt-4 p-4 bg-accent-green/10 border border-accent-green/20 rounded-xl flex items-center gap-3">
            <Check weight="bold" className="w-5 h-5 text-accent-green" />
            <div>
              <p className="text-sm text-accent-green font-medium">Чек загружен!</p>
              <p className="text-xs text-white/40">Ожидайте подтверждения</p>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-xs text-white/50 text-center mb-2">
              ⚠️ Загрузите фото чека для подтверждения заказа
            </p>
            <button
              onClick={handleUploadClick}
              disabled={uploading}
              className="w-full p-4 bg-accent-green/10 border border-accent-green/30 rounded-xl flex items-center justify-center gap-3 hover:bg-accent-green/20 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <SpinnerGap weight="bold" className="w-5 h-5 text-accent-green animate-spin" />
                  <span className="text-sm text-accent-green">Загрузка...</span>
                </>
              ) : (
                <>
                  <Camera weight="duotone" className="w-5 h-5 text-accent-green" />
                  <span className="text-sm text-accent-green font-medium">Загрузить фото чека</span>
                </>
              )}
            </button>
          </div>
        )}
        
        {uploadError && (
          <p className="mt-2 text-xs text-red-400 text-center">{uploadError}</p>
        )}
      </motion.div>

      {/* Buttons */}
      <div className="mt-auto pt-4 flex flex-col gap-3">
        {uploaded ? (
          <motion.button 
            onClick={handleDone} 
            className="btn-primary"
            whileTap={{ scale: 0.98 }}
          >
            Готово
          </motion.button>
        ) : (
          <motion.button 
            onClick={handleCancel}
            disabled={cancelling}
            className="btn-secondary border-red-500/30 text-red-400 hover:bg-red-500/10"
            whileTap={{ scale: 0.98 }}
          >
            {cancelling ? 'Отмена...' : 'Отменить заказ'}
          </motion.button>
        )}
      </div>

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card-bg border border-white/10 rounded-2xl p-6 max-w-sm w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 mx-auto mb-4">
                <Warning weight="fill" className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-2">Отменить заказ?</h3>
              <p className="text-sm text-white/60 text-center mb-6">
                Это действие нельзя отменить. Заказ будет отменён.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                >
                  Назад
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
                >
                  Отменить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
