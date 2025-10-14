# Contributing to Lume

Thank you for your interest in contributing to Lume! We welcome contributions from everyone, whether you're fixing a bug, implementing a new feature, or improving documentation.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Code editor (VS Code recommended)

### Setting Up Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/lume.git
   cd lume
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-repo/lume.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Start development server**:
   ```bash
   npm run dev
   ```

## 📋 Development Guidelines

### Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Format code
npm run format
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` code style changes (formatting, etc.)
- `refactor:` code refactoring
- `test:` adding or updating tests
- `chore:` maintenance tasks

Examples:
```
feat: add dark mode support
fix: resolve activity tracking on Windows
docs: update installation instructions
```

### Branch Naming

Use descriptive branch names:
- `feature/activity-export`
- `fix/windows-detection-bug`
- `docs/contributing-guide`

## 🏗️ Project Structure

```
lume/
├── src/
│   ├── main/                    # Electron main process (~220 lines)
│   │   ├── main.ts              # Application entry point (LumeApp class)
│   │   ├── preload.ts           # Preload script with namespaced API
│   │   ├── core/                # Core managers (5 managers)
│   │   │   ├── WindowManager.ts        # Window lifecycle
│   │   │   ├── TrayManager.ts          # System tray
│   │   │   ├── SettingsManager.ts      # Persistent config
│   │   │   ├── AppLifecycleManager.ts  # Electron events
│   │   │   └── AutoLaunchManager.ts    # Startup config
│   │   ├── services/            # Service container (Phase 3)
│   │   │   └── ServiceContainer.ts     # Dependency injection
│   │   └── ipc/                 # IPC handlers (Phase 2)
│   │       ├── IPCRouter.ts            # Handler registration
│   │       ├── IPCContext.ts           # Context object
│   │       └── handlers/               # 20 handler groups
│   │           ├── TimeEntryHandlers.ts
│   │           ├── CategoriesHandlers.ts
│   │           ├── GoalsHandlers.ts
│   │           └── ... (17 more)
│   ├── services/                # Business logic services (8 services)
│   │   ├── activity/
│   │   │   ├── ActivityTrackingService.ts    # Auto tracking
│   │   │   ├── ActivityValidationService.ts  # Data quality
│   │   │   └── ActivityMergeService.ts       # Deduplication
│   │   ├── pomodoro/
│   │   │   └── PomodoroService.ts            # Focus timer
│   │   ├── goals/
│   │   │   └── GoalsService.ts               # Productivity goals
│   │   ├── categories/
│   │   │   └── CategoriesService.ts          # Category management
│   │   └── notifications/
│   │       └── NotificationService.ts        # System notifications
│   ├── database/                # Data persistence layer
│   │   ├── DatabaseManager.ts          # SQLite connection
│   │   ├── repositories/               # Repository pattern (5 repos)
│   │   │   ├── TimeEntryRepository.ts
│   │   │   ├── AppUsageRepository.ts
│   │   │   ├── GoalsRepository.ts
│   │   │   ├── PomodoroRepository.ts
│   │   │   └── CategoryRepository.ts
│   │   └── analytics/                  # Complex queries (3 analytics)
│   │       ├── ActivityAnalytics.ts
│   │       ├── GoalAnalytics.ts
│   │       └── PomodoroAnalytics.ts
│   ├── components/              # React components (renderer process)
│   │   ├── Dashboard/           # Main dashboard
│   │   ├── Timeline/            # Activity timeline
│   │   ├── Analytics/           # Reports and charts
│   │   ├── Goals/               # Goal management
│   │   ├── Categories/          # Category management
│   │   └── Settings/            # App configuration
│   └── types/                   # TypeScript definitions
│       ├── electron.d.ts        # Preload API types (18 namespaces)
│       ├── activity.ts          # Activity types
│       ├── goals.ts             # Goal types
│       └── ... (more type definitions)
├── tests/                       # Test files
│   ├── unit/                    # Unit tests (32+ tests)
│   ├── integration/             # Integration tests
│   └── e2e/                     # End-to-end tests
└── docs/                        # Documentation
    ├── ARCHITECTURE.md          # Comprehensive architecture docs
    ├── diagrams.md              # Mermaid diagrams (6 diagrams)
    ├── PHASE4_SUMMARY.md        # Phase 4 refactoring notes
    └── CONTRIBUTING.md          # This file
