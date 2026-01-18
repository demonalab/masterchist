'use client';

import { useBookingStore } from '@/lib/booking-store';

const services = [
  {
    code: 'self_cleaning',
    name: '🧹 Химчистка самообслуживания',
    description: 'Аренда набора для самостоятельной чистки',
    price: '500 ₽',
    active: true,
  },
  {
    code: 'pro_cleaning',
    name: '👔 Проф. химчистка мастером',
    description: 'Мастер приедет и почистит',
    price: 'от 1500 ₽',
    active: false,
  },
  {
    code: 'cleaning',
    name: '🏠 Клининг',
    description: 'Уборка помещений',
    price: 'от 2000 ₽',
    active: false,
  },
];

export function ServiceStep() {
  const { updateDraft, setStep } = useBookingStore();

  const handleSelect = (code: string) => {
    updateDraft({ serviceCode: code });
    setStep('city');
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Выберите услугу</h1>

      <div className="flex flex-col gap-3">
        {services.map((service) => (
          <button
            key={service.code}
            onClick={() => service.active && handleSelect(service.code)}
            disabled={!service.active}
            className={`option-card text-left ${
              !service.active ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className="flex-1">
              <div className="font-medium">{service.name}</div>
              <div className="text-sm text-tg-hint">{service.description}</div>
            </div>
            <div className="text-tg-button font-medium">{service.price}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
