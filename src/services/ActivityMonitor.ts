import { exec } from 'child_process';
import { promisify } from 'util';
import { CurrentActivity, ActivityTracker } from '../types/activity';

const execAsync = promisify(exec);

export class ActivityMonitor implements ActivityTracker {
  private isActive = false;
  private intervalId: NodeJS.Timeout | null = null;
  private intervalMs = 30000; // 30 seconds default
  private currentActivity: CurrentActivity | null = null;

  constructor(intervalMs = 30000) {
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.isActive) {
      console.log('⚠️  Activity monitor already running');
      return;
    }

    this.isActive = true;
    this.intervalId = setInterval(() => {
      this.captureCurrentActivity();
    }, this.intervalMs);

    // Capture initial activity
    this.captureCurrentActivity();
    console.log(`👁️  Activity monitor started (interval: ${this.intervalMs}ms)`);
  }

  stop(): void {
    if (!this.isActive) {
      console.log('⚠️  Activity monitor already stopped');
      return;
    }

    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('👁️  Activity monitor stopped');
  }

  isTracking(): boolean {
    return this.isActive;
  }

  async getCurrentActivity(): Promise<CurrentActivity | null> {
    return this.currentActivity;
  }

  setInterval(intervalMs: number): void {
    this.intervalMs = intervalMs;
    if (this.isActive) {
      this.stop();
      this.start();
    }
  }

  private async captureCurrentActivity(): Promise<void> {
    try {
      const activity = await this.detectActiveWindow();
      if (activity) {
        this.currentActivity = activity;
        console.log(`🔍 Captured activity: ${activity.app_name}${activity.domain ? ` (${activity.domain})` : ''}`);
      } else {
        console.log('⚠️  No activity detected');
      }
    } catch (error) {
      console.error('❌ Failed to capture activity:', error);
    }
  }

  private async detectActiveWindow(): Promise<CurrentActivity | null> {
    const platform = process.platform;

    try {
      switch (platform) {
        case 'darwin':
          return await this.getMacOSActivity();
        case 'win32':
          return await this.getWindowsActivity();
        case 'linux':
          return await this.getLinuxActivity();
        default:
          console.warn(`Unsupported platform: ${platform}`);
          return null;
      }
    } catch (error) {
      console.error(`Error detecting active window on ${platform}:`, error);
      return null;
    }
  }

  private async getMacOSActivity(): Promise<CurrentActivity | null> {
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        set frontWindow to ""
        try
          set frontWindow to name of front window of first application process whose frontmost is true
        end try
        return frontApp & "|||" & frontWindow
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const [appName, windowTitle] = stdout.trim().split('|||');

      if (!appName) {
        console.log('⚠️  macOS: No active app detected');
        return null;
      }

      const activity: CurrentActivity = {
        app_name: appName,
        window_title: windowTitle || '',
        pid: 0, // We'd need additional script to get PID
        is_browser: this.isBrowserApp(appName),
        timestamp: Date.now()
      };

      if (activity.is_browser) {
        // Try to get URL directly from browser first (more reliable)
        const browserInfo = await this.getBrowserUrlDirectly(appName);
        if (browserInfo) {
          activity.domain = browserInfo.domain;
          activity.url = browserInfo.url;
          console.log(`🌐 Browser detected: ${browserInfo.domain} (via direct URL)`);
        } else {
          // Fallback to window title parsing
          const fallbackInfo = await this.extractBrowserInfo(appName, windowTitle);
          if (fallbackInfo) {
            activity.domain = fallbackInfo.domain;
            activity.url = fallbackInfo.url;
            console.log(`🌐 Browser detected: ${fallbackInfo.domain} (via window title)`);
          } else {
            console.log('⚠️  Browser detected but no URL/domain extracted');
          }
        }
      }

      return activity;
    } catch (error) {
      console.error('❌ macOS activity detection failed:', error);
      return null;
    }
  }

  private async getBrowserUrlDirectly(appName: string): Promise<{domain: string, url: string} | null> {
    try {
      let script = '';
      const lowerAppName = appName.toLowerCase();

      // Map app names to their AppleScript commands
      if (lowerAppName.includes('chrome') || lowerAppName.includes('chromium')) {
        script = 'tell application "Google Chrome" to get URL of active tab of front window';
      } else if (lowerAppName.includes('safari')) {
        script = 'tell application "Safari" to get URL of current tab of front window';
      } else if (lowerAppName.includes('firefox')) {
        // Firefox doesn't support AppleScript URL access easily, will fallback to window title
        return null;
      } else if (lowerAppName.includes('brave')) {
        script = 'tell application "Brave Browser" to get URL of active tab of front window';
      } else if (lowerAppName.includes('edge')) {
        script = 'tell application "Microsoft Edge" to get URL of active tab of front window';
      } else if (lowerAppName.includes('arc')) {
        script = 'tell application "Arc" to get URL of active tab of front window';
      } else if (lowerAppName.includes('opera')) {
        script = 'tell application "Opera" to get URL of active tab of front window';
      } else if (lowerAppName.includes('vivaldi')) {
        script = 'tell application "Vivaldi" to get URL of active tab of front window';
      } else {
        return null;
      }

      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const url = stdout.trim();

      if (!url || url.length === 0) {
        return null;
      }

      // Skip internal browser pages
      if (url.startsWith('chrome://') ||
          url.startsWith('about:') ||
          url.startsWith('chrome-extension://') ||
          url.startsWith('safari-resource://') ||
          url.startsWith('favorites://')) {
        console.log(`⏭️  Skipping internal browser page: ${url}`);
        return null;
      }

      // Extract domain from URL
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, ''); // Remove www. prefix

      return {
        domain,
        url
      };
    } catch (error) {
      // Silent fail - will fallback to window title parsing
      return null;
    }
  }

  private async getWindowsActivity(): Promise<CurrentActivity | null> {
    // For Windows, we'd use PowerShell or native Windows APIs
    // This is a simplified implementation
    try {
      const script = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          using System.Text;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
            public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
            [DllImport("user32.dll", SetLastError=true)]
            public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
          }
"@
        $hwnd = [Win32]::GetForegroundWindow()
        $sb = New-Object System.Text.StringBuilder 1024
        [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity)
        $windowTitle = $sb.ToString()

        $processId = 0
        [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId)
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

        if ($process) {
          Write-Output "$($process.ProcessName)|||$windowTitle|||$processId"
        }
      `;

      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      const [appName, windowTitle, pid] = stdout.trim().split('|||');

      if (!appName) return null;

      const activity: CurrentActivity = {
        app_name: appName,
        window_title: windowTitle || '',
        pid: parseInt(pid) || 0,
        is_browser: this.isBrowserApp(appName),
        timestamp: Date.now()
      };

      if (activity.is_browser) {
        const browserInfo = await this.extractBrowserInfo(appName, windowTitle);
        if (browserInfo) {
          activity.domain = browserInfo.domain;
          activity.url = browserInfo.url;
        }
      }

      return activity;
    } catch (error) {
      console.error('Windows activity detection failed:', error);
      return null;
    }
  }

  private async getLinuxActivity(): Promise<CurrentActivity | null> {
    // For Linux X11/Wayland
    try {
      // X11 approach
      const { stdout } = await execAsync('xprop -id $(xprop -root _NET_ACTIVE_WINDOW | cut -d" " -f5) WM_NAME WM_CLASS');

      const nameMatch = stdout.match(/WM_NAME\(STRING\) = "(.+)"/);
      const classMatch = stdout.match(/WM_CLASS\(STRING\) = "(.+)", "(.+)"/);

      const windowTitle = nameMatch ? nameMatch[1] : '';
      const appName = classMatch ? classMatch[2] : '';

      if (!appName) return null;

      const activity: CurrentActivity = {
        app_name: appName,
        window_title: windowTitle,
        pid: 0,
        is_browser: this.isBrowserApp(appName),
        timestamp: Date.now()
      };

      if (activity.is_browser) {
        const browserInfo = await this.extractBrowserInfo(appName, windowTitle);
        if (browserInfo) {
          activity.domain = browserInfo.domain;
          activity.url = browserInfo.url;
        }
      }

      return activity;
    } catch (error) {
      console.error('Linux activity detection failed:', error);
      return null;
    }
  }

  private isBrowserApp(appName: string): boolean {
    const browsers = [
      'chrome', 'firefox', 'safari', 'edge', 'brave', 'opera',
      'chromium', 'vivaldi', 'arc', 'google chrome', 'microsoft edge'
    ];
    return browsers.some(browser =>
      appName.toLowerCase().includes(browser.toLowerCase())
    );
  }

  private async extractBrowserInfo(_appName: string, windowTitle: string): Promise<{domain: string, url?: string} | null> {
    if (!windowTitle) return null;

    try {
      // Basic URL extraction from window title
      // Most browsers show the page title followed by the domain or full URL

      // Look for common patterns in browser window titles
      const patterns = [
        // "Page Title - Domain"
        /^(.+?)\s*[-–—]\s*(.+?)(?:\s*[-–—]\s*.+)?$/,
        // "Page Title (Domain)"
        /^(.+?)\s*\((.+?)\)$/,
        // "Domain: Page Title"
        /^(.+?):\s*(.+)$/
      ];

      for (const pattern of patterns) {
        const match = windowTitle.match(pattern);
        if (match) {
          const possibleDomain = match[2];

          // Check if it looks like a domain
          if (this.isValidDomain(possibleDomain)) {
            return {
              domain: possibleDomain,
              url: possibleDomain.startsWith('http') ? possibleDomain : undefined
            };
          }
        }
      }

      // Fallback: look for URLs anywhere in the title
      const urlMatch = windowTitle.match(/https?:\/\/(www\.)?([^/\s]+)/);
      if (urlMatch) {
        return {
          domain: urlMatch[2],
          url: urlMatch[0]
        };
      }

      // Last resort: extract domain-like strings
      const domainMatch = windowTitle.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
      if (domainMatch) {
        return {
          domain: domainMatch[1]
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to extract browser info:', error);
      return null;
    }
  }

  private isValidDomain(str: string): boolean {
    if (!str) return false;

    // Remove protocol if present
    str = str.replace(/^https?:\/\//, '');

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    return domainRegex.test(str) || str.includes('.') && str.length > 3;
  }
}