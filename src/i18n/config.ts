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

// Initialize i18n
const isTest = process.env.NODE_ENV === 'test';

if (isTest) {
  // Synchronous initialization for test environment (without LanguageDetector)
  i18n
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      lng: 'en',
      debug: false,

      interpolation: {
        escapeValue: false, // React already escapes values
      },
    });
} else {
  // Asynchronous initialization for browser environment (with LanguageDetector)
  import('i18next-browser-languagedetector').then((module) => {
    const LanguageDetector = module.default;
    i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
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
  });
}

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
