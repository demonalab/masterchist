'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, ArrowSquareOut, CaretLeft, CaretRight } from '@phosphor-icons/react';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, alt = 'Фото', onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const lastTouchDistance = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSrc = images[currentIndex] || null;
  const hasMultiple = images.length > 1;

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      resetZoom();
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, images.length, resetZoom]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      resetZoom();
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, resetZoom]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    if (images.length > 0) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [images.length, handleKeyDown]);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    resetZoom();
  }, [initialIndex, resetZoom]);

  const handleOpenInBrowser = () => {
    if (!currentSrc) return;
    window.open(currentSrc, '_blank');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPinching(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      lastTouchDistance.current = distance;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null && isPinching) {
      e.preventDefault();
      e.stopPropagation();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scaleChange = distance / lastTouchDistance.current;
      const newScale = Math.min(Math.max(scale * scaleChange, 1), 4);
      setScale(newScale);
      lastTouchDistance.current = distance;

      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistance.current = null;
    setTimeout(() => setIsPinching(false), 100);
  };

  const handleDoubleTap = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (scale > 1) {
      setPosition(prev => ({
        x: prev.x + info.offset.x,
        y: prev.y + info.offset.y,
      }));
    } else if (hasMultiple) {
      if (info.offset.x < -50 && info.velocity.x < -100) {
        goNext();
      } else if (info.offset.x > 50 && info.velocity.x > 100) {
        goPrev();
      }
    }
  };

  if (images.length === 0) return null;

  return (
    <AnimatePresence>
      {currentSrc && (
        <motion.div
          ref={containerRef}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          style={{ paddingTop: 'env(safe-area-inset-top, 20px)', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={scale === 1 ? onClose : undefined}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Counter */}
          {hasMultiple && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* Navigation arrows */}
          {hasMultiple && currentIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
            >
              <CaretLeft weight="bold" className="w-6 h-6 text-white" />
            </button>
          )}
          {hasMultiple && currentIndex < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
            >
              <CaretRight weight="bold" className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Image container */}
          <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
            <motion.img
              key={currentIndex}
              src={currentSrc}
              alt={`${alt} ${currentIndex + 1}`}
              className="max-w-full max-h-[70vh] object-contain rounded-lg select-none touch-none"
              style={{
                scale,
                x: position.x,
                y: position.y,
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: scale, opacity: 1, x: position.x, y: position.y }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={handleDoubleTap}
              drag={!isPinching && (scale > 1 || hasMultiple)}
              dragConstraints={scale > 1 ? undefined : { left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={scale > 1 ? 0.1 : 0.5}
              onDragEnd={isPinching ? undefined : handleDragEnd}
            />
          </div>

          {/* Thumbnails */}
          {hasMultiple && (
            <div className="flex justify-center gap-2 px-4 py-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); resetZoom(); setCurrentIndex(i); }}
                  className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    i === currentIndex ? 'border-accent-green scale-110' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Bottom buttons */}
          <div 
            className="flex items-center justify-center gap-4 px-4 py-4"
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
