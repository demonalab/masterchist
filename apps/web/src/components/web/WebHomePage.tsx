'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Clock, MapPin, Shield } from 'lucide-react';

export function WebHomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl">Мастерчист</span>
          </div>
          <Link href="/booking">
            <Button size="sm">Записаться</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="bg-white">
          <div className="max-w-5xl mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Профессиональная химчистка
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Качественная чистка ковров, мебели и текстиля. Работаем в Ростове-на-Дону, Батайске и Ставрополе.
            </p>
            <Link href="/booking">
              <Button size="lg" className="text-base px-8">
                Записаться на химчистку
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-10">Почему мы</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Clock className="h-10 w-10 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Быстро</h3>
                  <p className="text-sm text-gray-600">
                    Выполняем заказы в день обращения
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Shield className="h-10 w-10 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Качественно</h3>
                  <p className="text-sm text-gray-600">
                    Используем профессиональное оборудование
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <MapPin className="h-10 w-10 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Удобно</h3>
                  <p className="text-sm text-gray-600">
                    Работаем по всему городу
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Готовы записаться?</h2>
            <p className="text-gray-600 mb-6">
              Выберите удобную дату и время, мы перезвоним для подтверждения
            </p>
            <Link href="/booking">
              <Button size="lg">Записаться сейчас</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm">
          <p>© 2024 Мастерчист. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}
