import { ActivityMonitor } from '../ActivityMonitor';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock child_process
jest.mock('child_process');

const execAsync = promisify(exec);

describe('ActivityMonitor', () => {
  let monitor: ActivityMonitor;
  let consoleLog: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    consoleLog = jest.spyOn(console, 'log').mockImplementation();
    consoleError = jest.spyOn(console, 'error').mockImplementation();
    
    monitor = new ActivityMonitor(5000);
  });

  afterEach(() => {
    monitor.stop();
    jest.useRealTimers();
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  describe('Constructor', () => {
    it('should initialize with default interval', () => {
      const defaultMonitor = new ActivityMonitor();
      expect(defaultMonitor.isTracking()).toBe(false);
    });

    it('should initialize with custom interval', () => {
      const customMonitor = new ActivityMonitor(10000);
      expect(customMonitor.isTracking()).toBe(false);
    });
  });

  describe('start', () => {
    it('should set isActive to true', () => {
      monitor.start();
      expect(monitor.isTracking()).toBe(true);
    });

    it('should log start message with interval', () => {
      monitor.start();
      expect(consoleLog).toHaveBeenCalledWith('👁️  Activity monitor started (interval: 5000ms)');
    });

    it('should log warning when already running', () => {
      monitor.start();
      consoleLog.mockClear();
      
      monitor.start();
      expect(consoleLog).toHaveBeenCalledWith('⚠️  Activity monitor already running');
    });

    it('should not start twice if already running', () => {
      monitor.start();
      const firstInterval = (monitor as any).intervalId;
      
      monitor.start();
      const secondInterval = (monitor as any).intervalId;
      
      expect(firstInterval).toBe(secondInterval);
    });
  });

  describe('stop', () => {
    it('should set isActive to false', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isTracking()).toBe(false);
    });

    it('should log stop message', () => {
      monitor.start();
      consoleLog.mockClear();
      
      monitor.stop();
      expect(consoleLog).toHaveBeenCalledWith('👁️  Activity monitor stopped');
    });

    it('should log warning when already stopped', () => {
      monitor.stop();
      expect(consoleLog).toHaveBeenCalledWith('⚠️  Activity monitor already stopped');
    });

    it('should clear interval timer', () => {
      monitor.start();
      const {intervalId} = monitor as any;
      expect(intervalId).not.toBeNull();
      
      monitor.stop();
      expect((monitor as any).intervalId).toBeNull();
    });
  });

  describe('setInterval', () => {
    it('should update interval when not tracking', () => {
      monitor.setInterval(15000);
      expect((monitor as any).intervalMs).toBe(15000);
    });

    it('should restart monitor with new interval when tracking', () => {
      monitor.start();
      const stopSpy = jest.spyOn(monitor, 'stop');
      const startSpy = jest.spyOn(monitor, 'start');
      
      monitor.setInterval(20000);
      
      expect(stopSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
      expect((monitor as any).intervalMs).toBe(20000);
    });
  });

  describe('isTracking', () => {
    it('should return false initially', () => {
      expect(monitor.isTracking()).toBe(false);
    });

    it('should return true when started', () => {
      monitor.start();
      expect(monitor.isTracking()).toBe(true);
    });

    it('should return false when stopped', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isTracking()).toBe(false);
    });
  });

  describe('getCurrentActivity', () => {
    it('should return null initially', async () => {
      const activity = await monitor.getCurrentActivity();
      expect(activity).toBeNull();
    });

    it('should return current activity after capture', async () => {
      const mockActivity = {
        app_name: 'TestApp',
        window_title: 'Test Window',
        pid: 1234,
        is_browser: false,
        timestamp: Date.now(),
      };
      
      (monitor as any).currentActivity = mockActivity;
      
      const activity = await monitor.getCurrentActivity();
      expect(activity).toEqual(mockActivity);
    });
  });

  describe('macOS Activity Detection', () => {
    const originalPlatform = process.platform;

    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
      });
    });

    it('should detect non-browser application', async () => {
      (execAsync as unknown as jest.Mock).mockResolvedValueOnce({
        stdout: 'TextEdit|||Untitled',
      });
      
      monitor.start();
      jest.advanceTimersByTime(100);
      
      await Promise.resolve();
      
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🔍 Captured activity: TextEdit')
      );
    });

    it('should detect browser and attempt URL extraction', async () => {
      (execAsync as unknown as jest.Mock)
        .mockResolvedValueOnce({
          stdout: 'Google Chrome|||Example Page',
        })
        .mockResolvedValueOnce({
          stdout: 'https://example.com/page',
        });
      
      monitor.start();
      jest.advanceTimersByTime(100);
      
      await Promise.resolve();
      await Promise.resolve();
      
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🌐 Browser detected')
      );
    });

    it('should log warning when no app detected', async () => {
      (execAsync as unknown as jest.Mock).mockResolvedValueOnce({
        stdout: '|||',
      });
      
      monitor.start();
      jest.advanceTimersByTime(100);
      
      await Promise.resolve();
      
      expect(consoleLog).toHaveBeenCalledWith('⚠️  macOS: No active app detected');
    });

    it('should skip internal browser pages', async () => {
      (execAsync as unknown as jest.Mock)
        .mockResolvedValueOnce({
          stdout: 'Google Chrome|||New Tab',
        })
        .mockResolvedValueOnce({
          stdout: 'chrome://newtab',
        });
      
      monitor.start();
      jest.advanceTimersByTime(100);
      
      await Promise.resolve();
      await Promise.resolve();
      
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⏭️  Skipping internal browser page: chrome://newtab')
      );
    });

    it('should handle Chrome browser URL extraction', async () => {
      (execAsync as unknown as jest.Mock)
        .mockResolvedValueOnce({
          stdout: 'Google Chrome|||Example',
        })
        .mockResolvedValueOnce({
          stdout: 'https://www.example.com/test',
        });
      
      monitor.start();
      jest.advanceTimersByTime(100);
      
      await Promise.resolve();
      await Promise.resolve();
      
      const activity = await monitor.getCurrentActivity();
      expect(activity).toMatchObject({
        is_browser: true,
        domain: 'example.com',
        url: 'https://www.example.com/test',
      });
    });

    it('should handle Safari browser', async () => {
      (execAsync as unknown as jest.Mock)
        .mockResolvedValueOnce({
          stdout: 'Safari|||Test Page',
        })
        .mockResolvedValueOnce({
          stdout: 'https://test.com',
        });
      
      monitor.start();
      jest.advanceTimersByTime(100);
      
      await Promise.resolve();
      await Promise.resolve();
      
      const activity = await monitor.getCurrentActivity();
      expect(activity?.is_browser).toBe(true);
    });

    it('should return null for Firefox (no AppleScript support)', async () => {
      (execAsync as unknown as jest.Mock).mockResolvedValueOnce({
        stdout: 'Firefox|||Test',
      });
      
      const result = await (monitor as any).getBrowserUrlDirectly('Firefox');
      expect(result).toBeNull();
    });

    it('should handle empty URL response', async () => {
      (execAsync as unknown as jest.Mock).mockResolvedValueOnce({
        stdout: '',
      });
      
      const result = await (monitor as any).getBrowserUrlDirectly('Google Chrome');
      expect(result).toBeNull();
    });

    it('should remove www prefix from domain', async () => {
      (execAsync as unknown as jest.Mock).mockResolvedValueOnce({
        stdout: 'https://www.example.com',
      });
      
      const result = await (monitor as any).getBrowserUrlDirectly('Google Chrome');
      expect(result?.domain).toBe('example.com');
    });

    it('should handle browser URL extraction errors gracefully', async () => {
      (execAsync as unknown as jest.Mock).mockRejectedValueOnce(new Error('AppleScript error'));
      
      const result = await (monitor as any).getBrowserUrlDirectly('Google Chrome');
      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should log error when activity capture fails', async () => {
      (execAsync as unknown as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      monitor.start();
      jest.advanceTimersByTime(100);
      
      await Promise.resolve();
      
      expect(consoleError).toHaveBeenCalledWith(
        '❌ Failed to capture activity:',
        expect.any(Error)
      );
    });

    it('should continue running after capture error', async () => {
      (execAsync as unknown as jest.Mock).mockRejectedValue(new Error('Test error'));

      monitor.start();
      expect(monitor.isTracking()).toBe(true);

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(monitor.isTracking()).toBe(true);
    });

    it('should cleanup and stop tracking when stop() is called during capture', async () => {
      // Simulate a long-running capture by making execAsync return a promise that never resolves
      const neverResolvingPromise = new Promise(() => {});
      (execAsync as unknown as jest.Mock).mockReturnValue(neverResolvingPromise);

      monitor.start();
      expect(monitor.isTracking()).toBe(true);

      // Call stop while capture is in progress
      monitor.stop();

      expect(monitor.isTracking()).toBe(false);

      // Optionally, check that no further captures are scheduled
      jest.advanceTimersByTime(1000);
      expect(monitor.isTracking()).toBe(false);
    });
  });

  describe('Browser Detection', () => {
    it('should identify Chrome as browser', () => {
      const result = (monitor as any).isBrowserApp('Google Chrome');
      expect(result).toBe(true);
    });

    it('should identify Firefox as browser', () => {
      const result = (monitor as any).isBrowserApp('Firefox');
      expect(result).toBe(true);
    });

    it('should identify Safari as browser', () => {
      const result = (monitor as any).isBrowserApp('Safari');
      expect(result).toBe(true);
    });

    it('should identify Edge as browser', () => {
      const result = (monitor as any).isBrowserApp('Microsoft Edge');
      expect(result).toBe(true);
    });

    it('should identify Brave as browser', () => {
      const result = (monitor as any).isBrowserApp('Brave Browser');
      expect(result).toBe(true);
    });

    it('should not identify TextEdit as browser', () => {
      const result = (monitor as any).isBrowserApp('TextEdit');
      expect(result).toBe(false);
    });

    it('should not identify VS Code as browser', () => {
      const result = (monitor as any).isBrowserApp('Visual Studio Code');
      expect(result).toBe(false);
    });

    it('should be case insensitive', () => {
      const result = (monitor as any).isBrowserApp('google CHROME');
      expect(result).toBe(true);
    });
  });
});