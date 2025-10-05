/**
 * Unit tests for sentry.ts
 * Tests Sentry initialization and error tracking functions
 */

import * as Sentry from '@sentry/electron/main';
import { app } from 'electron';
import {
  initializeSentry,
  captureException,
  setUserContext,
  clearUserContext,
} from '../sentry';

// Mock Sentry module
jest.mock('@sentry/electron/main', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  withScope: jest.fn((callback) => {
    const mockScope = {
      setContext: jest.fn(),
    };
    callback(mockScope);
  }),
  setUser: jest.fn(),
}));

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn(() => '1.0.0'),
  },
}));

describe('sentry', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    
    // Restore console
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('initializeSentry', () => {
    it('should skip initialization when DSN is not configured', () => {
      delete process.env.SENTRY_DSN;
      
      initializeSentry();
      
      expect(Sentry.init).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Sentry DSN not configured, skipping initialization');
    });

    it('should skip initialization when DSN is placeholder', () => {
      process.env.SENTRY_DSN = 'your_sentry_dsn_here';
      
      initializeSentry();
      
      expect(Sentry.init).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Sentry DSN not configured, skipping initialization');
    });

    it('should skip initialization in development without explicit enable', () => {
      process.env.NODE_ENV = 'development';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      delete process.env.SENTRY_ENABLE_DEV;
      
      initializeSentry();
      
      expect(Sentry.init).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Sentry disabled in development environment');
    });

    it('should initialize in development when explicitly enabled', () => {
      process.env.NODE_ENV = 'development';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.SENTRY_ENABLE_DEV = 'true';
      
      initializeSentry();
      
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          environment: 'development',
          release: 'lume@1.0.0',
          tracesSampleRate: 0.1,
          sendDefaultPii: false,
        })
      );
    });

    it('should initialize in production with correct sample rate', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      
      initializeSentry();
      
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 1.0,
        })
      );
    });

    it('should use SENTRY_ENVIRONMENT over NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_ENVIRONMENT = 'staging';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      
      initializeSentry();
      
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'staging',
        })
      );
    });

    it('should include correct release version', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      
      initializeSentry();
      
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          release: 'lume@1.0.0',
        })
      );
    });

    it('should include beforeSend hook', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      
      initializeSentry();
      
      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      expect(initCall.beforeSend).toBeDefined();
      expect(typeof initCall.beforeSend).toBe('function');
    });

    it('should include ignoreErrors configuration', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      
      initializeSentry();
      
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          ignoreErrors: [
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            'Network request failed',
          ],
        })
      );
    });

    it('should handle initialization errors gracefully', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      
      const error = new Error('Failed to initialize');
      (Sentry.init as jest.Mock).mockImplementation(() => {
        throw error;
      });
      
      initializeSentry();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize Sentry:', error);
    });

    it('should log success message on initialization', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      
      initializeSentry();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Sentry initialized successfully in production mode');
    });
  });

  describe('beforeSend hook', () => {
    let beforeSend: (event: any, hint: any) => any;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      
      initializeSentry();
      
      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      beforeSend = initCall.beforeSend;
    });

    it('should remove user IP address', () => {
      const event = {
        user: {
          id: 'user-123',
          ip_address: '192.168.1.1',
          username: 'testuser',
        },
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.user?.ip_address).toBeUndefined();
      expect(result?.user?.id).toBe('user-123');
      expect(result?.user?.username).toBe('testuser');
    });

    it('should remove user email', () => {
      const event = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
        },
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.user?.email).toBeUndefined();
      expect(result?.user?.id).toBe('user-123');
    });

    it('should sanitize sensitive URL parameters', () => {
      const event = {
        request: {
          url: 'https://api.example.com/data?token=secret123&key=value&normal=param',
        },
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.request?.url).toContain('token=[REDACTED]');
      expect(result?.request?.url).toContain('key=[REDACTED]');
      expect(result?.request?.url).toContain('normal=param');
    });

    it('should sanitize password in URL', () => {
      const event = {
        request: {
          url: 'https://api.example.com/login?password=secret123',
        },
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.request?.url).toContain('password=[REDACTED]');
    });

    it('should sanitize secret in URL', () => {
      const event = {
        request: {
          url: 'https://api.example.com/data?secret=topsecret',
        },
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.request?.url).toContain('secret=[REDACTED]');
    });

    it('should sanitize api_key in URL', () => {
      const event = {
        request: {
          url: 'https://api.example.com/data?api_key=12345',
        },
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.request?.url).toContain('api_key=[REDACTED]');
    });

    it('should handle invalid URLs gracefully', () => {
      const event = {
        request: {
          url: 'not-a-valid-url',
        },
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.request?.url).toBe('not-a-valid-url');
    });

    it('should sanitize breadcrumb data', () => {
      const event = {
        breadcrumbs: [
          {
            type: 'http',
            data: {
              url: 'https://api.example.com',
              password: 'secret',
              token: 'token123',
              normal: 'value',
            },
          },
        ],
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.breadcrumbs?.[0].data.password).toBe('[REDACTED]');
      expect(result?.breadcrumbs?.[0].data.token).toBe('[REDACTED]');
      expect(result?.breadcrumbs?.[0].data.normal).toBe('value');
    });

    it('should sanitize multiple breadcrumbs', () => {
      const event = {
        breadcrumbs: [
          { data: { password: 'secret1' } },
          { data: { token: 'token123' } },
          { data: { key: 'key456', normal: 'value' } },
        ],
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.breadcrumbs?.[0].data.password).toBe('[REDACTED]');
      expect(result?.breadcrumbs?.[1].data.token).toBe('[REDACTED]');
      expect(result?.breadcrumbs?.[2].data.key).toBe('[REDACTED]');
      expect(result?.breadcrumbs?.[2].data.normal).toBe('value');
    });

    it('should sanitize apiKey in breadcrumbs', () => {
      const event = {
        breadcrumbs: [
          { data: { apiKey: 'key123' } },
        ],
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.breadcrumbs?.[0].data.apiKey).toBe('[REDACTED]');
    });

    it('should handle breadcrumbs without data', () => {
      const event = {
        breadcrumbs: [
          { type: 'navigation', message: 'Navigated to /page' },
        ],
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.breadcrumbs?.[0]).toEqual({
        type: 'navigation',
        message: 'Navigated to /page',
      });
    });

    it('should handle events without user', () => {
      const event = {
        message: 'Test error',
      };
      
      const result = beforeSend(event, {});
      
      expect(result).toBeDefined();
      expect(result?.message).toBe('Test error');
    });

    it('should handle events without request', () => {
      const event = {
        message: 'Test error',
      };
      
      const result = beforeSend(event, {});
      
      expect(result).toBeDefined();
      expect(result?.message).toBe('Test error');
    });

    it('should handle events without breadcrumbs', () => {
      const event = {
        message: 'Test error',
      };
      
      const result = beforeSend(event, {});
      
      expect(result).toBeDefined();
      expect(result?.message).toBe('Test error');
    });

    it('should preserve other event properties', () => {
      const event = {
        message: 'Test error',
        level: 'error',
        timestamp: 1234567890,
        contexts: {
          os: { name: 'Windows' },
        },
      };
      
      const result = beforeSend(event, {});
      
      expect(result?.message).toBe('Test error');
      expect(result?.level).toBe('error');
      expect(result?.timestamp).toBe(1234567890);
      expect(result?.contexts).toEqual({ os: { name: 'Windows' } });
    });
  });

  describe('captureException', () => {
    it('should capture exception without context', () => {
      const error = new Error('Test error');
      
      captureException(error);
      
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture exception with context', () => {
      const error = new Error('Test error');
      const context = {
        user_action: {
          action: 'button_click',
          component: 'TestComponent',
        },
      };
      
      captureException(error, context);
      
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should set multiple context entries', () => {
      const error = new Error('Test error');
      const context = {
        user_action: { action: 'click' },
        app_state: { route: '/home' },
        device: { platform: 'windows' },
      };
      
      let scopeSetContextCalls: any[] = [];
      (Sentry.withScope as jest.Mock).mockImplementation((callback) => {
        const mockScope = {
          setContext: jest.fn((...args) => {
            scopeSetContextCalls.push(args);
          }),
        };
        callback(mockScope);
      });
      
      captureException(error, context);
      
      expect(scopeSetContextCalls).toHaveLength(3);
      expect(scopeSetContextCalls[0]).toEqual(['user_action', { action: 'click' }]);
      expect(scopeSetContextCalls[1]).toEqual(['app_state', { route: '/home' }]);
      expect(scopeSetContextCalls[2]).toEqual(['device', { platform: 'windows' }]);
    });

    it('should handle empty context object', () => {
      const error = new Error('Test error');
      
      captureException(error, {});
      
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should handle undefined error', () => {
      captureException(undefined as any);
      
      expect(Sentry.captureException).toHaveBeenCalledWith(undefined);
    });

    it('should handle null error', () => {
      captureException(null as any);
      
      expect(Sentry.captureException).toHaveBeenCalledWith(null);
    });
  });

  describe('setUserContext', () => {
    it('should set user context with ID', () => {
      setUserContext('user-123');
      
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-123' });
    });

    it('should handle empty user ID', () => {
      setUserContext('');
      
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: '' });
    });

    it('should handle numeric user ID', () => {
      setUserContext('12345');
      
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: '12345' });
    });

    it('should handle UUID user ID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      setUserContext(uuid);
      
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: uuid });
    });
  });

  describe('clearUserContext', () => {
    it('should clear user context', () => {
      clearUserContext();
      
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });

    it('should be callable multiple times', () => {
      clearUserContext();
      clearUserContext();
      clearUserContext();
      
      expect(Sentry.setUser).toHaveBeenCalledTimes(3);
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('Integration scenarios', () => {
    it('should work in staging environment', () => {
      process.env.SENTRY_ENVIRONMENT = 'staging';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      
      initializeSentry();
      
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'staging',
          tracesSampleRate: 0.1,
        })
      );
    });

    it('should work in test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.SENTRY_ENABLE_DEV = 'true';
      
      initializeSentry();
      
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'test',
          tracesSampleRate: 0.1,
        })
      );
    });

    it('should handle user workflow: set and clear user', () => {
      setUserContext('user-123');
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-123' });
      
      clearUserContext();
      expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
    });

    it('should handle error with rich context', () => {
      const error = new Error('Database query failed');
      const context = {
        database: {
          query: 'SELECT * FROM users',
          duration: 5000,
        },
        user: {
          id: 'user-123',
        },
        timestamp: new Date().toISOString(),
      };
      
      captureException(error, context);
      
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });
});