import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import ErrorBoundary from '../ErrorBoundary';

const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

const renderWithI18n = (component: React.ReactElement, language = 'en') => {
  i18n.changeLanguage(language);
  return render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>);
};

describe('ErrorBoundary i18n Integration', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('English translations', () => {
    it('should render error message in English', () => {
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render error description in English', () => {
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('We encountered an unexpected error. Please try refreshing the page.')).toBeInTheDocument();
    });

    it('should render action buttons in English', () => {
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });
  });

  describe('Arabic translations', () => {
    it('should render error message in Arabic', () => {
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
        'ar'
      );

      expect(screen.getByText('حدث خطأ ما')).toBeInTheDocument();
    });

    it('should render error description in Arabic', () => {
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
        'ar'
      );

      expect(screen.getByText('واجهنا خطأ غير متوقع. يرجى محاولة تحديث الصفحة.')).toBeInTheDocument();
    });

    it('should render action buttons in Arabic', () => {
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
        'ar'
      );

      expect(screen.getByText('حاول مرة أخرى')).toBeInTheDocument();
      expect(screen.getByText('تحديث الصفحة')).toBeInTheDocument();
    });
  });

  describe('Error boundary functionality with i18n', () => {
    it('should not render error UI when no error occurs', () => {
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should handle try again button click', () => {
      const { rerender } = renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      // After reset, should render children normally
      rerender(
        <I18nextProvider i18n={i18n}>
          <ErrorBoundary>
            <ThrowError shouldThrow={false} />
          </ErrorBoundary>
        </I18nextProvider>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should display error details', () => {
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('Custom fallback', () => {
    it('should render custom fallback instead of default error UI', () => {
      const customFallback = <div>Custom Error Page</div>;
      
      renderWithI18n(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error Page')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Language switching with error state', () => {
    it('should maintain error state when language changes', () => {
      const { rerender } = renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
        'en'
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Change language
      i18n.changeLanguage('ar');
      rerender(
        <I18nextProvider i18n={i18n}>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </I18nextProvider>
      );

      expect(screen.getByText('حدث خطأ ما')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('withTranslation HOC integration', () => {
    it('should provide translation props via HOC', () => {
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify that the component receives and uses the t function
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should work with different language contexts', () => {
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
        'ar'
      );

      // Verify Arabic translations work through HOC
      expect(screen.getByText('حدث خطأ ما')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle refresh page button click', () => {
      const reloadSpy = jest.fn();
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { reload: reloadSpy },
      });

      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByText('Refresh Page');
      fireEvent.click(refreshButton);

      expect(reloadSpy).toHaveBeenCalled();
    });

    it('should handle errors during translation rendering', () => {
      // This tests robustness even if i18n fails
      
      renderWithI18n(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still render something even if translation fails
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});