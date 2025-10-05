/**
 * Unit tests for crashTest.ts
 * Tests crash testing utilities and error reporting scenarios
 */

import * as SentryModule from '../../config/sentry';
import {
  testJavaScriptError,
  testAsyncError,
  testUnhandledRejection,
  testDatabaseError,
  testNetworkError,
  testCustomContext,
  testPrivacyFilters,
  runAllCrashTests,
} from '../crashTest';

// Mock the Sentry module
jest.mock('../../config/sentry', () => ({
  captureException: jest.fn(),
}));

describe('crashTest', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore console
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('testJavaScriptError', () => {
    it('should capture a JavaScript error with test context', () => {
      testJavaScriptError();
      
      expect(SentryModule.captureException).toHaveBeenCalledTimes(1);
      
      const [error, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test JavaScript Error - This is a test crash report');
      expect(context.test.type).toBe('javascript_error');
      expect(context.test.intentional).toBe(true);
    });

    it('should include timestamp in context', () => {
      testJavaScriptError();
      
      const [, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(context.test.timestamp).toBeDefined();
      expect(typeof context.test.timestamp).toBe('string');
      expect(new Date(context.test.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should handle errors correctly', () => {
      // Test should not throw even if captureException is not available
      expect(() => testJavaScriptError()).not.toThrow();
    });
  });

  describe('testAsyncError', () => {
    it('should reject with an async error', async () => {
      await expect(testAsyncError()).rejects.toThrow('Test Async Error - This is a test crash report');
    });

    it('should capture error with test context before rejecting', async () => {
      try {
        await testAsyncError();
      } catch (error) {
        // Expected to throw
      }
      
      expect(SentryModule.captureException).toHaveBeenCalledTimes(1);
      
      const [error, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test Async Error - This is a test crash report');
      expect(context.test.type).toBe('async_error');
      expect(context.test.intentional).toBe(true);
    });

    it('should include timestamp in context', async () => {
      try {
        await testAsyncError();
      } catch (error) {
        // Expected to throw
      }
      
      const [, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(context.test.timestamp).toBeDefined();
      expect(typeof context.test.timestamp).toBe('string');
    });

    it('should execute after a delay', async () => {
      const startTime = Date.now();
      
      try {
        await testAsyncError();
      } catch (error) {
        // Expected to throw
      }
      
      const endTime = Date.now();
      const elapsed = endTime - startTime;
      
      // Should take at least 100ms due to setTimeout
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow small margin
    });
  });

  describe('testUnhandledRejection', () => {
    it('should create an unhandled promise rejection', () => {
      // This test verifies the function runs without throwing synchronously
      expect(() => testUnhandledRejection()).not.toThrow();
    });

    it('should create a rejection with correct error message', (done) => {
      // Set up a handler to catch unhandled rejections
      const originalHandler = process.listeners('unhandledRejection')[0];
      
      process.removeAllListeners('unhandledRejection');
      process.once('unhandledRejection', (reason: any) => {
        expect(reason).toBeInstanceOf(Error);
        expect(reason.message).toBe('Test Unhandled Promise Rejection - This is a test crash report');
        
        // Restore original handler
        if (originalHandler) {
          process.on('unhandledRejection', originalHandler as any);
        }
        done();
      });
      
      testUnhandledRejection();
    });
  });

  describe('testDatabaseError', () => {
    it('should capture database error with context', () => {
      testDatabaseError();
      
      expect(SentryModule.captureException).toHaveBeenCalledTimes(1);
      
      const [error, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test Database Error - Simulated SQL error');
      expect((error as any).code).toBe('SQLITE_ERROR');
      expect((error as any).errno).toBe(1);
    });

    it('should include database context', () => {
      testDatabaseError();
      
      const [, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(context.database).toBeDefined();
      expect(context.database.operation).toBe('INSERT');
      expect(context.database.table).toBe('test_table');
      expect(context.database.error_code).toBe('SQLITE_ERROR');
    });

    it('should mark as test error', () => {
      testDatabaseError();
      
      const [, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(context.test.type).toBe('database_error');
      expect(context.test.intentional).toBe(true);
    });
  });

  describe('testNetworkError', () => {
    it('should capture network error with context', () => {
      testNetworkError();
      
      expect(SentryModule.captureException).toHaveBeenCalledTimes(1);
      
      const [error, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test Network Error - Failed to fetch data');
      expect((error as any).code).toBe('ECONNREFUSED');
    });

    it('should include network context', () => {
      testNetworkError();
      
      const [, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(context.network).toBeDefined();
      expect(context.network.url).toBe('https://api.example.com/test');
      expect(context.network.method).toBe('GET');
      expect(context.network.status_code).toBe(0);
    });

    it('should mark as test error', () => {
      testNetworkError();
      
      const [, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(context.test.type).toBe('network_error');
      expect(context.test.intentional).toBe(true);
    });
  });

  describe('testCustomContext', () => {
    it('should capture error with custom context', () => {
      testCustomContext();
      
      expect(SentryModule.captureException).toHaveBeenCalledTimes(1);
      
      const [error, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test Error with Custom Context');
    });

    it('should include user action context', () => {
      testCustomContext();
      
      const [, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(context.user_action).toBeDefined();
      expect(context.user_action.action).toBe('button_click');
      expect(context.user_action.component).toBe('TestComponent');
      expect(context.user_action.timestamp).toBeDefined();
    });

    it('should include application state context', () => {
      testCustomContext();
      
      const [, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(context.application_state).toBeDefined();
      expect(context.application_state.route).toBe('/test');
      expect(context.application_state.feature_flags).toEqual({ test_mode: true });
    });

    it('should mark as test error', () => {
      testCustomContext();
      
      const [, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(context.test.type).toBe('custom_context');
      expect(context.test.intentional).toBe(true);
    });
  });

  describe('testPrivacyFilters', () => {
    it('should capture error for privacy testing', () => {
      testPrivacyFilters();
      
      expect(SentryModule.captureException).toHaveBeenCalledTimes(1);
      
      const [error] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test Privacy Filters - Sensitive data should be redacted');
    });

    it('should include sensitive data that should be filtered', () => {
      testPrivacyFilters();
      
      const [, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(context.sensitive_data).toBeDefined();
      expect(context.sensitive_data.password).toBe('should_be_redacted');
      expect(context.sensitive_data.token).toBe('should_be_redacted');
      expect(context.sensitive_data.api_key).toBe('should_be_redacted');
      expect(context.sensitive_data.normal_data).toBe('should_appear');
    });

    it('should mark as privacy filter test', () => {
      testPrivacyFilters();
      
      const [, context] = (SentryModule.captureException as jest.Mock).mock.calls[0];
      expect(context.test.type).toBe('privacy_filter');
      expect(context.test.intentional).toBe(true);
    });
  });

  describe('runAllCrashTests', () => {
    it('should run all crash tests in sequence', async () => {
      await runAllCrashTests();
      
      // Should have called captureException for each test (excluding unhandled rejection)
      // testJavaScriptError, testAsyncError, testDatabaseError, testNetworkError, 
      // testCustomContext, testPrivacyFilters = 6 calls
      expect(SentryModule.captureException).toHaveBeenCalledTimes(6);
    });

    it('should log start message', async () => {
      await runAllCrashTests();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Starting crash reporting tests...');
    });

    it('should log completion message', async () => {
      await runAllCrashTests();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('\nCrash reporting tests completed\!');
      expect(consoleLogSpy).toHaveBeenCalledWith('Check your Sentry dashboard to verify reports were received.');
      expect(consoleLogSpy).toHaveBeenCalledWith('All test errors should have "intentional: true" in their context.');
    });

    it('should log each test step', async () => {
      await runAllCrashTests();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('1. Testing JavaScript error...');
      expect(consoleLogSpy).toHaveBeenCalledWith('2. Testing async error...');
      expect(consoleLogSpy).toHaveBeenCalledWith('3. Testing database error...');
      expect(consoleLogSpy).toHaveBeenCalledWith('4. Testing network error...');
      expect(consoleLogSpy).toHaveBeenCalledWith('5. Testing custom context...');
      expect(consoleLogSpy).toHaveBeenCalledWith('6. Testing privacy filters...');
    });

    it('should handle async error correctly', async () => {
      await runAllCrashTests();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('   Async error captured');
    });

    it('should complete successfully even if individual tests fail', async () => {
      // Mock captureException to throw an error
      (SentryModule.captureException as jest.Mock).mockImplementation(() => {
        throw new Error('Mock error');
      });
      
      // Should not throw and complete
      await expect(runAllCrashTests()).resolves.toBeUndefined();
    });

    it('should run tests in the correct order', async () => {
      const callOrder: string[] = [];
      
      (SentryModule.captureException as jest.Mock).mockImplementation((error: Error) => {
        if (error.message.includes('JavaScript Error')) callOrder.push('js');
        else if (error.message.includes('Async Error')) callOrder.push('async');
        else if (error.message.includes('Database Error')) callOrder.push('db');
        else if (error.message.includes('Network Error')) callOrder.push('network');
        else if (error.message.includes('Custom Context')) callOrder.push('custom');
        else if (error.message.includes('Privacy Filters')) callOrder.push('privacy');
      });
      
      await runAllCrashTests();
      
      expect(callOrder).toEqual(['js', 'async', 'db', 'network', 'custom', 'privacy']);
    });
  });

  describe('Error types and contexts', () => {
    it('should create errors with different types', () => {
      testJavaScriptError();
      testDatabaseError();
      testNetworkError();
      testCustomContext();
      testPrivacyFilters();
      
      const calls = (SentryModule.captureException as jest.Mock).mock.calls;
      const types = calls.map(call => call[1].test.type);
      
      expect(types).toContain('javascript_error');
      expect(types).toContain('database_error');
      expect(types).toContain('network_error');
      expect(types).toContain('custom_context');
      expect(types).toContain('privacy_filter');
    });

    it('should mark all test errors as intentional', () => {
      testJavaScriptError();
      testDatabaseError();
      testNetworkError();
      testCustomContext();
      testPrivacyFilters();
      
      const calls = (SentryModule.captureException as jest.Mock).mock.calls;
      
      calls.forEach(call => {
        expect(call[1].test.intentional).toBe(true);
      });
    });

    it('should include timestamps in all test contexts', () => {
      testJavaScriptError();
      testCustomContext();
      
      const calls = (SentryModule.captureException as jest.Mock).mock.calls;
      
      calls.forEach(call => {
        if (call[1].test && call[1].test.timestamp) {
          expect(typeof call[1].test.timestamp).toBe('string');
          expect(new Date(call[1].test.timestamp).toString()).not.toBe('Invalid Date');
        }
        if (call[1].user_action && call[1].user_action.timestamp) {
          expect(typeof call[1].user_action.timestamp).toBe('string');
          expect(new Date(call[1].user_action.timestamp).toString()).not.toBe('Invalid Date');
        }
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle captureException being unavailable', () => {
      (SentryModule.captureException as jest.Mock).mockImplementation(() => {
        throw new Error('captureException not available');
      });
      
      expect(() => testJavaScriptError()).not.toThrow();
      expect(() => testDatabaseError()).not.toThrow();
      expect(() => testNetworkError()).not.toThrow();
      expect(() => testCustomContext()).not.toThrow();
      expect(() => testPrivacyFilters()).not.toThrow();
    });

    it('should handle async errors when captureException fails', async () => {
      (SentryModule.captureException as jest.Mock).mockImplementation(() => {
        throw new Error('captureException not available');
      });
      
      await expect(testAsyncError()).rejects.toThrow();
    });

    it('should create unique error instances', () => {
      testJavaScriptError();
      testJavaScriptError();
      
      const calls = (SentryModule.captureException as jest.Mock).mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]); // Different error instances
    });

    it('should create unique context objects', () => {
      testJavaScriptError();
      testJavaScriptError();
      
      const calls = (SentryModule.captureException as jest.Mock).mock.calls;
      expect(calls[0][1]).not.toBe(calls[1][1]); // Different context objects
    });
  });
});