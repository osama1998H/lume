import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ar from './locales/ar.json';

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
    console.warn('Failed to access localStorage:', e);
  }
  return '';
};

// Safely get browser language
const getBrowserLanguage = (): string => {
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language.split('-')[0];
    }
  } catch (e) {
    console.warn('Failed to detect browser language:', e);
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
    console.warn('Failed to save language preference:', e);
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
