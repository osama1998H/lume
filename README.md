# Lume ⚡

> A powerful desktop application for tracking and visualizing time spent on tasks and applications.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-29+-blue.svg)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)

[![CI](https://github.com/osama1998H/lume/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/osama1998H/lume/actions/workflows/ci.yml)
[![Build & Release](https://github.com/osama1998H/lume/actions/workflows/build.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/build.yml)
[![Code Coverage](https://github.com/osama1998H/lume/actions/workflows/coverage.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/coverage.yml)
[![CodeQL](https://github.com/osama1998H/lume/actions/workflows/codeql.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/codeql.yml)
[![Dependency Review](https://github.com/osama1998H/lume/actions/workflows/dependency-review.yml/badge.svg?branch=main)](https://github.com/osama1998H/lume/actions/workflows/dependency-review.yml)
[![Bundle Size](https://github.com/osama1998H/lume/actions/workflows/bundle-size.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/bundle-size.yml)
[![Nightly Builds](https://github.com/osama1998H/lume/actions/workflows/nightly.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/nightly.yml)

Lume helps you understand your productivity patterns by automatically tracking time spent on different applications and websites. Get clear insights to improve focus, productivity, and time management.

<details>
<summary>📸 Screenshots</summary>

<img width="1747" height="1147" alt="Screenshot 2025-10-05 at 9 48 09 PM" src="https://github.com/user-attachments/assets/f2b84f07-1ede-4590-a6d0-76f8ccd3d4c4" />
<img width="1497" height="1059" alt="Screenshot 2025-10-05 at 10 57 46 PM" src="https://github.com/user-attachments/assets/2551184e-b9d7-49f3-b96d-1c769af033c6" />

</details>

## ✨ Features

### 🎯 Core Tracking
- **Cross-platform monitoring** - Works on macOS, Windows, and Linux
- **Automatic activity tracking** - Monitor time spent in applications and websites
- **Smart session detection** - Detects context switches automatically
- **Idle detection** - Pauses tracking when you're away
- **Timeline view** - Visual timeline of your daily activities with summaries

### 🚀 Productivity Tools
- **Productivity Goals** - Set daily/weekly goals with progress tracking and notifications
- **Pomodoro Timer** - Built-in focus timer with customizable work/break intervals
- **Tag Management** - Organize sessions and goals with custom tags
- **Advanced Analytics**
  - Calendar heatmap visualization
  - Hourly activity patterns
  - Weekly summaries with trends
  - Behavioral insights and recommendations
  - Daily productivity statistics

### ⚙️ Customization & Settings
- **Multi-language support** - English and Arabic with RTL support ([add more languages!](TRANSLATION_GUIDE.md))
- **Collapsible sidebar** - Maximize your workspace
- **Flexible time periods** - View data by day, week, or month
- **Tracking controls** - Adjust intervals, idle thresholds, and blacklists
- **Auto-start on login** - Launch automatically when you boot your system
- **Custom themes** - Personalize your experience

### 🔒 Privacy & Security
- **Local-first** - All data stays on your device
- **No cloud sync** - No data sent to external servers
- **Data export** - Full control over your data
- **Optional crash reporting** - Privacy-focused error tracking with PII filtering ([learn more](CRASH_REPORTING.md))

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lume.git
cd lume

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm run package
```

### Configuration (Optional)
```bash
cp .env.example .env
# Add your Sentry DSN for crash reporting
```

## 🔧 Development

### Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Backend**: Electron, Node.js
- **Database**: SQLite with better-sqlite3 (Repository pattern)
- **Build**: Vite, electron-builder
- **Testing**: Jest, React Testing Library
- **i18n**: react-i18next
- **Monitoring**: Sentry (optional)

### Project Structure
```
lume/
├── src/
│   ├── main/              # Electron main process
│   ├── renderer/          # React frontend
│   ├── components/        # React components
│   ├── services/          # Business logic services
│   ├── database/          # Database layer (repositories, analytics)
│   └── types/             # TypeScript definitions
├── dist/                  # Built application
└── assets/               # Static assets
```

### Available Scripts
- `npm run dev` - Start development environment
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run package` - Package for distribution

### Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS    | ✅ Full support | Requires accessibility permissions |
| Windows  | ✅ Full support | PowerShell execution required |
| Linux    | ✅ Full support | X11 environment required |

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

### Translation Contributions
Want to add support for your language? See our [Translation Guide](TRANSLATION_GUIDE.md)!

**Currently supported:**
- 🇬🇧 English
- 🇸🇦 Arabic (العربية)

**Help wanted:**
- French, Spanish, German, and more!

### Quick Steps
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Roadmap

- [ ] Cloud sync (optional)
- [ ] Mobile companion app
- [ ] Plugin system
- [ ] Team collaboration features
- [ ] AI-powered productivity recommendations

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
