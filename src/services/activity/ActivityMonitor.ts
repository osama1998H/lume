import { exec } from 'child_process';
import { promisify } from 'util';
import { CurrentActivity, ActivityTracker } from '../../types/activity';

const execAsync = promisify(exec);

export class ActivityMonitor implements ActivityTracker {
  private isActive = false;
  private intervalId: NodeJS.Timeout | null = null;
  private intervalMs: number; // 30 seconds default in constructor
  private currentActivity: CurrentActivity | null = null;

  constructor(intervalMs = 30000) {
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.intervalId = setInterval(() => {
      this.captureCurrentActivity();
    }, this.intervalMs);

    // Capture initial activity
    this.captureCurrentActivity();
  }

  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
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

  async getSystemIdleTime(): Promise<number> {
    const platform = process.platform;

    try {
      switch (platform) {
        case 'darwin':
          return await this.getMacOSIdleTime();
        case 'win32':
          return await this.getWindowsIdleTime();
        case 'linux':
          return await this.getLinuxIdleTime();
        default:
          console.warn(`Unsupported platform for idle time detection: ${platform}`);
          return 0;
      }
    } catch (error) {
      console.error(`Error getting system idle time on ${platform}:`, error);
      return 0;
    }
  }

  private async getMacOSIdleTime(): Promise<number> {
    try {
      // Use ioreg to get HIDIdleTime (in nanoseconds)
      const { stdout } = await execAsync('ioreg -c IOHIDSystem | grep HIDIdleTime');
      const match = stdout.match(/HIDIdleTime"\s*=\s*(\d+)/);

      if (match) {
        const matchedValue = match[1];
        if (!matchedValue) {
          console.error('Failed to parse macOS idle time: no match value');
          return 0;
        }
        const nanoseconds = parseInt(matchedValue, 10);
        if (isNaN(nanoseconds)) {
          console.error('Failed to parse macOS idle time: invalid number');
          return 0;
        }
        const seconds = Math.floor(nanoseconds / 1000000000); // Convert nanoseconds to seconds
        return seconds;
      }

      return 0;
    } catch (error) {
      console.error('Failed to get macOS idle time:', error);
      return 0;
    }
  }

  private async getWindowsIdleTime(): Promise<number> {
    try {
      // Use PowerShell to get idle time from Windows API
      // Using -EncodedCommand to avoid quoting issues with embedded strings
      const script = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class IdleTime {
            [DllImport("user32.dll")]
            public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

            [StructLayout(LayoutKind.Sequential)]
            public struct LASTINPUTINFO {
              public uint cbSize;
              public uint dwTime;
            }

            public static uint GetIdleTime() {
              LASTINPUTINFO lastInputInfo = new LASTINPUTINFO();
              lastInputInfo.cbSize = (uint)Marshal.SizeOf(lastInputInfo);
              GetLastInputInfo(ref lastInputInfo);
              return ((uint)Environment.TickCount - lastInputInfo.dwTime);
            }
          }
"@
        [IdleTime]::GetIdleTime()
      `;

      // Encode the script as base64 UTF-16LE for PowerShell -EncodedCommand
      const encodedScript = Buffer.from(script, 'utf16le').toString('base64');
      const { stdout } = await execAsync(`powershell -EncodedCommand ${encodedScript}`);
      const milliseconds = parseInt(stdout.trim(), 10);
      if (isNaN(milliseconds)) {
        console.error('Failed to parse Windows idle time: invalid number');
        return 0;
      }
      const seconds = Math.floor(milliseconds / 1000);
      return seconds;
    } catch (error) {
      console.error('Failed to get Windows idle time:', error);
      return 0;
    }
  }

  private async getLinuxIdleTime(): Promise<number> {
    try {
      // Try xprintidle first (returns milliseconds)
      try {
        const { stdout } = await execAsync('xprintidle');
        const milliseconds = parseInt(stdout.trim(), 10);
        if (isNaN(milliseconds)) {
          throw new Error('xprintidle returned invalid number');
        }
        const seconds = Math.floor(milliseconds / 1000);
        return seconds;
      } catch {
        // Fallback to xssstate if xprintidle is not available
        const { stdout } = await execAsync('xssstate -i');
        const match = stdout.match(/idle:\s*(\d+)/);
        if (match) {
          const matchedValue = match[1];
          if (!matchedValue) {
            console.error('Failed to parse Linux idle time from xssstate: no match value');
            return 0;
          }
          const seconds = parseInt(matchedValue, 10);
          if (isNaN(seconds)) {
            console.error('Failed to parse Linux idle time from xssstate');
            return 0;
          }
          return seconds;
        }
        return 0;
      }
    } catch (error) {
      console.error('Failed to get Linux idle time:', error);
      return 0;
    }
  }

  private async captureCurrentActivity(): Promise<void> {
    try {
      const activity = await this.detectActiveWindow();
      if (activity) {
        this.currentActivity = activity;
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
        } else {
          // Fallback to window title parsing
          const fallbackInfo = await this.extractBrowserInfo(appName, windowTitle || '');
          if (fallbackInfo) {
            activity.domain = fallbackInfo.domain;
            activity.url = fallbackInfo.url;
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
        pid: pid ? parseInt(pid) : 0,
        is_browser: this.isBrowserApp(appName),
        timestamp: Date.now()
      };

      if (activity.is_browser) {
        const browserInfo = await this.extractBrowserInfo(appName, windowTitle || '');
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

      const windowTitle = nameMatch?.[1] || '';
      const appName = classMatch?.[2] || '';

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
          if (possibleDomain && this.isValidDomain(possibleDomain)) {
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
        const domain = urlMatch[2];
        const url = urlMatch[0];
        if (domain && url) {
          return {
            domain,
            url
          };
        }
      }

      // Last resort: extract domain-like strings
      const domainMatch = windowTitle.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
      if (domainMatch) {
        const domain = domainMatch[1];
        if (domain) {
          return {
            domain
          };
        }
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