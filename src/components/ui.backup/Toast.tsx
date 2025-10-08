import { Toaster } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Toast notification container component
 * Provides a centralized toast notification system with theme support
 */
const ToastContainer: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: theme === 'dark' ? '#1F2937' : '#FFFFFF',
          color: theme === 'dark' ? '#F9FAFB' : '#111827',
          border: theme === 'dark' ? '1px solid #374151' : '1px solid #E5E7EB',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        // Success toast
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10B981',
            secondary: '#FFFFFF',
          },
        },
        // Error toast
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#EF4444',
            secondary: '#FFFFFF',
          },
        },
        // Loading toast
        loading: {
          iconTheme: {
            primary: '#3B82F6',
            secondary: '#FFFFFF',
          },
        },
      }}
    />
  );
};

export default ToastContainer;
