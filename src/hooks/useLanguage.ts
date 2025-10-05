import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getDirection, isRTL } from '../i18n/config';

/**
 * Custom hook to manage language and RTL support
 */
export const useLanguage = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Update document direction when language changes
    const direction = getDirection(i18n.language);
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;

    // Add RTL class to body for additional styling
    if (isRTL(i18n.language)) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [i18n.language]);

  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
  };

  return {
    language: i18n.language,
    changeLanguage,
    direction: getDirection(i18n.language),
    isRTL: isRTL(i18n.language),
  };
};
