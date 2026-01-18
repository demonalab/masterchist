'use client';

import { useBookingStore } from '@/lib/booking-store';

const cities = [
  { code: 'ROSTOV_NA_DONU', name: 'Ростов-на-Дону' },
  { code: 'BATAYSK', name: 'Батайск' },
  { code: 'STAVROPOL', name: 'Ставрополь' },
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
      <h1 className="screen-title">Выберите город</h1>

      <div className="flex flex-col gap-3">
        {cities.map((city) => (
          <button
            key={city.code}
            onClick={() => handleSelect(city.code, city.name)}
            className="option-card"
          >
            <span className="text-xl">📍</span>
            <span className="font-medium">{city.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <button onClick={handleBack} className="btn-secondary">
          ← Назад
        </button>
      </div>
    </div>
  );
}
