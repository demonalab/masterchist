'use client';

import { useState, useEffect } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { motion } from 'framer-motion';
import { SprayBottle, Sparkle, Gift, CaretRight, Clock, Star, ClipboardText, Question, User, GearSix } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { useHaptic } from '@/lib/haptic';
import { useTelegram } from '@/lib/telegram-provider';

export function ServiceStep() {
  const { updateDraft, setStep } = useBookingStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const haptic = useHaptic();
  const { initData, isReady } = useTelegram();

  useEffect(() => {
    if (!isReady) return;
    
    api.setInitData(initData);
    
    // Only check admin role if we have auth (initData or token)
    const hasAuth = initData || localStorage.getItem('auth_token');
    if (hasAuth) {
      api.getAdminRole().then(res => {
        if (res.ok && res.data.role) {
          setIsAdmin(true);
        }
      }).catch(() => {
        // User is not admin - expected behavior, no action needed
      });
    }
  }, [isReady, initData]);

  const handleSelect = () => {
    haptic.medium();
    updateDraft({ serviceCode: 'self_cleaning' });
    setStep('city');
  };
  
  const handleNavClick = (step: 'orders' | 'profile' | 'help' | 'admin' | 'pro_cleaning') => {
    haptic.light();
    setStep(step);
  };

  return (
    <div className="screen relative overflow-hidden">
      {/* Background glow */}
      <div className="floating-glow bg-accent-green top-20 -left-20 animate-glow-pulse" />
      <div className="floating-glow bg-accent-purple top-1/2 -right-20 animate-glow-pulse" style={{ animationDelay: '1s' }} />

      {/* Hero text */}
      <motion.div 
        className="mt-8 mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="label-sm">Сервис</p>
        <h1 className="text-hero">
          Привет! <span className="text-hero-accent">Арендуй</span>
          <br />
          <span className="text-hero-accent">набор для</span> химчистки
        </h1>
      </motion.div>

      {/* Main service card */}
      <motion.button
        onClick={handleSelect}
        className="glass-card p-6 w-full text-left relative overflow-hidden group"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Badge in corner */}
        <div className="absolute top-4 right-4">
          <span className="badge-green">
            <Star weight="fill" className="w-3 h-3" />
            Хит
          </span>
        </div>

        <div className="flex items-start gap-4 mb-5 pr-16">
          <div className="icon-box shrink-0">
            <SprayBottle weight="duotone" className="w-6 h-6 text-accent-green" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              Набор самообслуживания
            </h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Профессиональный набор для чистки мебели и ковров
            </p>
          </div>
        </div>

        {/* Price section */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <span className="price-old mr-3">2 500 ₽</span>
            <span className="price-tag">1 500 ₽</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40 text-sm">
            <Clock weight="regular" className="w-4 h-4" />
            <span>24 часа</span>
          </div>
        </div>

        {/* Promo banner */}
        <div className="bg-accent-green/10 border border-accent-green/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-green/20 flex items-center justify-center">
            <Gift weight="duotone" className="w-5 h-5 text-accent-green" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-accent-green">Сушка мебели и химия в подарок!</p>
            <p className="text-xs text-white/40">При заказе сегодня</p>
          </div>
          <CaretRight weight="bold" className="w-5 h-5 text-accent-green" />
        </div>
      </motion.button>

      {/* Other services */}
      <motion.div 
        className="mt-4 grid grid-cols-2 gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <button 
          onClick={() => handleNavClick('pro_cleaning')}
          className="glass-card-static p-4 text-left hover:bg-white/10 transition-colors"
        >
          <div className="icon-box w-10 h-10 mb-3">
            <Sparkle weight="duotone" className="w-5 h-5 text-accent-purple" />
          </div>
          <p className="text-sm font-medium text-white">Проф. химчистка</p>
          <p className="text-xs text-white/40 mt-1">Мастер на дом</p>
        </button>
        <div className="glass-card-static p-4 opacity-50">
          <div className="icon-box w-10 h-10 mb-3">
            <SprayBottle weight="duotone" className="w-5 h-5 text-white/40" />
          </div>
          <p className="text-sm font-medium text-white/60">Клининг</p>
          <p className="text-xs text-white/30 mt-1">Скоро</p>
        </div>
      </motion.div>

      {/* Navigation buttons */}
      <motion.div 
        className={`mt-6 grid gap-3 ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        <button 
          onClick={() => handleNavClick('orders')}
          className="glass-card-static p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors"
        >
          <ClipboardText weight="duotone" className="w-6 h-6 text-accent-blue" />
          <span className="text-xs text-white/70">Заказы</span>
        </button>
        <button 
          onClick={() => handleNavClick('profile')}
          className="glass-card-static p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors"
        >
          <User weight="duotone" className="w-6 h-6 text-accent-green" />
          <span className="text-xs text-white/70">Профиль</span>
        </button>
        <button 
          onClick={() => handleNavClick('help')}
          className="glass-card-static p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors"
        >
          <Question weight="duotone" className="w-6 h-6 text-accent-purple" />
          <span className="text-xs text-white/70">Помощь</span>
        </button>
        {isAdmin && (
          <button 
            onClick={() => handleNavClick('admin')}
            className="glass-card-static p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors"
          >
            <GearSix weight="duotone" className="w-6 h-6 text-yellow-400" />
            <span className="text-xs text-white/70">Админ</span>
          </button>
        )}
      </motion.div>

      {/* Bottom stats */}
      <motion.div 
        className="mt-auto pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="glass-card-static p-5 flex items-center justify-between">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-green">500+</p>
            <p className="text-xs text-white/40">заказов</p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">4.9</p>
            <p className="text-xs text-white/40">рейтинг</p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">2ч</p>
            <p className="text-xs text-white/40">доставка</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
