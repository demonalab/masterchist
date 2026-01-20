'use client';

import { useState, useEffect } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretLeft, MapPin, User, Phone, FloppyDisk, House, Buildings, Check, Star } from '@phosphor-icons/react';
import { api, SavedAddress } from '@/lib/api';

export function AddressStep() {
  const { draft, updateDraft, setStep } = useBookingStore();
  const [street, setStreet] = useState(draft.street || '');
  const [house, setHouse] = useState(draft.house || '');
  const [apartment, setApartment] = useState(draft.apartment || '');
  const [contactName, setContactName] = useState(draft.contactName || '');
  const [contactPhone, setContactPhone] = useState(draft.contactPhone || '');
  const [error, setError] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSavedAddresses() {
      setLoadingAddresses(true);
      const result = await api.getSavedAddresses();
      if (result.ok) {
        // Filter by current city
        const cityAddresses = result.data.filter(a => a.city === draft.city);
        setSavedAddresses(cityAddresses);
        
        // Auto-select default address
        const defaultAddr = cityAddresses.find(a => a.isDefault);
        if (defaultAddr) {
          selectSavedAddress(defaultAddr);
        }
      }
      setLoadingAddresses(false);
    }
    fetchSavedAddresses();
  }, [draft.city]);

  const selectSavedAddress = (addr: SavedAddress) => {
    setSelectedSavedAddress(addr.id);
    // Parse addressLine to street/house/apartment
    const parts = addr.addressLine.split(',').map(p => p.trim());
    setStreet(parts[0] || '');
    setHouse(parts[1] || '');
    setApartment(parts[2] || '');
    setContactName(addr.contactName);
    setContactPhone(addr.contactPhone);
    setSaveAddress(false);
  };

  const handleContinue = async () => {
    if (!street.trim()) { setError('Введите улицу'); return; }
    if (!house.trim()) { setError('Введите номер дома'); return; }
    if (!contactName.trim()) { setError('Введите имя'); return; }
    if (!contactPhone.trim()) { setError('Введите телефон'); return; }
    
    // Save address if checkbox is checked
    if (saveAddress && draft.city) {
      const addressLine = [street.trim(), house.trim(), apartment.trim()].filter(Boolean).join(', ');
      await api.createSavedAddress({
        city: draft.city,
        addressLine,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        label: addressLabel.trim() || undefined,
        isDefault: savedAddresses.length === 0,
      });
    }
    
    updateDraft({
      street: street.trim(),
      house: house.trim(),
      apartment: apartment.trim() || undefined,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
    });
    setStep('confirm');
  };
  
  const clearSelection = () => {
    setSelectedSavedAddress(null);
    setStreet('');
    setHouse('');
    setApartment('');
    setContactName('');
    setContactPhone('');
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

      <div className="flex flex-col gap-4 overflow-y-auto flex-1">
        {/* Saved addresses */}
        {!loadingAddresses && savedAddresses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <p className="text-xs text-white/40 mb-2">Сохранённые адреса</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {savedAddresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => selectSavedAddress(addr)}
                  className={`shrink-0 p-3 rounded-xl border transition-all ${
                    selectedSavedAddress === addr.id
                      ? 'bg-accent-green/20 border-accent-green'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {addr.label === 'Дом' ? (
                      <House weight="duotone" className="w-4 h-4 text-accent-green" />
                    ) : addr.label === 'Офис' ? (
                      <Buildings weight="duotone" className="w-4 h-4 text-accent-blue" />
                    ) : (
                      <MapPin weight="duotone" className="w-4 h-4 text-accent-purple" />
                    )}
                    <span className="text-sm font-medium text-white">{addr.label || 'Адрес'}</span>
                    {addr.isDefault && <Star weight="fill" className="w-3 h-3 text-yellow-400" />}
                  </div>
                  <p className="text-xs text-white/50 text-left truncate max-w-32">{addr.addressLine}</p>
                </button>
              ))}
              <button
                onClick={clearSelection}
                className={`shrink-0 p-3 rounded-xl border transition-all ${
                  selectedSavedAddress === null && street === ''
                    ? 'bg-accent-purple/20 border-accent-purple'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MapPin weight="duotone" className="w-4 h-4 text-white/60" />
                  <span className="text-sm font-medium text-white">Новый</span>
                </div>
                <p className="text-xs text-white/50">Ввести вручную</p>
              </button>
            </div>
          </motion.div>
        )}

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

        {/* Save address checkbox */}
        {!selectedSavedAddress && (
          <motion.div
            className="glass-card-static p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <div 
                onClick={() => setSaveAddress(!saveAddress)}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  saveAddress 
                    ? 'bg-accent-green border-accent-green' 
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                {saveAddress && <Check weight="bold" className="w-4 h-4 text-black" />}
              </div>
              <div className="flex-1" onClick={() => setSaveAddress(!saveAddress)}>
                <p className="text-sm font-medium text-white">Сохранить адрес</p>
                <p className="text-xs text-white/40">Для быстрого заказа в будущем</p>
              </div>
              <FloppyDisk weight="duotone" className="w-5 h-5 text-white/30" />
            </label>
            
            <AnimatePresence>
              {saveAddress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 mt-3 border-t border-white/10">
                    <p className="text-xs text-white/40 mb-2">Название адреса</p>
                    <div className="flex gap-2">
                      {['Дом', 'Офис', 'Другой'].map((label) => (
                        <button
                          key={label}
                          onClick={() => setAddressLabel(label === 'Другой' ? '' : label)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                            (addressLabel === label || (label === 'Другой' && !['Дом', 'Офис'].includes(addressLabel)))
                              ? 'bg-accent-green/20 text-accent-green border border-accent-green'
                              : 'bg-white/5 text-white/60 border border-white/10'
                          }`}
                        >
                          {label === 'Дом' && <House weight="duotone" className="w-4 h-4 inline mr-1" />}
                          {label === 'Офис' && <Buildings weight="duotone" className="w-4 h-4 inline mr-1" />}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

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
