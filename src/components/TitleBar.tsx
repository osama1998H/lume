import React from 'react';
import { useTranslation } from 'react-i18next';

const TitleBar: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="titlebar">
      <div className="titlebar-content">
        <div className="titlebar-logo">
          <span className="text-xl" aria-hidden="true">⏱️</span>
          <h1 className="titlebar-title">{t('app.name')}</h1>
        </div>
        <span className="titlebar-separator" aria-hidden="true">•</span>
        <div className="titlebar-tagline">{t('app.tagline')}</div>
      </div>
    </div>
  );
};

export default TitleBar;
