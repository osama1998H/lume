import toast from 'react-hot-toast';

/**
 * Toast notification utilities
 * Provides a consistent API for showing notifications throughout the app
 */

export const showToast = {
  /**
   * Show a success toast notification
   */
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
    });
  },

  /**
   * Show an error toast notification
   */
  error: (message: string) => {
    toast.error(message, {
      duration: 5000,
    });
  },

  /**
   * Show an info toast notification
   */
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      duration: 4000,
    });
  },

  /**
   * Show a loading toast notification
   * Returns a toast ID that can be used to dismiss or update the toast
   */
  loading: (message: string) => {
    return toast.loading(message);
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  /**
   * Show a promise-based toast that updates based on promise state
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },

  /**
   * Show a custom toast with undo functionality
   */
  withUndo: (message: string, onUndo: () => void) => {
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="flex-1">{message}</span>
          <button
            onClick={() => {
              onUndo();
              toast.dismiss(t.id);
            }}
            className="px-3 py-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            Undo
          </button>
        </div>
      ),
      {
        duration: 5000,
      }
    );
  },
};
