'use client';

import { useBookingStore } from '@/lib/booking-store';
import { motion } from 'framer-motion';
import { MapPin, Buildings, CaretRight, CaretLeft, Truck } from '@phosphor-icons/react';
import { useHaptic } from '@/lib/haptic';

const cities = [
  { code: 'ROSTOV_NA_DONU', name: 'Ростов-на-Дону', available: true },
  { code: 'BATAYSK', name: 'Батайск', available: true },
  { code: 'STAVROPOL', name: 'Ставрополь', available: true },
];

export function CityStep() {
  const { updateDraft, setStep } = useBookingStore();
  const haptic = useHaptic();

  const handleSelect = (code: string, name: string) => {
    haptic.light();
    updateDraft({ city: code, cityName: name });
    setStep('date');
  };

  const handleBack = () => {
    setStep('service');
  };

  return (
    <div className="screen relative overflow-hidden">
      {/* Background glow */}
      <div className="floating-glow bg-accent-blue top-40 -right-20 animate-glow-pulse" />

      {/* Back button */}
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

      {/* Hero text */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="label-sm">Шаг 2 из 6</p>
        <h1 className="text-hero">
          Выберите <span className="text-hero-accent">город</span>
        </h1>
      </motion.div>

      {/* Cities */}
      <div className="flex flex-col gap-3">
        {cities.map((city, index) => (
          <motion.button
            key={city.code}
            onClick={() => handleSelect(city.code, city.name)}
            className="glass-card p-5 flex items-center gap-4 text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="icon-box">
              {index === 0 ? (
                <Buildings weight="duotone" className="w-5 h-5 text-accent-green" />
              ) : (
                <MapPin weight="duotone" className="w-5 h-5 text-white/60" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{city.name}</p>
              <p className="text-sm text-white/40">Доставка доступна</p>
            </div>
            <CaretRight weight="bold" className="w-5 h-5 text-white/30" />
          </motion.button>
        ))}
      </div>

      {/* Bottom info */}
      <motion.div 
        className="mt-auto pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="glass-card-static p-4 flex items-center gap-3">
          <div className="icon-box w-10 h-10">
            <Truck weight="duotone" className="w-5 h-5 text-accent-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Быстрая доставка</p>
            <p className="text-xs text-white/40">В течение 2 часов после заказа</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
