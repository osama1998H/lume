/**
 * Unit tests for crashReporter.ts
 * Tests the Electron crash reporter initialization and utility functions
 */

import { crashReporter } from 'electron';
import { app } from 'electron';
import {
  initializeCrashReporter,
  addCrashReporterParameter,
  getCrashReporterParameters,
  getLastCrashReport,
  getUploadedReports,
} from '../crashReporter';

// Mock electron modules
jest.mock('electron', () => ({
  crashReporter: {
    start: jest.fn(),
    addExtraParameter: jest.fn(),
    getParameters: jest.fn(),
    getLastCrashReport: jest.fn(),
    getUploadedReports: jest.fn(),
  },
  app: {
    getVersion: jest.fn(() => '1.0.0'),
  },
}));

describe('crashReporter', () => {
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

  describe('initializeCrashReporter', () => {
    it('should skip initialization in development without explicit enable', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.CRASH_REPORTER_ENABLE_DEV;
      
      initializeCrashReporter();
      
      expect(crashReporter.start).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Crash reporter disabled in development environment');
    });

    it('should initialize in development when explicitly enabled', () => {
      process.env.NODE_ENV = 'development';
      process.env.CRASH_REPORTER_ENABLE_DEV = 'true';
      process.env.CRASH_REPORT_URL = 'https://crash.example.com/report';
      
      initializeCrashReporter();
      
      expect(crashReporter.start).toHaveBeenCalledWith({
        productName: 'Lume',
        companyName: 'Lume Team',
        submitURL: 'https://crash.example.com/report',
        uploadToServer: true,
        ignoreSystemCrashHandler: false,
        compress: true,
        extra: {
          version: '1.0.0',
          environment: 'development',
          platform: process.platform,
          arch: process.arch,
        },
      });
      expect(consoleLogSpy).toHaveBeenCalledWith('Crash reporter initialized successfully');
    });

    it('should skip initialization when URL is not configured', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CRASH_REPORT_URL;
      
      initializeCrashReporter();
      
      expect(crashReporter.start).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Crash reporter URL not configured, skipping initialization');
    });

    it('should skip initialization when URL is placeholder', () => {
      process.env.NODE_ENV = 'production';
      process.env.CRASH_REPORT_URL = 'your_crash_report_url_here';
      
      initializeCrashReporter();
      
      expect(crashReporter.start).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Crash reporter URL not configured, skipping initialization');
    });

    it('should initialize successfully in production with valid config', () => {
      process.env.NODE_ENV = 'production';
      process.env.CRASH_REPORT_URL = 'https://crash.example.com/report';
      process.env.SENTRY_ENVIRONMENT = 'production';
      
      initializeCrashReporter();
      
      expect(crashReporter.start).toHaveBeenCalledWith({
        productName: 'Lume',
        companyName: 'Lume Team',
        submitURL: 'https://crash.example.com/report',
        uploadToServer: true,
        ignoreSystemCrashHandler: false,
        compress: true,
        extra: {
          version: '1.0.0',
          environment: 'production',
          platform: process.platform,
          arch: process.arch,
        },
      });
      expect(consoleLogSpy).toHaveBeenCalledWith('Crash reporter initialized successfully');
    });

    it('should use SENTRY_ENVIRONMENT over NODE_ENV when set', () => {
      process.env.NODE_ENV = 'production';
      process.env.SENTRY_ENVIRONMENT = 'staging';
      process.env.CRASH_REPORT_URL = 'https://crash.example.com/report';
      
      initializeCrashReporter();
      
      expect(crashReporter.start).toHaveBeenCalledWith(
        expect.objectContaining({
          extra: expect.objectContaining({
            environment: 'staging',
          }),
        })
      );
    });

    it('should default to development environment when no env vars set', () => {
      delete process.env.NODE_ENV;
      delete process.env.SENTRY_ENVIRONMENT;
      process.env.CRASH_REPORTER_ENABLE_DEV = 'true';
      process.env.CRASH_REPORT_URL = 'https://crash.example.com/report';
      
      initializeCrashReporter();
      
      expect(crashReporter.start).toHaveBeenCalledWith(
        expect.objectContaining({
          extra: expect.objectContaining({
            environment: 'development',
          }),
        })
      );
    });

    it('should handle initialization errors gracefully', () => {
      process.env.NODE_ENV = 'production';
      process.env.CRASH_REPORT_URL = 'https://crash.example.com/report';
      
      const error = new Error('Failed to start crash reporter');
      (crashReporter.start as jest.Mock).mockImplementation(() => {
        throw error;
      });
      
      initializeCrashReporter();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize crash reporter:', error);
    });

    it('should include correct platform information', () => {
      process.env.NODE_ENV = 'production';
      process.env.CRASH_REPORT_URL = 'https://crash.example.com/report';
      
      initializeCrashReporter();
      
      const callArgs = (crashReporter.start as jest.Mock).mock.calls[0][0];
      expect(callArgs.extra.platform).toBe(process.platform);
      expect(callArgs.extra.arch).toBe(process.arch);
    });
  });

  describe('addCrashReporterParameter', () => {
    it('should add extra parameter successfully', () => {
      addCrashReporterParameter('testKey', 'testValue');
      
      expect(crashReporter.addExtraParameter).toHaveBeenCalledWith('testKey', 'testValue');
    });

    it('should handle errors when adding parameter', () => {
      const error = new Error('Failed to add parameter');
      (crashReporter.addExtraParameter as jest.Mock).mockImplementation(() => {
        throw error;
      });
      
      addCrashReporterParameter('testKey', 'testValue');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to add crash reporter parameter:', error);
    });

    it('should handle empty key', () => {
      addCrashReporterParameter('', 'value');
      
      expect(crashReporter.addExtraParameter).toHaveBeenCalledWith('', 'value');
    });

    it('should handle empty value', () => {
      addCrashReporterParameter('key', '');
      
      expect(crashReporter.addExtraParameter).toHaveBeenCalledWith('key', '');
    });

    it('should handle special characters in key and value', () => {
      addCrashReporterParameter('key-with-dash', 'value with spaces & special\!');
      
      expect(crashReporter.addExtraParameter).toHaveBeenCalledWith('key-with-dash', 'value with spaces & special\!');
    });
  });

  describe('getCrashReporterParameters', () => {
    it('should return parameters successfully', () => {
      const mockParams = {
        version: '1.0.0',
        environment: 'production',
        customParam: 'customValue',
      };
      (crashReporter.getParameters as jest.Mock).mockReturnValue(mockParams);
      
      const result = getCrashReporterParameters();
      
      expect(result).toEqual(mockParams);
      expect(crashReporter.getParameters).toHaveBeenCalled();
    });

    it('should return empty object on error', () => {
      const error = new Error('Failed to get parameters');
      (crashReporter.getParameters as jest.Mock).mockImplementation(() => {
        throw error;
      });
      
      const result = getCrashReporterParameters();
      
      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get crash reporter parameters:', error);
    });

    it('should handle empty parameters', () => {
      (crashReporter.getParameters as jest.Mock).mockReturnValue({});
      
      const result = getCrashReporterParameters();
      
      expect(result).toEqual({});
    });
  });

  describe('getLastCrashReport', () => {
    it('should return last crash report successfully', () => {
      const mockReport = {
        date: new Date('2024-01-01'),
        id: 'crash-123',
      };
      (crashReporter.getLastCrashReport as jest.Mock).mockReturnValue(mockReport);
      
      const result = getLastCrashReport();
      
      expect(result).toEqual(mockReport);
      expect(crashReporter.getLastCrashReport).toHaveBeenCalled();
    });

    it('should return null when no crash report exists', () => {
      (crashReporter.getLastCrashReport as jest.Mock).mockReturnValue(null);
      
      const result = getLastCrashReport();
      
      expect(result).toBeNull();
    });

    it('should return null on error', () => {
      const error = new Error('Failed to get crash report');
      (crashReporter.getLastCrashReport as jest.Mock).mockImplementation(() => {
        throw error;
      });
      
      const result = getLastCrashReport();
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get last crash report:', error);
    });

    it('should handle undefined return value', () => {
      (crashReporter.getLastCrashReport as jest.Mock).mockReturnValue(undefined);
      
      const result = getLastCrashReport();
      
      expect(result).toBeUndefined();
    });
  });

  describe('getUploadedReports', () => {
    it('should return uploaded reports successfully', () => {
      const mockReports = [
        { date: new Date('2024-01-01'), id: 'crash-123' },
        { date: new Date('2024-01-02'), id: 'crash-456' },
      ];
      (crashReporter.getUploadedReports as jest.Mock).mockReturnValue(mockReports);
      
      const result = getUploadedReports();
      
      expect(result).toEqual(mockReports);
      expect(crashReporter.getUploadedReports).toHaveBeenCalled();
    });

    it('should return empty array when no reports exist', () => {
      (crashReporter.getUploadedReports as jest.Mock).mockReturnValue([]);
      
      const result = getUploadedReports();
      
      expect(result).toEqual([]);
    });

    it('should return empty array on error', () => {
      const error = new Error('Failed to get uploaded reports');
      (crashReporter.getUploadedReports as jest.Mock).mockImplementation(() => {
        throw error;
      });
      
      const result = getUploadedReports();
      
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get uploaded reports:', error);
    });

    it('should handle large number of reports', () => {
      const mockReports = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        id: `crash-${i}`,
      }));
      (crashReporter.getUploadedReports as jest.Mock).mockReturnValue(mockReports);
      
      const result = getUploadedReports();
      
      expect(result).toHaveLength(100);
      expect(result).toEqual(mockReports);
    });
  });

  describe('Integration scenarios', () => {
    it('should work correctly with staging environment', () => {
      process.env.SENTRY_ENVIRONMENT = 'staging';
      process.env.CRASH_REPORT_URL = 'https://crash.staging.example.com/report';
      
      initializeCrashReporter();
      
      expect(crashReporter.start).toHaveBeenCalledWith(
        expect.objectContaining({
          submitURL: 'https://crash.staging.example.com/report',
          extra: expect.objectContaining({
            environment: 'staging',
          }),
        })
      );
    });

    it('should handle test environment correctly', () => {
      process.env.NODE_ENV = 'test';
      process.env.CRASH_REPORTER_ENABLE_DEV = 'true';
      process.env.CRASH_REPORT_URL = 'https://crash.test.example.com/report';
      
      initializeCrashReporter();
      
      expect(crashReporter.start).toHaveBeenCalled();
    });
  });
});