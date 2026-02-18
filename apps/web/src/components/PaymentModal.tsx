'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Camera, Copy, Check, SpinnerGap } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { useHaptic } from '@/lib/haptic';

interface PaymentRequisites {
  prepaymentAmount: number;
  card: { number: string; bank: string; holder: string };
  sbp: { phone: string; bank: string };
}

interface PaymentModalProps {
  bookingId: string;
  shortId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function PaymentModal({ bookingId, shortId, onBack, onSuccess }: PaymentModalProps) {
  const [requisites, setRequisites] = useState<PaymentRequisites | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const haptic = useHaptic();

  useEffect(() => {
    api.getPaymentRequisites().then(result => {
      if (result.ok) setRequisites(result.data);
    });
  }, []);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      haptic.light();
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {}
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const result = await api.uploadReceipt(bookingId, file);

    if (result.ok) {
      setUploaded(true);
      haptic.success();
    } else {
      setUploadError(result.error);
    }

    setUploading(false);
  };

  return (
    <div className="screen !p-0 flex flex-col">
      {/* Шапка */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm" style={{
        paddingTop: 'calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)) + var(--tg-content-safe-area-inset-top, 0px) + 12px)',
      }}>
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
          <ArrowLeft weight="bold" className="w-4 h-4 text-white/60" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">Оплата заказа {shortId}</h2>
          <p className="text-xs text-white/40">Загрузите фото чека</p>
        </div>
        <CreditCard weight="duotone" className="w-5 h-5 text-accent-blue shrink-0" />
      </div>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Сумма */}
        <div className="text-center py-4 bg-white/5 rounded-2xl">
          <p className="text-3xl font-bold text-accent-green">
            {requisites ? `${requisites.prepaymentAmount.toLocaleString('ru')} ₽` : '...'}
          </p>
          <p className="text-xs text-white/40 mt-1">Предоплата за аренду</p>
        </div>

        {/* Реквизиты */}
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
          <div className="flex items-center justify-center py-6">
            <SpinnerGap weight="bold" className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        )}

        {/* Загрузка чека */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {uploaded ? (
          <motion.div
            className="p-4 bg-accent-green/10 border border-accent-green/20 rounded-xl flex items-center gap-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Check weight="bold" className="w-5 h-5 text-accent-green" />
            <div>
              <p className="text-sm text-accent-green font-medium">Чек загружен!</p>
              <p className="text-xs text-white/40">Ожидайте подтверждения администратором</p>
            </div>
          </motion.div>
        ) : (
          <div>
            <p className="text-xs text-white/50 text-center mb-2">
              ⚠️ Переведите оплату и загрузите фото чека
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
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
          <p className="text-xs text-red-400 text-center">{uploadError}</p>
        )}
      </div>

      {/* Кнопка внизу */}
      <div className="px-5 py-4 border-t border-white/10 bg-black/20" style={{
        paddingBottom: 'calc(var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + var(--tg-content-safe-area-inset-bottom, 0px) + 12px)',
      }}>
        {uploaded ? (
          <button onClick={onSuccess} className="w-full py-3.5 bg-accent-green text-black font-semibold rounded-2xl">
            Готово
          </button>
        ) : (
          <button onClick={onBack} className="w-full py-3.5 bg-white/5 text-white/60 font-medium rounded-2xl">
            Назад к заказам
          </button>
        )}
      </div>
    </div>
  );
}
