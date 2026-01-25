import type { Metadata, Viewport } from 'next';
import { TelegramProvider } from '@/lib/telegram-provider';
import { WaveAnimation } from '@/components/ui/WaveAnimation';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/lib/query-provider';
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
        {/* Telegram Web App SDK */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
        {/* MAX Web App SDK */}
        <script src="https://st.max.ru/js/max-web-app.js" />
      </head>
      <body>
        <QueryProvider>
          <TelegramProvider>
            {children}
            <WaveAnimation />
          </TelegramProvider>
        </QueryProvider>
        <Toaster 
          position="bottom-center" 
          theme="dark"
          offset="80px"
          toastOptions={{
            style: {
              background: 'rgba(30, 30, 35, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
