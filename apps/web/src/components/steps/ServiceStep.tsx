'use client';

import { useBookingStore } from '@/lib/booking-store';

const services = [
  {
    code: 'self_cleaning',
    icon: '✨',
    name: 'Химчистка самообслуживания',
    description: 'Профессиональный набор для самостоятельной чистки мебели и ковров',
    price: '500 ₽',
    duration: '24 часа',
    active: true,
    popular: true,
  },
  {
    code: 'pro_cleaning',
    icon: '👔',
    name: 'Проф. химчистка мастером',
    description: 'Опытный мастер приедет и выполнит химчистку',
    price: 'от 1500 ₽',
    duration: '2-3 часа',
    active: false,
    popular: false,
  },
  {
    code: 'cleaning',
    icon: '🏠',
    name: 'Клининг помещений',
    description: 'Комплексная уборка квартир и офисов',
    price: 'от 2000 ₽',
    duration: '3-5 часов',
    active: false,
    popular: false,
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
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-premium mb-4">
          <span className="text-3xl">🧹</span>
        </div>
        <h1 className="screen-title">МастерЧист</h1>
        <p className="screen-subtitle">Премиум сервис аренды наборов для химчистки</p>
      </div>

      {/* Services */}
      <div className="flex flex-col gap-4">
        {services.map((service, index) => (
          <button
            key={service.code}
            onClick={() => service.active && handleSelect(service.code)}
            disabled={!service.active}
            className={`option-card text-left relative overflow-hidden
              ${!service.active ? 'opacity-40 cursor-not-allowed' : ''}
              animate-slide-up`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {service.popular && (
              <div className="absolute top-3 right-3">
                <span className="badge-gold">Популярное</span>
              </div>
            )}
            
            <div className="icon-circle">
              <span>{service.icon}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white mb-1">{service.name}</div>
              <div className="text-sm text-gray-400 line-clamp-2">{service.description}</div>
              {service.active && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-500">⏱ {service.duration}</span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold gradient-text">{service.price}</div>
              {!service.active && (
                <span className="text-xs text-gray-500">Скоро</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Footer info */}
      <div className="mt-auto pt-8">
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <span>🚀</span>
            <span>Быстрая доставка по городу</span>
          </div>
        </div>
      </div>
    </div>
  );
}
