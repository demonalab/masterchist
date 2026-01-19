'use client';

import { useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { motion } from 'framer-motion';
import { CaretLeft, MapPin, User, Phone } from '@phosphor-icons/react';

export function AddressStep() {
  const { draft, updateDraft, setStep } = useBookingStore();
  const [street, setStreet] = useState(draft.street || '');
  const [house, setHouse] = useState(draft.house || '');
  const [apartment, setApartment] = useState(draft.apartment || '');
  const [contactName, setContactName] = useState(draft.contactName || '');
  const [contactPhone, setContactPhone] = useState(draft.contactPhone || '');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!street.trim()) { setError('Введите улицу'); return; }
    if (!house.trim()) { setError('Введите номер дома'); return; }
    if (!contactName.trim()) { setError('Введите имя'); return; }
    if (!contactPhone.trim()) { setError('Введите телефон'); return; }
    updateDraft({
      street: street.trim(),
      house: house.trim(),
      apartment: apartment.trim() || undefined,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
    });
    setStep('confirm');
  };

  const handleBack = () => setStep('time');

  return (
    <div className="screen relative overflow-hidden">
      <div className="floating-glow bg-accent-blue top-60 -left-20 animate-glow-pulse" />

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
        <p className="label-sm">Шаг 5 из 6</p>
        <h1 className="text-hero">
          Куда <span className="text-hero-accent">доставить?</span>
        </h1>
      </motion.div>

      <div className="flex flex-col gap-4">
        {/* Address */}
        <motion.div 
          className="glass-card-static p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-box w-10 h-10">
              <MapPin weight="duotone" className="w-5 h-5 text-accent-green" />
            </div>
            <p className="font-medium text-white">Адрес</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={street}
              onChange={(e) => { setStreet(e.target.value); setError(''); }}
              placeholder="Улица"
              className="input"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={house}
                onChange={(e) => { setHouse(e.target.value); setError(''); }}
                placeholder="Дом"
                className="input"
              />
              <input
                type="text"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                placeholder="Квартира"
                className="input"
              />
            </div>
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div 
          className="glass-card-static p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-box w-10 h-10">
              <User weight="duotone" className="w-5 h-5 text-accent-purple" />
            </div>
            <p className="font-medium text-white">Контакт</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={contactName}
              onChange={(e) => { setContactName(e.target.value); setError(''); }}
              placeholder="Ваше имя"
              className="input"
            />
            <div className="relative">
              <Phone weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => { setContactPhone(e.target.value); setError(''); }}
                placeholder="+7 (999) 123-45-67"
                className="input pl-12"
              />
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div 
            className="glass-card-static p-4 border-accent-red/30 text-accent-red text-center text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}
      </div>

      {/* Button */}
      <div className="mt-auto pt-6">
        <motion.button 
          onClick={handleContinue} 
          className="btn-primary"
          whileTap={{ scale: 0.98 }}
        >
          Продолжить
        </motion.button>
      </div>
    </div>
  );
}
