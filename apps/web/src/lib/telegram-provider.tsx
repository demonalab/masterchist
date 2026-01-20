'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getTelegramWebApp, TelegramWebApp, isTelegramWebApp } from './telegram';

type Platform = 'telegram' | 'max' | 'web';

interface WebAppContextValue {
  webApp: TelegramWebApp | null;
  maxWebApp: any | null;
  isReady: boolean;
  initData: string;
  platform: Platform;
  isTelegram: boolean;
  isMax: boolean;
}

const WebAppContext = createContext<WebAppContextValue>({
  webApp: null,
  maxWebApp: null,
  isReady: false,
  initData: '',
  platform: 'web',
  isTelegram: false,
  isMax: false,
});

// Check if running inside MAX
function isMaxWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  const maxWebApp = (window as any).WebApp;
  // MAX WebApp has initData with user info
  return !!(maxWebApp?.initData && maxWebApp?.platform && !isTelegramWebApp());
}

function getMaxWebApp(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).WebApp || null;
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [maxWebApp, setMaxWebApp] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [platform, setPlatform] = useState<Platform>('web');

  useEffect(() => {
    // Small delay to ensure SDKs are loaded
    const init = () => {
      const tgWebApp = getTelegramWebApp();
      const isRealTelegram = isTelegramWebApp();
      const isRealMax = isMaxWebApp();
      const maxApp = getMaxWebApp();

      if (isRealTelegram && tgWebApp) {
        // Running inside Telegram
        tgWebApp.ready();
        tgWebApp.expand();
        
        setTimeout(() => {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
        }, 0);
        
        setWebApp(tgWebApp);
        setPlatform('telegram');
        setIsReady(true);

        if (tgWebApp.themeParams) {
          const root = document.documentElement;
          const tp = tgWebApp.themeParams;
          if (tp.bg_color) root.style.setProperty('--tg-theme-bg-color', tp.bg_color);
          if (tp.text_color) root.style.setProperty('--tg-theme-text-color', tp.text_color);
          if (tp.hint_color) root.style.setProperty('--tg-theme-hint-color', tp.hint_color);
          if (tp.link_color) root.style.setProperty('--tg-theme-link-color', tp.link_color);
          if (tp.button_color) root.style.setProperty('--tg-theme-button-color', tp.button_color);
          if (tp.button_text_color) root.style.setProperty('--tg-theme-button-text-color', tp.button_text_color);
          if (tp.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', tp.secondary_bg_color);
        }
      } else if (isRealMax && maxApp) {
        // Running inside MAX
        maxApp.ready();
        
        setTimeout(() => {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }, 0);
        
        setMaxWebApp(maxApp);
        setPlatform('max');
        setIsReady(true);
        
        console.log('MAX WebApp initialized:', maxApp.initDataUnsafe);
      } else {
        // Regular web browser
        setPlatform('web');
        setIsReady(true);
      }
    };

    // Give SDKs time to initialize
    setTimeout(init, 50);
  }, []);

  const initData = platform === 'telegram' 
    ? (webApp?.initData ?? '') 
    : platform === 'max' 
      ? (maxWebApp?.initData ?? '')
      : '';

  return (
    <WebAppContext.Provider
      value={{
        webApp,
        maxWebApp,
        isReady,
        initData,
        platform,
        isTelegram: platform === 'telegram',
        isMax: platform === 'max',
      }}
    >
      {children}
    </WebAppContext.Provider>
  );
}

export function useTelegram() {
  return useContext(WebAppContext);
}
