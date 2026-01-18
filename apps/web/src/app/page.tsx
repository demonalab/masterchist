'use client';

import { useBookingStore } from '@/lib/booking-store';
import { useTelegram } from '@/lib/telegram-provider';
import {
  ServiceStep,
  CityStep,
  DateStep,
  TimeStep,
  AddressStep,
  ConfirmStep,
  SuccessStep,
} from '@/components/steps';

export default function HomePage() {
  const { step, error, setError } = useBookingStore();
  const { isReady } = useTelegram();

  if (!isReady) {
    return (
      <div className="screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tg-button" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen items-center justify-center">
        <div className="card text-center max-w-sm">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="font-bold mb-2">Ошибка</h2>
          <p className="text-tg-hint mb-4">{error}</p>
          <button onClick={() => setError(null)} className="btn-primary">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const StepComponent = {
    service: ServiceStep,
    city: CityStep,
    date: DateStep,
    time: TimeStep,
    address: AddressStep,
    confirm: ConfirmStep,
    success: SuccessStep,
  }[step];

  return <StepComponent />;
}
