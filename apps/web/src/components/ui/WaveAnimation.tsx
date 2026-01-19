'use client';

import { motion } from 'framer-motion';

export function WaveAnimation() {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none overflow-hidden z-0">
      {/* Background fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
      
      {/* Wave layers */}
      <svg 
        className="absolute bottom-0 w-full h-full"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.1)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.2)" />
            <stop offset="100%" stopColor="rgba(168, 85, 247, 0.1)" />
          </linearGradient>
          <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.15)" />
            <stop offset="50%" stopColor="rgba(34, 197, 94, 0.25)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.15)" />
          </linearGradient>
          <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.1)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0.1)" />
          </linearGradient>
        </defs>
        
        {/* Wave 1 - Back layer */}
        <motion.path
          fill="url(#waveGradient1)"
          animate={{
            d: [
              "M0,60 C240,100 480,20 720,60 C960,100 1200,20 1440,60 L1440,120 L0,120 Z",
              "M0,50 C240,20 480,90 720,50 C960,20 1200,90 1440,50 L1440,120 L0,120 Z",
              "M0,70 C240,90 480,30 720,70 C960,90 1200,30 1440,70 L1440,120 L0,120 Z",
              "M0,60 C240,100 480,20 720,60 C960,100 1200,20 1440,60 L1440,120 L0,120 Z",
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Wave 2 - Middle layer */}
        <motion.path
          fill="url(#waveGradient2)"
          animate={{
            d: [
              "M0,70 C360,40 720,100 1080,70 C1260,55 1350,80 1440,70 L1440,120 L0,120 Z",
              "M0,80 C360,110 720,50 1080,80 C1260,95 1350,60 1440,80 L1440,120 L0,120 Z",
              "M0,65 C360,30 720,95 1080,65 C1260,50 1350,85 1440,65 L1440,120 L0,120 Z",
              "M0,70 C360,40 720,100 1080,70 C1260,55 1350,80 1440,70 L1440,120 L0,120 Z",
            ],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
        
        {/* Wave 3 - Front layer */}
        <motion.path
          fill="url(#waveGradient3)"
          animate={{
            d: [
              "M0,85 C180,70 360,100 540,85 C720,70 900,100 1080,85 C1260,70 1350,95 1440,85 L1440,120 L0,120 Z",
              "M0,90 C180,105 360,75 540,90 C720,105 900,75 1080,90 C1260,105 1350,80 1440,90 L1440,120 L0,120 Z",
              "M0,80 C180,65 360,95 540,80 C720,65 900,95 1080,80 C1260,65 1350,90 1440,80 L1440,120 L0,120 Z",
              "M0,85 C180,70 360,100 540,85 C720,70 900,100 1080,85 C1260,70 1350,95 1440,85 L1440,120 L0,120 Z",
            ],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </svg>
      
      {/* Glow effect */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-20"
        style={{
          background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(10px)',
        }}
      />
    </div>
  );
}
