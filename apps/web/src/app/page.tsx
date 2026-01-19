'use client';

import { useEffect, Suspense } from 'react';
import { useBookingStore } from '@/lib/booking-store';
import { useTelegram } from '@/lib/telegram-provider';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ServiceStep,
  CityStep,
  DateStep,
  TimeStep,
  AddressStep,
  ConfirmStep,
  SuccessStep,
} from '@/components/steps';
import { MyOrdersStep } from '@/components/steps/MyOrdersStep';
import { HelpStep } from '@/components/steps/HelpStep';
import { WebHomePage } from '@/components/web/WebHomePage';

function HomeContent() {
  const { step, error, setError, setStep } = useBookingStore();
  const { isReady, isTelegram } = useTelegram();
  const searchParams = useSearchParams();
  const devMode = searchParams.get('dev') === '1';

  // Scroll to top on mount and step change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [step]);

  useEffect(() => {
    if (devMode) {
      api.setDevMode(true);
    }
  }, [devMode]);

  if (!isReady) {
    return (
      <div className="screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tg-button" />
      </div>
    );
  }

  if (!isTelegram && !devMode) {
    return <WebHomePage />;
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

  const handleBackToService = () => setStep('service');

  if (step === 'orders') {
    return <MyOrdersStep onBack={handleBackToService} />;
  }
  
  if (step === 'help') {
    return <HelpStep onBack={handleBackToService} />;
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

  if (!StepComponent) {
    return <ServiceStep />;
  }

  return <StepComponent />;
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tg-button" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
