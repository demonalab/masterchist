'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getTelegramWebApp, TelegramWebApp, isTelegramWebApp } from './telegram';

interface TelegramContextValue {
  webApp: TelegramWebApp | null;
  isReady: boolean;
  initData: string;
  isTelegram: boolean;
}

const TelegramContext = createContext<TelegramContextValue>({
  webApp: null,
  isReady: false,
  initData: '',
  isTelegram: false,
});

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const tgWebApp = getTelegramWebApp();
    const isRealTelegram = isTelegramWebApp();

    if (tgWebApp && isRealTelegram) {
      tgWebApp.ready();
      tgWebApp.expand();
      setWebApp(tgWebApp);
      setIsTelegram(true);
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
    } else {
      setIsReady(true);
    }
  }, []);

  return (
    <TelegramContext.Provider
      value={{
        webApp,
        isReady,
        initData: webApp?.initData ?? '',
        isTelegram,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  return useContext(TelegramContext);
}
