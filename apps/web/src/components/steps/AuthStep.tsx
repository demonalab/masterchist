'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Lock, User, Eye, EyeSlash, SpinnerGap, Check } from '@phosphor-icons/react';
import { formatPhoneInput, isValidPhone } from '@/lib/phone-utils';

interface AuthStepProps {
  onBack: () => void;
  onSuccess: (token: string) => void;
}

type AuthMode = 'login' | 'register';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://xn--80akjnwedee1c.xn--p1ai/api/v1';

export function AuthStep({ onBack, onSuccess }: AuthStepProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [phone, setPhone] = useState('+7 ');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    
    // Validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 11) {
      setError('Введите корректный номер телефона');
      return;
    }
    
    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }

    if (mode === 'register' && !firstName.trim()) {
      setError('Введите имя');
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body: any = {
        phone: '+' + cleanPhone,
        password,
      };
      
      if (mode === 'register') {
        body.firstName = firstName.trim();
      }

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Ошибка авторизации');
        setLoading(false);
        return;
      }

      // Success
      setSuccess(true);
      
      // Save token
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        setTimeout(() => {
          onSuccess(data.token);
        }, 1000);
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте позже.');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="screen">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center justify-center h-full"
        >
          <div className="w-20 h-20 rounded-full bg-accent-green/20 flex items-center justify-center mb-4">
            <Check weight="bold" className="w-10 h-10 text-accent-green" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {mode === 'login' ? 'Вход выполнен!' : 'Регистрация завершена!'}
          </h2>
          <p className="text-white/50 text-center">
            Перенаправление...
          </p>
        </motion.div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-white">
            {mode === 'login' ? 'Вход' : 'Регистрация'}
          </h1>
          <p className="text-sm text-white/40">Личный кабинет</p>
        </div>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div 
        className="flex gap-2 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={() => { setMode('login'); setError(''); }}
          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
            mode === 'login'
              ? 'bg-accent-green text-black'
              : 'bg-white/5 text-white/60'
          }`}
        >
          Вход
        </button>
        <button
          onClick={() => { setMode('register'); setError(''); }}
          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
            mode === 'register'
              ? 'bg-accent-green text-black'
              : 'bg-white/5 text-white/60'
          }`}
        >
          Регистрация
        </button>
      </motion.div>

      {/* Form */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Name (register only) */}
        {mode === 'register' && (
          <div>
            <label className="text-sm text-white/40 mb-2 block">Имя</label>
            <div className="relative">
              <User weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ваше имя"
                className="input pl-12"
              />
            </div>
          </div>
        )}

        {/* Phone */}
        <div>
          <label className="text-sm text-white/40 mb-2 block">Телефон</label>
          <div className="relative">
            <Phone weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value, phone))}
              placeholder="+7 (999) 123-45-67"
              className="input pl-12"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="text-sm text-white/40 mb-2 block">Пароль</label>
          <div className="relative">
            <Lock weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Минимум 6 символов' : 'Ваш пароль'}
              className="input pl-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeSlash weight="duotone" className="w-5 h-5 text-white/30" />
              ) : (
                <Eye weight="duotone" className="w-5 h-5 text-white/30" />
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <SpinnerGap weight="bold" className="w-5 h-5 animate-spin mx-auto" />
          ) : mode === 'login' ? (
            'Войти'
          ) : (
            'Зарегистрироваться'
          )}
        </button>
      </motion.div>

      {/* Info */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-xs text-white/30">
          {mode === 'login' 
            ? 'Нет аккаунта? Нажмите "Регистрация"' 
            : 'После регистрации вы сможете связать Telegram аккаунт'}
        </p>
      </motion.div>
    </div>
  );
}
