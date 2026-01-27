'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Question, SprayBottle, Sparkle, Phone, TelegramLogo } from '@phosphor-icons/react';

interface HelpStepProps {
  onBack: () => void;
}

export function HelpStep({ onBack }: HelpStepProps) {
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
          <h1 className="text-xl font-bold text-white">Помощь</h1>
          <p className="text-sm text-white/40">Информация о сервисе</p>
        </div>
      </motion.div>

      {/* Services info */}
      <div className="space-y-4 mb-6">
        <motion.div 
          className="glass-card-static p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-box">
              <SprayBottle weight="duotone" className="w-5 h-5 text-accent-green" />
            </div>
            <h3 className="font-semibold text-white">Химчистка самообслуживания</h3>
          </div>
          <p className="text-sm text-white/50 leading-relaxed">
            Аренда профессионального набора для чистки мебели и ковров. 
            Мы привозим оборудование и химию, вы чистите самостоятельно. 
            Стоимость: <span className="text-accent-green font-medium">1500₽/сутки</span>
          </p>
        </motion.div>

        <motion.div 
          className="glass-card-static p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-box">
              <Sparkle weight="duotone" className="w-5 h-5 text-accent-purple" />
            </div>
            <h3 className="font-semibold text-white">Проф. химчистка</h3>
          </div>
          <p className="text-sm text-white/50 leading-relaxed">
            Мастер приедет и профессионально почистит вашу мебель или ковры. 
            Оценка стоимости после осмотра загрязнений.
          </p>
        </motion.div>
      </div>

      {/* FAQ */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Question weight="duotone" className="w-5 h-5 text-accent-blue" />
          Частые вопросы
        </h2>
        
        <div className="space-y-3">
          <div className="glass-card-static p-4">
            <p className="font-medium text-white text-sm mb-1">Как происходит доставка?</p>
            <p className="text-xs text-white/40">
              Мы привозим набор в указанное время и забираем через сутки.
            </p>
          </div>
          
          <div className="glass-card-static p-4">
            <p className="font-medium text-white text-sm mb-1">Что входит в набор?</p>
            <p className="text-xs text-white/40">
              Моющий пылесос, профессиональная химия, сушка мебели, инструкция.
            </p>
          </div>
          
          <div className="glass-card-static p-4">
            <p className="font-medium text-white text-sm mb-1">Нужна предоплата?</p>
            <p className="text-xs text-white/40">
              Да, 500₽ предоплаты для бронирования. Остаток при получении.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Contact */}
      <motion.div 
        className="glass-card-static p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Phone weight="duotone" className="w-5 h-5 text-accent-green" />
          Контакты
        </h3>
        
        <div className="space-y-3">
          <a 
            href="https://t.me/rim613" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <TelegramLogo weight="duotone" className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-white">@rim613</span>
          </a>
          <a 
            href="tel:+79993333299"
            className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <Phone weight="duotone" className="w-5 h-5 text-accent-green" />
            <span className="text-sm text-white">+7 999 333-32-99</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
