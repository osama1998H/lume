import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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

if (typeof window !== 'undefined') {
  i18n.use(LanguageDetector);
}

i18n.use(initReactI18next);

i18n.init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
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
