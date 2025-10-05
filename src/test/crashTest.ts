/**
 * Crash Testing Utilities
 *
 * This file contains utilities for testing crash reporting functionality.
 * Use these functions to verify that Sentry and crashReporter are working correctly.
 */

import { captureException } from '../config/sentry';

/**
 * Test JavaScript exception reporting
 * This will trigger a Sentry error report
 */
export function testJavaScriptError(): void {
  try {
    // Intentionally throw an error
    throw new Error('Test JavaScript Error - This is a test crash report');
  } catch (error) {
    if (error instanceof Error) {
      captureException(error, {
        test: {
          type: 'javascript_error',
          timestamp: new Date().toISOString(),
          intentional: true,
        },
      });
    }
  }
}

/**
 * Test async error handling
 */
export async function testAsyncError(): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const error = new Error('Test Async Error - This is a test crash report');
      captureException(error, {
        test: {
          type: 'async_error',
          timestamp: new Date().toISOString(),
          intentional: true,
        },
      });
      reject(error);
    }, 100);
  });
}

/**
 * Test unhandled promise rejection
 * WARNING: This will create an unhandled rejection
 */
export function testUnhandledRejection(): void {
  Promise.reject(new Error('Test Unhandled Promise Rejection - This is a test crash report'));
}

/**
 * Simulate a database error
 */
export function testDatabaseError(): void {
  const error = new Error('Test Database Error - Simulated SQL error');
  (error as any).code = 'SQLITE_ERROR';
  (error as any).errno = 1;

  captureException(error, {
    database: {
      operation: 'INSERT',
      table: 'test_table',
      error_code: 'SQLITE_ERROR',
    },
    test: {
      type: 'database_error',
      intentional: true,
    },
  });
}

/**
 * Simulate a network error
 */
export function testNetworkError(): void {
  const error = new Error('Test Network Error - Failed to fetch data');
  (error as any).code = 'ECONNREFUSED';

  captureException(error, {
    network: {
      url: 'https://api.example.com/test',
      method: 'GET',
      status_code: 0,
    },
    test: {
      type: 'network_error',
      intentional: true,
    },
  });
}

/**
 * Test with custom context
 */
export function testCustomContext(): void {
  const error = new Error('Test Error with Custom Context');

  captureException(error, {
    user_action: {
      action: 'button_click',
      component: 'TestComponent',
      timestamp: new Date().toISOString(),
    },
    application_state: {
      route: '/test',
      feature_flags: { test_mode: true },
    },
    test: {
      type: 'custom_context',
      intentional: true,
    },
  });
}

/**
 * Test privacy filters (this should NOT leak sensitive data)
 */
export function testPrivacyFilters(): void {
  const error = new Error('Test Privacy Filters - Sensitive data should be redacted');

  // This sensitive data should be filtered by beforeSend hook
  captureException(error, {
    sensitive_data: {
      password: 'should_be_redacted',
      token: 'should_be_redacted',
      api_key: 'should_be_redacted',
      normal_data: 'should_appear',
    },
    test: {
      type: 'privacy_filter',
      intentional: true,
    },
  });
}

/**
 * Run all crash tests
 * Use this to verify the entire crash reporting system
 */
export async function runAllCrashTests(): Promise<void> {
  console.log('Starting crash reporting tests...');

  console.log('1. Testing JavaScript error...');
  testJavaScriptError();

  console.log('2. Testing async error...');
  try {
    await testAsyncError();
  } catch (e) {
    console.log('   Async error captured');
  }

  console.log('3. Testing database error...');
  testDatabaseError();

  console.log('4. Testing network error...');
  testNetworkError();

  console.log('5. Testing custom context...');
  testCustomContext();

  console.log('6. Testing privacy filters...');
  testPrivacyFilters();

  console.log('\nCrash reporting tests completed!');
  console.log('Check your Sentry dashboard to verify reports were received.');
  console.log('All test errors should have "intentional: true" in their context.');
}
