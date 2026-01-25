'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowSquareOut } from '@phosphor-icons/react';

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = 'Фото', onClose }: ImageLightboxProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (src) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [src, handleKeyDown]);

  const handleOpenInBrowser = () => {
    if (!src) return;
    window.open(src, '_blank');
  };

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 20px)', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Image container - centered */}
          <div className="flex-1 flex items-center justify-center w-full h-full">
            <motion.img
              src={src}
              alt={alt}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Bottom buttons - with safe area */}
          <div 
            className="absolute left-0 right-0 z-10 flex items-center justify-center gap-4 px-4"
            style={{ bottom: 'max(env(safe-area-inset-bottom, 20px), 24px)' }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenInBrowser();
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent-green text-black text-sm font-bold shadow-lg active:scale-95 transition-transform"
            >
              <ArrowSquareOut weight="bold" className="w-5 h-5" />
              Открыть
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <X weight="bold" className="w-6 h-6 text-white" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
