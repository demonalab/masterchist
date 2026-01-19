'use client';

import { useBookingStore } from '@/lib/booking-store';
import { motion } from 'framer-motion';
import { MapPin, Building2, ChevronRight, Package, ArrowLeft } from 'lucide-react';

const cities = [
  { code: 'ROSTOV_NA_DONU', name: 'Ростов-на-Дону', Icon: Building2 },
  { code: 'BATAYSK', name: 'Батайск', Icon: MapPin },
  { code: 'STAVROPOL', name: 'Ставрополь', Icon: Building2 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

export function CityStep() {
  const { updateDraft, setStep } = useBookingStore();

  const handleSelect = (code: string, name: string) => {
    updateDraft({ city: code, cityName: name });
    setStep('date');
  };

  const handleBack = () => {
    setStep('service');
  };

  return (
    <motion.div 
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="mb-8">
        <motion.button 
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </motion.button>
        <h1 className="screen-title">Выберите город</h1>
        <p className="screen-subtitle">Мы работаем в этих городах</p>
      </div>

      {/* Cities */}
      <motion.div 
        className="flex flex-col gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {cities.map((city) => (
          <motion.button
            key={city.code}
            onClick={() => handleSelect(city.code, city.name)}
            className="option-card"
            variants={itemVariants}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="icon-circle">
              <city.Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white">{city.name}</div>
              <div className="text-sm text-gray-400">Доставка доступна</div>
            </div>
            <ChevronRight className="w-5 h-5 text-purple-400" />
          </motion.button>
        ))}
      </motion.div>

      {/* Info */}
      <motion.div 
        className="mt-auto pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Package className="w-4 h-4" />
            <span>Доставка в день заказа</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
