'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, ArrowLeft, MapPin, Plus, Trash, Star, House, Buildings, 
  Phone, TelegramLogo, CaretRight, Check
} from '@phosphor-icons/react';
import { api, SavedAddress } from '@/lib/api';
import { useTelegram } from '@/lib/telegram-provider';

interface ProfileStepProps {
  onBack: () => void;
}

const CITY_NAMES: Record<string, string> = {
  ROSTOV_NA_DONU: 'Ростов-на-Дону',
  BATAYSK: 'Батайск',
  STAVROPOL: 'Ставрополь',
};

export function ProfileStep({ onBack }: ProfileStepProps) {
  const { webApp } = useTelegram();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const user = webApp?.initDataUnsafe?.user;

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setLoading(true);
    const result = await api.getSavedAddresses();
    if (result.ok) {
      setAddresses(result.data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const result = await api.deleteSavedAddress(id);
    if (result.ok) {
      setAddresses(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleSetDefault = async (id: string) => {
    const result = await api.setDefaultAddress(id);
    if (result.ok) {
      setAddresses(prev => prev.map(a => ({
        ...a,
        isDefault: a.id === id,
      })));
    }
  };

  const openSupport = () => {
    window.open('https://t.me/MasterChist_support', '_blank');
  };

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
          <h1 className="text-xl font-bold text-white">Профиль</h1>
          <p className="text-sm text-white/40">Настройки и адреса</p>
        </div>
      </motion.div>

      {/* User info */}
      <motion.div 
        className="glass-card-static p-5 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-green to-accent-blue flex items-center justify-center">
            <User weight="bold" className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white text-lg">
              {user?.first_name || 'Пользователь'} {user?.last_name || ''}
            </p>
            {user?.username && (
              <p className="text-sm text-white/40">@{user.username}</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Saved addresses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MapPin weight="duotone" className="w-5 h-5 text-accent-green" />
            Сохранённые адреса
          </h2>
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-sm text-accent-green"
          >
            <Plus weight="bold" className="w-4 h-4" />
            Добавить
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="glass-card-static p-6 text-center">
            <MapPin weight="duotone" className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Нет сохранённых адресов</p>
            <p className="text-white/20 text-xs mt-1">Добавьте адрес для быстрого заказа</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address, index) => (
              <motion.div
                key={address.id}
                className="glass-card-static p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-start gap-3">
                  <div className="icon-box w-10 h-10 shrink-0">
                    {address.label === 'Дом' ? (
                      <House weight="duotone" className="w-5 h-5 text-accent-green" />
                    ) : address.label === 'Офис' ? (
                      <Buildings weight="duotone" className="w-5 h-5 text-accent-blue" />
                    ) : (
                      <MapPin weight="duotone" className="w-5 h-5 text-accent-purple" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-white truncate">
                        {address.label || 'Адрес'}
                      </p>
                      {address.isDefault && (
                        <span className="px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs rounded-full flex items-center gap-1">
                          <Star weight="fill" className="w-3 h-3" />
                          По умолчанию
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/60 truncate">{address.addressLine}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {CITY_NAMES[address.city] || address.city} · {address.contactPhone}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                        title="Сделать основным"
                      >
                        <Star weight="regular" className="w-4 h-4 text-white/40" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                      title="Удалить"
                    >
                      <Trash weight="regular" className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Support */}
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Phone weight="duotone" className="w-5 h-5 text-accent-purple" />
          Поддержка
        </h2>
        
        <button
          onClick={openSupport}
          className="glass-card-static p-4 w-full flex items-center gap-3 hover:bg-white/10 transition-colors"
        >
          <div className="icon-box w-10 h-10">
            <TelegramLogo weight="duotone" className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-white">Написать в поддержку</p>
            <p className="text-xs text-white/40">@MasterChist_support</p>
          </div>
          <CaretRight weight="bold" className="w-5 h-5 text-white/30" />
        </button>
      </motion.div>
    </div>
  );
}
