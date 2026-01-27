'use client';

import { useState } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { motion } from 'framer-motion';
import { MapPin, Buildings, CaretRight, CaretLeft, Truck, CheckCircle } from '@phosphor-icons/react';
import { useHaptic } from '@/lib/haptic';

const cities = [
  { 
    code: 'ROSTOV_NA_DONU', 
    name: 'Ростов-на-Дону', 
    available: true,
    hasDistricts: true,
    deliveryInfo: 'Выберите район для расчёта доставки'
  },
  { code: 'BATAYSK', name: 'Батайск', available: true, hasDistricts: false, deliveryInfo: 'Бесплатная доставка' },
  { code: 'STAVROPOL', name: 'Ставрополь', available: true, hasDistricts: false, deliveryInfo: 'Бесплатная доставка' },
];

const rostovDistricts = [
  { code: 'sovetsky', name: 'Советский', deliveryPrice: 0 },
  { code: 'zhd', name: 'Железнодорожный', deliveryPrice: 0 },
  { code: 'leninsky', name: 'Ленинский', deliveryPrice: 0 },
  { code: 'kirovsky', name: 'Кировский', deliveryPrice: 0 },
  { code: 'other', name: 'Другой район', deliveryPrice: 200 },
];

export function CityStep() {
  const { updateDraft, setStep } = useBookingStore();
  const haptic = useHaptic();
  const [showDistricts, setShowDistricts] = useState(false);
  const [selectedCity, setSelectedCity] = useState<{ code: string; name: string } | null>(null);

  const handleSelectCity = (city: typeof cities[0]) => {
    haptic.light();
    if (city.hasDistricts) {
      setSelectedCity({ code: city.code, name: city.name });
      setShowDistricts(true);
    } else {
      updateDraft({ city: city.code, cityName: city.name, district: undefined, districtName: undefined, deliveryPrice: 0 });
      setStep('date');
    }
  };

  const handleSelectDistrict = (district: typeof rostovDistricts[0]) => {
    haptic.light();
    updateDraft({ 
      city: selectedCity!.code, 
      cityName: selectedCity!.name, 
      district: district.code,
      districtName: district.name,
      deliveryPrice: district.deliveryPrice
    });
    setStep('date');
  };

  const handleBack = () => {
    if (showDistricts) {
      setShowDistricts(false);
      setSelectedCity(null);
    } else {
      setStep('service');
    }
  };

  return (
    <div className="screen relative overflow-hidden">
      {/* Background glow */}
      <div className="floating-glow bg-accent-blue top-40 -right-20 animate-glow-pulse" />

      {/* Back button */}
      <motion.button 
        onClick={handleBack}
        className="btn-ghost flex items-center gap-2 -ml-4 mb-6 active:scale-95"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <CaretLeft weight="bold" className="w-4 h-4" />
        <span>Назад</span>
      </motion.button>

      {/* Hero text */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ transform: 'translateZ(0)' }}
        key={showDistricts ? 'districts' : 'cities'}
      >
        <p className="label-sm">Шаг 2 из 6</p>
        <h1 className="text-hero">
          {showDistricts ? (
            <>Выберите <span className="text-hero-accent">район</span></>
          ) : (
            <>Выберите <span className="text-hero-accent">город</span></>
          )}
        </h1>
        {showDistricts && (
          <p className="text-sm text-white/50 mt-2">{selectedCity?.name}</p>
        )}
      </motion.div>

      {/* Cities or Districts */}
      <div className="flex flex-col gap-3">
        {!showDistricts ? (
          cities.map((city, index) => (
            <motion.button
              key={city.code}
              onClick={() => handleSelectCity(city)}
              className="glass-card p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              style={{ transform: 'translateZ(0)' }}
            >
              <div className="icon-box">
                <Buildings weight="duotone" className="w-5 h-5 text-accent-green" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{city.name}</p>
                <p className="text-xs text-white/40">{city.deliveryInfo}</p>
              </div>
              <CaretRight weight="bold" className="w-5 h-5 text-white/30" />
            </motion.button>
          ))
        ) : (
          rostovDistricts.map((district, index) => (
            <motion.button
              key={district.code}
              onClick={() => handleSelectDistrict(district)}
              className="glass-card p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              style={{ transform: 'translateZ(0)' }}
            >
              <div className="icon-box">
                <MapPin weight="duotone" className="w-5 h-5 text-accent-green" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{district.name}</p>
                <p className={`text-xs ${district.deliveryPrice === 0 ? 'text-accent-green' : 'text-accent-yellow'}`}>
                  {district.deliveryPrice === 0 ? 'Бесплатная доставка' : `Доставка +${district.deliveryPrice}₽`}
                </p>
              </div>
              {district.deliveryPrice === 0 ? (
                <CheckCircle weight="fill" className="w-5 h-5 text-accent-green" />
              ) : (
                <CaretRight weight="bold" className="w-5 h-5 text-white/30" />
              )}
            </motion.button>
          ))
        )}
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
