import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ar from './locales/ar.json';
import { logger } from '../services/logging/RendererLogger';

export const resources = {
  en: {
    translation: en,
  },
  ar: {
    translation: ar,
  },
} as const;

// Initialize i18n synchronously to avoid hooks order issues
const isTest = process.env.NODE_ENV === 'test';

// Safely get stored language preference
const getStoredLanguage = (): string => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('i18nextLng') || '';
    }
  } catch (e) {
    logger.warn('Failed to access localStorage', { error: String(e) });
  }
  return '';
};

// Safely get browser language
const getBrowserLanguage = (): string => {
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      const langCode = navigator.language.split('-')[0];
      if (langCode) {
        return langCode;
      }
    }
  } catch (e) {
    logger.warn('Failed to detect browser language', { error: String(e) });
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: getStoredLanguage() || getBrowserLanguage(),
    debug: !isTest && process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false, // Disable Suspense to prevent hooks order issues
    },
  });

// Store language preference on change
i18n.on('languageChanged', (lng) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('i18nextLng', lng);
    }
  } catch (e) {
    logger.warn('Failed to save language preference', { error: String(e) });
  }
});

export default i18n;

// Helper function to get text direction
export const getDirection = (language: string): 'ltr' | 'rtl' => {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(language) ? 'rtl' : 'ltr';
};

// Helper function to check if language is RTL
export const isRTL = (language: string): boolean => {
  return getDirection(language) === 'rtl';
};
