# Lume ⚡

> A powerful desktop application for tracking and visualizing time spent on tasks and applications.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-29+-blue.svg)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)

Lume helps you understand your productivity patterns by automatically tracking time spent on different applications and websites. Get clear insights to improve focus, productivity, and time management.

![Lume Screenshot](./assets/screenshot.png)

## ✨ Features

### 🌍 Internationalization (i18n)
- **Multi-language support** - English and Arabic available
- **RTL (Right-to-Left) support** - Automatic layout mirroring for RTL languages
- **Easy to add languages** - See [Translation Guide](TRANSLATION_GUIDE.md)
- **Language switcher** - Change language from Settings

### 🎯 Automatic Activity Tracking
- **Cross-platform monitoring** - Works on macOS, Windows, and Linux
- **Application tracking** - Monitor time spent in desktop applications
- **Website tracking** - Track browsing time by domain
- **Smart session detection** - Automatically detects when you switch contexts
- **Idle detection** - Pauses tracking when you're away

### 📊 Rich Visualizations
- **Time by category** - See how you spend time across different areas
- **Top applications** - Identify your most-used applications
- **Top websites** - Track your browsing patterns
- **Activity sessions** - Detailed log of all your activities
- **Flexible time periods** - View data by day, week, or month

### ⚙️ Customizable Settings
- **Tracking intervals** - Adjust how often activity is monitored
- **Idle thresholds** - Configure when to consider you idle
- **Blacklisting** - Exclude specific apps or domains from tracking
- **Privacy controls** - Fine-tune what gets tracked

### 📈 Productivity Insights
- **Total tracked time** - See your overall activity
- **Task completion** - Track completed tasks and average duration
- **Usage patterns** - Understand your digital habits
- **Export data** - Save your data for external analysis

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lume.git
   cd lume
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment (optional)**
   ```bash
   cp .env.example .env
   # Edit .env to add your Sentry DSN for crash reporting
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm run package
   ```

## 🔧 Development

### Project Structure

```
lume/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React frontend
│   ├── components/     # React components
│   ├── services/       # Activity tracking services
│   ├── database/       # SQLite database management
│   └── types/          # TypeScript type definitions
├── dist/               # Built application
└── assets/            # Static assets
```

### Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Backend**: Electron, Node.js
- **Database**: SQLite with better-sqlite3
- **Build**: Vite, electron-builder
- **Testing**: Jest, React Testing Library
- **Internationalization**: react-i18next
- **Error Tracking**: Sentry (optional)
- **Crash Reporting**: Electron crashReporter

### Available Scripts

- `npm run dev` - Start development environment
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run package` - Package for distribution

### Crash Reporting Setup

Lume includes comprehensive crash reporting to help improve stability. See the [Crash Reporting Setup Guide](CRASH_REPORTING.md) for:

- How to configure Sentry for error tracking
- Setting up native crash reporting
- Privacy and security features
- Testing crash reporting
- User consent and data controls

**Quick start:**
1. Copy `.env.example` to `.env`
2. Add your Sentry DSN
3. Configure crash report URL (optional)
4. See full guide in [CRASH_REPORTING.md](CRASH_REPORTING.md)

### Activity Monitoring

Lume uses platform-specific APIs to monitor active windows:

- **macOS**: AppleScript for window detection
- **Windows**: PowerShell with Win32 APIs
- **Linux**: X11 tools (xprop)

Browser activity is detected by analyzing window titles and extracting domain information.

## 🔒 Privacy & Security

Lume is designed with privacy in mind:

- **Local data only** - All data stays on your device
- **No cloud sync** - No data is sent to external servers
- **Configurable tracking** - Control what gets monitored
- **Data export** - Full control over your data
- **Secure crash reporting** - Optional error tracking with privacy controls (see [Crash Reporting Setup](CRASH_REPORTING.md))
  - PII automatically filtered
  - Sensitive data redacted
  - User consent respected

## 📱 Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS    | ✅ Full support | Requires accessibility permissions |
| Windows  | ✅ Full support | PowerShell execution required |
| Linux    | ✅ Full support | X11 environment required |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Translation Contributions

Want to add support for your language? See our [Translation Guide](TRANSLATION_GUIDE.md)!

**Currently supported languages:**
- 🇬🇧 English
- 🇸🇦 Arabic (العربية)

We're actively looking for translations in:
- French (Français)
- Spanish (Español)
- German (Deutsch)
- And more!

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Roadmap

- [ ] Cloud sync (optional)
- [ ] Mobile companion app
- [ ] Advanced analytics
- [ ] Team collaboration features
- [ ] Plugin system
- [ ] Custom themes

## 🐛 Known Issues

- Browser detection may not work with all browsers
- Some applications may not be detected properly
- Wayland support on Linux is limited

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Electron](https://electronjs.org/) - Desktop app framework
- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite driver

## 📞 Support

- 🐛 [Report a bug](https://github.com/yourusername/lume/issues/new?template=bug_report.md)
- 💡 [Request a feature](https://github.com/yourusername/lume/issues/new?template=feature_request.md)
- 🔒 [Report a security issue](https://github.com/yourusername/lume/issues/new?template=security_report.md)

## ⭐ Show Your Support

If you find Lume helpful, please consider giving it a star ⭐ on GitHub!

---

<p align="center">Made with ❤️ in Iraq for productivity enthusiasts</p>