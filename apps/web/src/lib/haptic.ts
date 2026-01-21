'use client';

import { useCallback } from 'react';

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'error' | 'success' | 'warning';

interface HapticFeedback {
  impactOccurred: (style: ImpactStyle) => void;
  notificationOccurred: (type: NotificationType) => void;
  selectionChanged: () => void;
}

function isVersionAtLeast(version: string, minVersion: string): boolean {
  const v1 = version.split('.').map(Number);
  const v2 = minVersion.split('.').map(Number);
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const a = v1[i] || 0;
    const b = v2[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return true;
}

function getHapticFeedback(): HapticFeedback | null {
  if (typeof window === 'undefined') return null;
  
  // Try Telegram WebApp - HapticFeedback requires version 6.1+
  // Only use if we're actually inside Telegram (has initData)
  const tgWebApp = (window as any).Telegram?.WebApp;
  if (tgWebApp?.HapticFeedback && tgWebApp.initData && tgWebApp.version && isVersionAtLeast(tgWebApp.version, '6.1')) {
    return tgWebApp.HapticFeedback;
  }
  
  // Try MAX WebApp - only use if we're actually inside MAX (has initData)
  const maxWebApp = (window as any).WebApp;
  if (maxWebApp?.HapticFeedback && maxWebApp.initData && (!maxWebApp.version || isVersionAtLeast(maxWebApp.version, '6.1'))) {
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
