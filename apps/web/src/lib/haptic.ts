'use client';

import { useCallback } from 'react';

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'error' | 'success' | 'warning';

interface HapticFeedback {
  impactOccurred: (style: ImpactStyle) => void;
  notificationOccurred: (type: NotificationType) => void;
  selectionChanged: () => void;
}

function getHapticFeedback(): HapticFeedback | null {
  if (typeof window === 'undefined') return null;
  
  // Try Telegram WebApp
  const tgWebApp = (window as any).Telegram?.WebApp;
  if (tgWebApp?.HapticFeedback) {
    return tgWebApp.HapticFeedback;
  }
  
  // Try MAX WebApp
  const maxWebApp = (window as any).WebApp;
  if (maxWebApp?.HapticFeedback) {
    return maxWebApp.HapticFeedback;
  }
  
  return null;
}

export function useHaptic() {
  const impact = useCallback((style: ImpactStyle = 'light') => {
    const haptic = getHapticFeedback();
    if (haptic) {
      try {
        haptic.impactOccurred(style);
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);

  const notification = useCallback((type: NotificationType) => {
    const haptic = getHapticFeedback();
    if (haptic) {
      try {
        haptic.notificationOccurred(type);
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);

  const selection = useCallback(() => {
    const haptic = getHapticFeedback();
    if (haptic) {
      try {
        haptic.selectionChanged();
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);

  return {
    impact,
    notification,
    selection,
    // Convenience methods
    light: () => impact('light'),
    medium: () => impact('medium'),
    heavy: () => impact('heavy'),
    success: () => notification('success'),
    error: () => notification('error'),
    warning: () => notification('warning'),
  };
}
