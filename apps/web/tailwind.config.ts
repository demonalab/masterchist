import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: 'var(--tg-theme-bg-color, #ffffff)',
          text: 'var(--tg-theme-text-color, #000000)',
          hint: 'var(--tg-theme-hint-color, #999999)',
          link: 'var(--tg-theme-link-color, #2481cc)',
          button: 'var(--tg-theme-button-color, #2481cc)',
          'button-text': 'var(--tg-theme-button-text-color, #ffffff)',
          secondary: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
        },
        premium: {
          gold: '#D4AF37',
          'gold-light': '#F4E4BC',
          dark: '#1a1a2e',
          'dark-light': '#16213e',
          accent: '#0f3460',
          purple: '#7C3AED',
          'purple-light': '#A78BFA',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-premium': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-gold': 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        'gradient-purple': 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
      },
      boxShadow: {
        'premium': '0 10px 40px -10px rgba(124, 58, 237, 0.3)',
        'premium-lg': '0 20px 60px -15px rgba(124, 58, 237, 0.4)',
        'gold': '0 10px 40px -10px rgba(212, 175, 55, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