```

## 🏛️ Architecture Overview

Lume follows a clean, modular architecture with clear separation of concerns. For comprehensive architecture documentation, see [ARCHITECTURE.md](docs/ARCHITECTURE.md) and [diagrams.md](docs/diagrams.md).

### Key Components

1. **Main Process** (`src/main/main.ts` - ~220 lines)
   - **5 Core Managers**: Window, Tray, Settings, Lifecycle, AutoLaunch
   - **ServiceContainer**: Manages 8 services with dependency injection
   - **IPC Layer**: 20 handler groups for renderer communication

2. **Renderer Process** (`src/components/`)
   - React 19 components with TypeScript
   - Communicates with main process via namespaced API

3. **Services** (`src/services/`)
   - 8 specialized services (tracking, pomodoro, goals, etc.)
   - Dependency injection pattern for testability

4. **Database** (`src/database/`)
   - SQLite with better-sqlite3
   - Repository pattern (5 repositories)
   - Analytics layer for complex queries

### Common Development Tasks

#### Adding a New IPC Handler

1. Create a new handler file in `src/main/ipc/handlers/`:

```typescript
// src/main/ipc/handlers/MyFeatureHandlers.ts
import { ipcMain } from 'electron';
import { IPCContext } from '../IPCContext';

export function registerMyFeatureHandlers(context: IPCContext): void {
  // Get required services from context
  const { dbManager } = context;

  // Register handler
  ipcMain.handle('my-feature-action', async (_event, arg1: string) => {
    try {
      // Use services to perform action
      const result = await dbManager.myFeatureRepository.doSomething(arg1);
      return result;
    } catch (error) {
      console.error('Failed to perform action:', error);
      throw error;
    }
  });
}
```

2. Register in `src/main/ipc/IPCRouter.ts`:

```typescript
import { registerMyFeatureHandlers } from './handlers/MyFeatureHandlers';

export class IPCRouter {
  registerHandlers(context: IPCContext): void {
    // ... existing handlers
    registerMyFeatureHandlers(context);
  }
}
```

3. Add to preload API in `src/main/preload.ts`:

```typescript
// Add to electronAPI object
myFeature: {
  doAction: (arg: string) => ipcRenderer.invoke('my-feature-action', arg),
},
```

4. Add TypeScript types in `src/types/electron.d.ts`:

```typescript
export interface IElectronAPI {
  // ... existing namespaces
  myFeature: {
    doAction: (arg: string) => Promise<ResultType>;
  };
}
```

#### Adding a Service to ServiceContainer

1. Create your service in `src/services/`:

```typescript
// src/services/myfeature/MyFeatureService.ts
import { DatabaseManager } from '../../database/DatabaseManager';

export class MyFeatureService {
  constructor(
    private dbManager: DatabaseManager,
    private someOtherService?: SomeOtherService
  ) {}

  async performAction(data: string): Promise<Result> {
    // Business logic here
    return this.dbManager.myFeatureRepository.save(data);
  }
}
```

2. Add to ServiceContainer in `src/main/services/ServiceContainer.ts`:

```typescript
export class ServiceContainer {
  private myFeatureService: MyFeatureService | null = null;

  async initialize(userDataPath: string, settings: Settings): Promise<void> {
    // ... existing initialization

    // Add your service initialization
    this.initializeMyFeatureService();
  }

  private initializeMyFeatureService(): void {
    if (!this.dbManager) {
      throw new Error('Database manager not initialized');
    }

    this.myFeatureService = new MyFeatureService(
      this.dbManager,
      this.someOtherService || undefined
    );
    console.log('✅ MyFeature service initialized');
  }

  getMyFeatureService(): MyFeatureService | null {
    return this.myFeatureService;
  }
}
```

3. Add to IPCContext in `src/main/ipc/IPCContext.ts`:

```typescript
export interface IPCContext {
  // ... existing services
  myFeatureService: MyFeatureService | null;
}
```

4. Write unit tests in `tests/unit/services/`:

```typescript
// tests/unit/services/MyFeatureService.test.ts
import { MyFeatureService } from '../../../src/services/myfeature/MyFeatureService';

