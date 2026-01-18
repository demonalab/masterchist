'use client';

import { useBookingStore } from '@/lib/booking-store';

const cities = [
  { code: 'ROSTOV_NA_DONU', name: 'Ростов-на-Дону', icon: '🏙️', available: true },
  { code: 'BATAYSK', name: 'Батайск', icon: '🌆', available: true },
  { code: 'STAVROPOL', name: 'Ставрополь', icon: '🏛️', available: true },
];

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
    <div className="screen">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <span>←</span>
          <span>Назад</span>
        </button>
        <h1 className="screen-title">Выберите город</h1>
        <p className="screen-subtitle">Мы работаем в этих городах</p>
      </div>

      {/* Cities */}
      <div className="flex flex-col gap-4">
        {cities.map((city, index) => (
          <button
            key={city.code}
            onClick={() => handleSelect(city.code, city.name)}
            className="option-card animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="icon-circle">
              <span>{city.icon}</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white">{city.name}</div>
              <div className="text-sm text-gray-400">Доставка доступна</div>
            </div>
            <div className="text-purple-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Info */}
      <div className="mt-auto pt-8">
        <div className="card text-center">
          <div className="text-gray-400 text-sm">
            <span>📦</span> Доставка в день заказа
          </div>
        </div>
      </div>
    </div>
  );
}
