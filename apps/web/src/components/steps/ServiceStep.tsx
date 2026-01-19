'use client';

import { useBookingStore } from '@/lib/booking-store';
import { motion } from 'framer-motion';
import { Sparkles, Shirt, Home, Clock, Truck, ChevronRight, Star, Gift, Percent } from 'lucide-react';

const services = [
  {
    code: 'self_cleaning',
    Icon: Sparkles,
    name: 'Химчистка самообслуживания',
    description: 'Профессиональный набор для самостоятельной чистки мебели и ковров',
    price: '1500 ₽',
    oldPrice: '2500 ₽',
    duration: '24 часа',
    active: true,
    popular: true,
    promo: 'Сушилка и химия в подарок!',
  },
  {
    code: 'pro_cleaning',
    Icon: Shirt,
    name: 'Проф. химчистка мастером',
    description: 'Опытный мастер приедет и выполнит химчистку',
    price: 'от 1500 ₽',
    duration: '2-3 часа',
    active: false,
    popular: false,
  },
  {
    code: 'cleaning',
    Icon: Home,
    name: 'Клининг помещений',
    description: 'Комплексная уборка квартир и офисов',
    price: 'от 2000 ₽',
    duration: '3-5 часов',
    active: false,
    popular: false,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function ServiceStep() {
  const { updateDraft, setStep } = useBookingStore();

  const handleSelect = (code: string) => {
    updateDraft({ serviceCode: code });
    setStep('city');
  };

  return (
    <motion.div 
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <motion.div 
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-premium mb-4"
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="screen-title">МастерЧист</h1>
        <p className="screen-subtitle">Премиум сервис аренды наборов для химчистки</p>
      </motion.div>

      {/* Services */}
      <motion.div 
        className="flex flex-col gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {services.map((service) => (
          <motion.button
            key={service.code}
            onClick={() => service.active && handleSelect(service.code)}
            disabled={!service.active}
            className={`option-card text-left relative overflow-hidden
              ${!service.active ? 'opacity-40 cursor-not-allowed' : ''}`}
            variants={itemVariants}
            whileHover={service.active ? { scale: 1.02, y: -2 } : {}}
            whileTap={service.active ? { scale: 0.98 } : {}}
          >
            {service.popular && (
              <motion.div 
                className="absolute top-3 right-3"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <span className="badge-gold flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Популярное
                </span>
              </motion.div>
            )}
            
            <div className="icon-circle">
              <service.Icon className="w-6 h-6" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white mb-1">{service.name}</div>
              <div className="text-sm text-gray-400 line-clamp-2">{service.description}</div>
              {service.active && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {service.duration}
                  </span>
                  {'promo' in service && service.promo && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      {service.promo}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="text-right flex flex-col items-end">
              {'oldPrice' in service && service.oldPrice && (
                <div className="text-xs text-gray-500 line-through">{service.oldPrice}</div>
              )}
              <div className="text-lg font-bold gradient-text">{service.price}</div>
              {service.active ? (
                <ChevronRight className="w-5 h-5 text-purple-400 mt-1" />
              ) : (
                <span className="text-xs text-gray-500">Скоро</span>
              )}
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Footer info */}
      <motion.div 
        className="mt-auto pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Truck className="w-4 h-4" />
            <span>Быстрая доставка по городу</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
