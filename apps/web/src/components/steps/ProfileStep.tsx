'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, ArrowLeft, MapPin, Plus, Trash, Star, House, Buildings, 
  Phone, TelegramLogo, CaretRight, Check, X, SpinnerGap
} from '@phosphor-icons/react';
import { api, SavedAddress } from '@/lib/api';
import { useTelegram } from '@/lib/telegram-provider';
import { formatPhoneInput, isValidPhone } from '@/lib/phone-utils';
import { useBookingStore } from '@/lib/booking-store';

interface ProfileStepProps {
  onBack: () => void;
}

const CITY_NAMES: Record<string, string> = {
  ROSTOV_NA_DONU: 'Ростов-на-Дону',
  BATAYSK: 'Батайск',
  STAVROPOL: 'Ставрополь',
};

const CITIES = [
  { code: 'ROSTOV_NA_DONU', name: 'Ростов-на-Дону' },
  { code: 'BATAYSK', name: 'Батайск' },
  { code: 'STAVROPOL', name: 'Ставрополь' },
];

export function ProfileStep({ onBack }: ProfileStepProps) {
  const { webApp, initData } = useTelegram();
  const { setStep } = useBookingStore();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Add address form state
  const [newCity, setNewCity] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newHouse, setNewHouse] = useState('');
  const [newApartment, setNewApartment] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newLabel, setNewLabel] = useState('Дом');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Auth state
  const [authUser, setAuthUser] = useState<{ phone: string; firstName: string; username?: string | null } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const user = webApp?.initDataUnsafe?.user;

  useEffect(() => {
    // Set initData for Telegram auth
    if (initData) {
      api.setInitData(initData);
    }
    // Load auth token for API requests (for MAX users)
    api.loadAuthToken();
    fetchAddresses();
    checkAuth();
  }, [initData]);

  const checkAuth = async () => {
    setAuthLoading(true);
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }
    
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://xn--80akjnwedee1c.xn--p1ai';
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setAuthUser({ phone: data.phone, firstName: data.firstName, username: data.username });
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setAuthUser(null);
  };

  const fetchAddresses = async () => {
    setLoading(true);
    const result = await api.getSavedAddresses();
    if (result.ok) {
      setAddresses(result.data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (initData) api.setInitData(initData);
    api.loadAuthToken();
    const result = await api.deleteSavedAddress(id);
    if (result.ok) {
      setAddresses(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleSetDefault = async (id: string) => {
    if (initData) api.setInitData(initData);
    api.loadAuthToken();
    const result = await api.setDefaultAddress(id);
    if (result.ok) {
      setAddresses(prev => prev.map(a => ({
        ...a,
        isDefault: a.id === id,
      })));
    }
  };

  const openSupport = () => {
    window.open('https://t.me/rim613', '_blank');
  };

  const resetForm = () => {
    setNewCity('');
    setNewStreet('');
    setNewHouse('');
    setNewApartment('');
    setNewContactName('');
    setNewContactPhone('');
    setNewLabel('Дом');
    setFormError('');
  };

  const handleAddAddress = async () => {
    if (!newCity) { setFormError('Выберите город'); return; }
    if (!newStreet.trim()) { setFormError('Введите улицу'); return; }
    if (!newHouse.trim()) { setFormError('Введите номер дома'); return; }
    if (!newContactName.trim()) { setFormError('Введите имя'); return; }
    if (!newContactPhone.trim()) { setFormError('Введите телефон'); return; }
    if (!isValidPhone(newContactPhone)) { setFormError('Неверный формат телефона'); return; }

    setSaving(true);
    setFormError('');

    const addressLine = [newStreet.trim(), `д. ${newHouse.trim()}`, newApartment.trim() ? `кв. ${newApartment.trim()}` : '']
      .filter(Boolean)
      .join(', ');

    const result = await api.createSavedAddress({
      city: newCity,
      addressLine,
      contactName: newContactName.trim(),
      contactPhone: newContactPhone.trim(),
      label: newLabel,
      isDefault: addresses.length === 0,
    });

    if (result.ok) {
      setAddresses(prev => [...prev, result.data]);
      setShowAddForm(false);
      resetForm();
    } else {
      setFormError(result.error);
    }

    setSaving(false);
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
              {user?.first_name || authUser?.firstName || 'Пользователь'} {user?.last_name || ''}
            </p>
            {user?.username ? (
              <p className="text-sm text-white/40">@{user.username}</p>
            ) : authUser?.username ? (
              <p className="text-sm text-white/40">@{authUser.username}</p>
            ) : authUser?.phone ? (
              <p className="text-sm text-white/40">{authUser.phone}</p>
            ) : null}
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

                  <div className="flex items-center gap-2 relative z-10">
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSetDefault(address.id); }}
                        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleSetDefault(address.id); }}
                        className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      >
                        <Star weight="regular" className="w-5 h-5 text-white/50" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(address.id); }}
                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(address.id); }}
                      className="w-11 h-11 rounded-lg bg-red-500/20 flex items-center justify-center active:bg-red-500/40 transition-colors"
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    >
                      <Trash weight="regular" className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Account */}
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User weight="duotone" className="w-5 h-5 text-accent-blue" />
          Личный кабинет
        </h2>
        
        {authLoading ? (
          <div className="glass-card-static p-4 flex items-center justify-center">
            <SpinnerGap className="w-5 h-5 text-white/40 animate-spin" />
          </div>
        ) : authUser ? (
          <div className="glass-card-static p-4 mb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="icon-box w-10 h-10 bg-accent-green/20">
                <Check weight="bold" className="w-5 h-5 text-accent-green" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{authUser.firstName}</p>
                <p className="text-xs text-white/40">{authUser.phone}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2 bg-white/5 text-white/60 rounded-lg text-sm hover:bg-white/10 transition-colors"
            >
              Выйти из аккаунта
            </button>
          </div>
        ) : (
          <button
            onClick={() => setStep('auth')}
            className="glass-card-static p-4 w-full flex items-center gap-3 hover:bg-white/10 transition-colors mb-3"
          >
            <div className="icon-box w-10 h-10">
              <User weight="duotone" className="w-5 h-5 text-accent-green" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-white">Вход / Регистрация</p>
              <p className="text-xs text-white/40">Связать аккаунты, история заказов</p>
            </div>
            <CaretRight weight="bold" className="w-5 h-5 text-white/30" />
          </button>
        )}
      </motion.div>

      {/* Support */}
      <motion.div
        className="mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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
            <p className="text-xs text-white/40">@rim613 • +7 999 333-32-99</p>
          </div>
          <CaretRight weight="bold" className="w-5 h-5 text-white/30" />
        </button>
      </motion.div>

      {/* Add Address Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { setShowAddForm(false); resetForm(); }}
            />
            <motion.div
              className="relative w-full max-w-lg bg-[#1a1a2e] rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Новый адрес</h2>
                <button
                  onClick={() => { setShowAddForm(false); resetForm(); }}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X weight="bold" className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* City */}
              <div className="mb-4">
                <p className="text-sm text-white/40 mb-2">Город</p>
                <div className="flex gap-2 flex-wrap">
                  {CITIES.map(city => (
                    <button
                      key={city.code}
                      onClick={() => setNewCity(city.code)}
                      className={`px-4 py-2 rounded-xl text-sm transition-all ${
                        newCity === city.code
                          ? 'bg-accent-green/20 text-accent-green border border-accent-green'
                          : 'bg-white/5 text-white/60 border border-white/10'
                      }`}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div className="mb-4">
                <p className="text-sm text-white/40 mb-2">Адрес</p>
                <input
                  type="text"
                  value={newStreet}
                  onChange={e => setNewStreet(e.target.value)}
                  placeholder="Улица"
                  className="input mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newHouse}
                    onChange={e => setNewHouse(e.target.value)}
                    placeholder="Дом"
                    className="input"
                  />
                  <input
                    type="text"
                    value={newApartment}
                    onChange={e => setNewApartment(e.target.value)}
                    placeholder="Квартира"
                    className="input"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="mb-4">
                <p className="text-sm text-white/40 mb-2">Контакт</p>
                <input
                  type="text"
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  placeholder="Имя"
                  className="input mb-2"
                />
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={e => setNewContactPhone(formatPhoneInput(e.target.value, newContactPhone))}
                  placeholder="+7 (999) 123-45-67"
                  className="input"
                />
              </div>

              {/* Label */}
              <div className="mb-4">
                <p className="text-sm text-white/40 mb-2">Название</p>
                <div className="flex gap-2">
                  {['Дом', 'Офис', 'Другой'].map(label => (
                    <button
                      key={label}
                      onClick={() => setNewLabel(label === 'Другой' ? '' : label)}
                      className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-all ${
                        (newLabel === label || (label === 'Другой' && !['Дом', 'Офис'].includes(newLabel)))
                          ? 'bg-accent-green/20 text-accent-green border border-accent-green'
                          : 'bg-white/5 text-white/60 border border-white/10'
                      }`}
                    >
                      {label === 'Дом' && <House weight="duotone" className="w-4 h-4" />}
                      {label === 'Офис' && <Buildings weight="duotone" className="w-4 h-4" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                  {formError}
                </div>
              )}

              <button
                onClick={handleAddAddress}
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? (
                  <SpinnerGap weight="bold" className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Сохранить адрес'
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
