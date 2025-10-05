# Crash Reporting Setup Guide

This document explains how to set up and configure crash reporting for the Lume application.

## Overview

Lume uses two complementary crash reporting systems:

1. **Sentry** - JavaScript error tracking and performance monitoring
2. **Electron crashReporter** - Native crash reporting (C++/system-level crashes)

## Security Features

### Privacy & Data Protection

- ✅ **No PII collection** - Personal identifiable information is automatically filtered
- ✅ **Sensitive data sanitization** - Passwords, tokens, API keys are redacted
- ✅ **URL sanitization** - Query parameters with sensitive data are removed
- ✅ **User consent** - Crash reporting can be disabled by users
- ✅ **Environment-based** - Disabled in development by default

### What Gets Reported

**Sentry captures:**
- JavaScript errors and exceptions
- Stack traces
- Browser/system information
- Application version
- Custom context (non-sensitive)

**Crash Reporter captures:**
- Native crashes (segfaults, access violations)
- System information
- Application version
- Platform and architecture

**What is NOT reported:**
- User email addresses
- IP addresses
- Passwords or tokens
- Personal file paths
- Database content

## Setup Instructions

### 1. Sentry Configuration

#### Step 1: Create a Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project for Electron
3. Copy your DSN (Data Source Name)

#### Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy from example
cp .env.example .env
```

Add your Sentry DSN:

```env
SENTRY_DSN=https://your-public-key@o1234567.ingest.sentry.io/1234567
SENTRY_ENVIRONMENT=production
```

#### Step 3: Optional Development Settings

To enable Sentry in development (disabled by default):

```env
SENTRY_ENABLE_DEV=true
```

### 2. Native Crash Reporter Configuration

#### Using Sentry for Native Crashes (Recommended)

Sentry can process native crash dumps (minidumps). Configure the crash reporter URL:

1. In your Sentry project, find the Minidump endpoint
2. Format: `https://o[org-id].ingest.sentry.io/api/[project-id]/minidump/?sentry_key=[public-key]`

Add to `.env`:

```env
CRASH_REPORT_URL=https://o1234567.ingest.sentry.io/api/1234567/minidump/?sentry_key=your-public-key
```

#### Using Custom Crashpad Server (Advanced)

If you want to host your own crash reporting server:

1. Set up a [Crashpad](https://chromium.googlesource.com/crashpad/crashpad/) server
2. Configure the endpoint in `.env`:

```env
CRASH_REPORT_URL=https://your-crash-server.com/upload
```

### 3. Security Best Practices

#### ✅ DO:
- Keep `.env` file in `.gitignore` (already configured)
- Use environment variables for all sensitive data
- Regularly review crash reports for any leaked sensitive data
- Test crash reporting in staging before production
- Enable crash reporting only in production builds

#### ❌ DON'T:
- Commit `.env` file to version control
- Hardcode DSN or secrets in source code
- Send PII or sensitive user data
- Enable crash reporting in development without reviewing data

### 4. Testing Crash Reporting

#### Test JavaScript Error Reporting (Sentry)

1. Build the application:
```bash
npm run build
```

2. Add a test error in your code:
```javascript
throw new Error('Test Sentry error');
```

3. Run the app and trigger the error:
```bash
npm start
```

4. Check Sentry dashboard for the error report

#### Test Native Crash Reporting

1. The crash reporter must be enabled (see configuration above)
2. Native crashes typically happen in production builds
3. Check crash reports in your Sentry dashboard or custom server

#### IPC Methods for Crash Report Access

The app provides IPC methods to access crash reports:

```typescript
// Get the last crash report
const lastCrash = await window.electronAPI.getLastCrashReport();

// Get all uploaded crash reports
const reports = await window.electronAPI.getUploadedCrashReports();
```

### 5. User Privacy Controls

#### Implementing User Consent

It's recommended to add a settings option to allow users to opt out of crash reporting:

```typescript
// Example: Add to settings
const settings = {
  enableCrashReporting: true, // User preference
  // ... other settings
};

// Before initializing Sentry/crashReporter, check user preference
if (settings.enableCrashReporting) {
  initializeSentry();
  initializeCrashReporter();
}
```

### 6. Viewing Crash Reports

#### Sentry Dashboard

1. Log in to [sentry.io](https://sentry.io)
2. Select your project
3. View errors in the "Issues" section
4. Native crashes appear in the same dashboard

#### Crash Report Structure

Each crash report includes:
- **Timestamp** - When the crash occurred
- **Stack trace** - Where the error happened
- **Breadcrumbs** - User actions leading to crash
- **Environment** - OS, app version, etc.
- **Context** - Custom data (sanitized)

## Troubleshooting

### Crash Reports Not Appearing

1. **Check DSN configuration**
   - Verify `.env` file exists and contains correct DSN
   - Ensure environment variables are loaded

2. **Check environment settings**
   - Crash reporting is disabled in development by default
   - Set `SENTRY_ENABLE_DEV=true` to test in dev

3. **Verify network connectivity**
   - Sentry requires internet connection
   - Check firewall/proxy settings

4. **Check Sentry quota**
   - Free tier has limits
   - Verify you haven't exceeded quota

### Common Issues

**Issue: "Sentry DSN not configured"**
- Solution: Create `.env` file with `SENTRY_DSN=...`

**Issue: Duplicate error reports**
- Solution: Ensure Sentry is only initialized in main process (not preload)

**Issue: Sensitive data in reports**
- Solution: Check `beforeSend` hook in `src/config/sentry.ts`

## Configuration Files

- `src/config/sentry.ts` - Sentry initialization and privacy controls
- `src/config/crashReporter.ts` - Native crash reporter setup
- `.env.example` - Environment variable template
- `.env` - Your actual configuration (not in git)

## Additional Resources

- [Sentry Electron Documentation](https://docs.sentry.io/platforms/javascript/guides/electron/)
- [Electron crashReporter API](https://www.electronjs.org/docs/latest/api/crash-reporter)
- [Crashpad Documentation](https://chromium.googlesource.com/crashpad/crashpad/+/HEAD/doc/)

## Support

If you encounter issues with crash reporting:
1. Check this documentation
2. Review Sentry logs in console
3. Verify environment variables
4. Check network connectivity
5. Review Sentry dashboard for error details
