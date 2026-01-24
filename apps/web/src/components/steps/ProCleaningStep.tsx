'use client';

import { useState, useRef } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CaretLeft, Camera, X, SpinnerGap, Check, MapPin, User, Phone,
  Image as ImageIcon, FileText
} from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { formatPhoneInput, isValidPhone } from '@/lib/phone-utils';

const CITIES = [
  { code: 'ROSTOV_NA_DONU', name: 'Ростов-на-Дону' },
  { code: 'BATAYSK', name: 'Батайск' },
  { code: 'STAVROPOL', name: 'Ставрополь' },
];

export function ProCleaningStep() {
  const { setStep } = useBookingStore();
  const [currentStep, setCurrentStep] = useState<'city' | 'details' | 'contact' | 'success'>('city');
  
  // Form state
  const [city, setCity] = useState('');
  const [cityName, setCityName] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingId, setBookingId] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => {
    if (currentStep === 'city') {
      setStep('service');
    } else if (currentStep === 'details') {
      setCurrentStep('city');
    } else if (currentStep === 'contact') {
      setCurrentStep('details');
    }
  };

  const handleCitySelect = (cityCode: string, name: string) => {
    setCity(cityCode);
    setCityName(name);
    setCurrentStep('details');
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newPhotos = Array.from(files).slice(0, 5 - photos.length);
    setPhotos(prev => [...prev, ...newPhotos]);
    
    // Create previews
    newPhotos.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotosPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoRemove = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotosPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDetailsNext = () => {
    if (!description.trim()) {
      setError('Опишите загрязнения');
      return;
    }
    if (photos.length === 0) {
      setError('Добавьте хотя бы одно фото');
      return;
    }
    setError('');
    setCurrentStep('contact');
  };

  const handleSubmit = async () => {
    if (!address.trim()) { setError('Введите адрес'); return; }
    if (!contactName.trim()) { setError('Введите имя'); return; }
    if (!contactPhone.trim()) { setError('Введите телефон'); return; }
    if (!isValidPhone(contactPhone)) { setError('Неверный формат телефона'); return; }
    
    setLoading(true);
    setError('');
    
    try {
      const addressParts = address.split(',').map(p => p.trim());
      
      // Create booking with description
      const result = await api.createBooking({
        serviceCode: 'pro_cleaning',
        city,
        address: {
          city: cityName,
          street: addressParts[0] || address,
          house: addressParts[1] || '1',
          apartment: addressParts[2],
        },
        contact: {
          name: contactName,
          phone: contactPhone,
        },
        proCleaningDetails: description,
      });
      
      if (result.ok) {
        const newBookingId = result.data.id;
        
        // Upload photos
        for (const photo of photos) {
          await api.uploadProCleaningPhoto(newBookingId, photo);
        }
        
        setBookingId(newBookingId);
        setCurrentStep('success');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Произошла ошибка');
    }
    
    setLoading(false);
  };

  const stepNumber = currentStep === 'city' ? 1 : currentStep === 'details' ? 2 : currentStep === 'contact' ? 3 : 4;

  if (currentStep === 'success') {
    return (
      <div className="screen items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          <div className="w-20 h-20 rounded-full bg-accent-green flex items-center justify-center mx-auto mb-5">
            <Check weight="bold" className="w-10 h-10 text-black" />
          </div>
        </motion.div>
        <h1 className="text-2xl font-bold text-white mb-2">Заявка создана!</h1>
        <p className="text-white/40 text-sm mb-1">ID: {bookingId.slice(0, 8).toUpperCase()}</p>
        <p className="text-white/60 text-sm max-w-xs mx-auto mt-4">
          Мастер свяжется с вами для оценки стоимости и согласования времени
        </p>
        <button
          onClick={() => setStep('service')}
          className="btn-primary mt-8"
        >
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className="screen relative overflow-hidden">
      <div className="floating-glow bg-accent-purple top-40 -right-20 animate-glow-pulse" />

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
        <p className="label-sm">Шаг {stepNumber} из 3</p>
        <h1 className="text-hero">
          {currentStep === 'city' && <>Где <span className="text-hero-accent">находитесь?</span></>}
          {currentStep === 'details' && <>Что <span className="text-hero-accent">почистить?</span></>}
          {currentStep === 'contact' && <>Куда <span className="text-hero-accent">приехать?</span></>}
        </h1>
      </motion.div>

      {/* City selection */}
      {currentStep === 'city' && (
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {CITIES.map((c, index) => (
            <motion.button
              key={c.code}
              onClick={() => handleCitySelect(c.code, c.name)}
              className="glass-card-static p-4 w-full flex items-center gap-4 hover:bg-white/10 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="icon-box w-10 h-10">
                <MapPin weight="duotone" className="w-5 h-5 text-accent-purple" />
              </div>
              <span className="font-medium text-white">{c.name}</span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Details */}
      {currentStep === 'details' && (
        <div className="space-y-4">
          <motion.div 
            className="glass-card-static p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-box w-10 h-10">
                <FileText weight="duotone" className="w-5 h-5 text-accent-purple" />
              </div>
              <p className="font-medium text-white">Описание</p>
            </div>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setError(''); }}
              placeholder="Опишите загрязнения: тип поверхности, вид пятен, размер..."
              className="input min-h-[100px] resize-none"
              rows={4}
            />
          </motion.div>

          <motion.div 
            className="glass-card-static p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-box w-10 h-10">
                <Camera weight="duotone" className="w-5 h-5 text-accent-green" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Фото</p>
                <p className="text-xs text-white/40">{photos.length}/5 фото</p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {photosPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handlePhotoRemove(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X weight="bold" className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              
              {photos.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/40 transition-colors"
                >
                  <Camera weight="duotone" className="w-6 h-6 text-white/40" />
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoAdd}
              className="hidden"
            />
          </motion.div>

          {error && (
            <motion.div 
              className="glass-card-static p-4 border-accent-red/30 text-accent-red text-center text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.div>
          )}

          <div className="pt-4">
            <button onClick={handleDetailsNext} className="btn-primary">
              Продолжить
            </button>
          </div>
        </div>
      )}

      {/* Contact */}
      {currentStep === 'contact' && (
        <div className="space-y-4">
          <motion.div 
            className="glass-card-static p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-box w-10 h-10">
                <MapPin weight="duotone" className="w-5 h-5 text-accent-green" />
              </div>
              <p className="font-medium text-white">Адрес</p>
            </div>
            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setError(''); }}
              placeholder="Улица, дом, квартира"
              className="input"
            />
          </motion.div>

          <motion.div 
            className="glass-card-static p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
                  onChange={(e) => { 
                    setContactPhone(formatPhoneInput(e.target.value, contactPhone)); 
                    setError(''); 
                  }}
                  placeholder="+7 (999) 123-45-67"
                  className="input pl-12"
                />
              </div>
            </div>
          </motion.div>

          {error && (
            <motion.div 
              className="glass-card-static p-4 border-accent-red/30 text-accent-red text-center text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.div>
          )}

          <div className="pt-4">
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <SpinnerGap weight="bold" className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Отправить заявку'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