describe('MyFeatureService', () => {
  let service: MyFeatureService;
  let mockDbManager: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockDbManager = createMockDbManager();
    service = new MyFeatureService(mockDbManager);
  });

  it('should perform action successfully', async () => {
    const result = await service.performAction('test');
    expect(result).toBeDefined();
  });
});
```

#### Using Namespaced API in Renderer Components

```typescript
// src/components/MyFeature/MyFeatureComponent.tsx
import React, { useState, useEffect } from 'react';

export const MyFeatureComponent: React.FC = () => {
  const [data, setData] = useState<DataType[]>([]);

  useEffect(() => {
    // Fetch data using namespaced API
    const loadData = async () => {
      try {
        // Use window.electronAPI.<namespace>.<method>()
        const result = await window.electronAPI.myFeature.getAll();
        setData(result);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  const handleAction = async (arg: string) => {
    try {
      // Call IPC method
      await window.electronAPI.myFeature.doAction(arg);

      // Refresh data
      const updated = await window.electronAPI.myFeature.getAll();
      setData(updated);
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
};
```

### Architecture Principles

1. **Separation of Concerns**: Clear boundaries between main/renderer, services, and data layers
2. **Dependency Injection**: Services receive dependencies through constructors
3. **Type Safety**: Full TypeScript coverage with strict mode enabled
4. **Testability**: Services and handlers are unit-testable
5. **Security**: Context bridge isolation between main and renderer processes

For detailed architecture documentation, see:
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Comprehensive technical documentation
- [diagrams.md](docs/diagrams.md) - Visual architecture diagrams (Mermaid)

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Place test files next to the code they test with `.test.ts` or `.test.tsx` extension
- Use descriptive test names that explain what is being tested
- Follow the Arrange-Act-Assert pattern

Example:
```typescript
describe('ActivityTrackingService', () => {
  it('should start tracking when enabled', () => {
    // Arrange
    const service = new ActivityTrackingService(mockDatabase);

    // Act
    service.start();

    // Assert
    expect(service.isTracking()).toBe(true);
  });
});
```

## 🔧 Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, readable code
- Add tests for new functionality
- Update documentation if needed
- Ensure all tests pass

### 3. Test Your Changes

```bash
# Run tests
npm test

# Test the app manually
npm run dev

# Build to ensure everything compiles
npm run build
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 📝 Pull Request Guidelines

### Before Submitting

- [ ] Code follows the project's style guidelines
- [ ] All tests pass
- [ ] New code has appropriate tests
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventional commits format

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality

## Screenshots (if applicable)

## Additional Notes
```

## 🐛 Reporting Issues

### Bug Reports

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- **Description**: Clear description of the bug
- **Steps to reproduce**: Detailed steps to reproduce the issue
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Node.js version, app version
- **Screenshots**: If applicable

### Feature Requests

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and include:

- **Problem description**: What problem does this solve?
- **Proposed solution**: How should this be implemented?
- **Alternatives considered**: Other solutions you've thought about
- **Additional context**: Any other relevant information

### Security Issues

For security vulnerabilities, please use the [security report template](.github/ISSUE_TEMPLATE/security_report.md) or email security@lume-app.com instead of creating a public issue.

## 🎯 Areas for Contribution

We welcome contributions in these areas:

### High Priority
- Cross-platform compatibility improvements
- Performance optimizations
- UI/UX enhancements
- Test coverage improvements

### Features
- Data export/import functionality
- Advanced reporting and analytics
- Plugin system
- Accessibility improvements

### Documentation
- API documentation
- User guides
- Video tutorials
- Translation support

## 📚 Resources

### Development Tools
- [Electron Documentation](https://electronjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Design Guidelines
- Follow Material Design principles
- Maintain consistency with existing UI
- Ensure accessibility standards (WCAG 2.1)
- Test with different screen sizes

## 💬 Getting Help

- **GitHub Discussions**: For general questions and community support
- **Issues**: For bug reports and feature requests
- **Discord**: Join our community chat (link in README)

## 🏆 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes for significant contributions
- Hall of Fame for major contributors

## 📄 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## 🎉 Thank You!

Your contributions make Lume better for everyone. Whether you're fixing typos, adding features, or helping other users, every contribution is valuable and appreciated!

---

**Questions?** Feel free to ask in GitHub Discussions or create an issue with the "question" label.