import type { Metadata, Viewport } from 'next';
import { TelegramProvider } from '@/lib/telegram-provider';
import { WaveAnimation } from '@/components/ui/WaveAnimation';
import './globals.css';

export const metadata: Metadata = {
  title: 'Химчистка самообслуживания',
  description: 'Аренда наборов для химчистки',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>
      <body>
        <TelegramProvider>
          {children}
          <WaveAnimation />
        </TelegramProvider>
      </body>
    </html>
  );
}
