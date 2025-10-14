# Lume Architecture Documentation

> Comprehensive technical documentation for the Lume desktop time-tracking application.

**Version**: 2.5.4
**Last Updated**: 2025-10-14
**Maintained By**: Lume Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Design Principles](#design-principles)
4. [Main Process Architecture](#main-process-architecture)
5. [Renderer Process Architecture](#renderer-process-architecture)
6. [IPC Communication](#ipc-communication)
7. [Preload API](#preload-api)
8. [Service Layer](#service-layer)
9. [Database Layer](#database-layer)
10. [Refactoring Journey](#refactoring-journey)
11. [Testing Strategy](#testing-strategy)
12. [Build & Deployment](#build--deployment)

---

## Overview

Lume is an Electron-based desktop application for automatic time tracking and productivity analysis. The application monitors user activity across applications and websites, providing insights through visualizations, goals, and a built-in Pomodoro timer.

### Architecture Highlights

- **Electron Multi-Process**: Separate main and renderer processes for security
- **Service Container**: Dependency injection for 8 core services
- **Repository Pattern**: Clean database abstraction layer
- **Namespaced IPC**: Type-safe communication via 18 logical namespaces
- **React 19**: Modern UI with hooks and context
- **TypeScript**: Full type safety across the codebase

### Key Metrics

| Metric | Value |
|--------|-------|
| Main Process | ~220 lines (main.ts) |
| Core Managers | 5 managers |
| Services | 8 services |
| IPC Handlers | 20 handler groups |
| Preload Namespaces | 18 namespaces |
| Database Tables | 14 tables |
| Test Coverage | 32 unit tests (Phase 3) |
| Lines Refactored | ~2000 lines → ~220 lines |

---

## Technology Stack

### Frontend (Renderer Process)

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.x | UI framework with hooks |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Vite** | 6.x | Fast build tool & dev server |
| **react-i18next** | Latest | Internationalization (EN, AR) |
| **Recharts** | Latest | Data visualization |

### Backend (Main Process)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Electron** | 29.x | Desktop app framework |
| **Node.js** | 18+ | JavaScript runtime |
| **TypeScript** | 5.x | Type safety |
| **better-sqlite3** | Latest | Synchronous SQLite driver |

### Development & Build

| Tool | Purpose |
|------|---------|
| **Jest** | Unit testing framework |
| **React Testing Library** | Component testing |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **electron-builder** | Packaging for macOS/Windows/Linux |
| **Sentry** | Optional error tracking |

---

## Design Principles

### 1. Separation of Concerns

**Before** (Phase 1):
```typescript
// main.ts: 2106 lines - everything in one file
class LumeApp {
  // Window management
  // IPC handlers
  // Service initialization
  // Database setup
  // Tray management
  // Settings management
  // etc... (2106 lines)
}
```

**After** (Phase 5):
```typescript
// main.ts: ~220 lines - orchestration only
class LumeApp {
  private windowManager: WindowManager;
  private trayManager: TrayManager;
  private settingsManager: SettingsManager;
  private lifecycleManager: AppLifecycleManager;
  private autoLaunchManager: AutoLaunchManager;
  private serviceContainer: ServiceContainer;
  private ipcRouter: IPCRouter;

  constructor() {
    // Initialize managers
    // Delegate responsibilities
  }
}
```

### 2. Dependency Injection

Services receive dependencies through constructors:

```typescript
class GoalsService {
  constructor(
    private dbManager: DatabaseManager,
    private notificationService?: NotificationService
  ) {}
}

// ServiceContainer manages instantiation
const goalsService = new GoalsService(dbManager, notificationService);
```

**Benefits**:
- Easy to test (mock dependencies)
- Clear dependency graph
- No circular dependencies

### 3. Type Safety

Full TypeScript coverage with strict mode:

```typescript
// Preload API interfaces (Phase 4)
interface ICategoriesAPI {
  getAll: () => Promise<Category[]>;
  getById: (id: number) => Promise<Category | null>;
  add: (category: Category) => Promise<number>;
  update: (id: number, updates: Partial<Category>) => Promise<boolean>;
  delete: (id: number) => Promise<boolean>;
}

// Renderer usage
const categories = await window.electronAPI.categories.getAll();
//    ^? Category[]
```

### 4. Security First

- **Context Isolation**: Renderer cannot access Node.js APIs
- **Preload Script**: Whitelisted API via `contextBridge`
- **No Node Integration**: Renderer is sandboxed
- **IPC Validation**: All inputs validated in handlers

```typescript
// Secure API exposure
contextBridge.exposeInMainWorld('electronAPI', {
  categories: {
    getAll: () => ipcRenderer.invoke('get-categories'),
    // Only specific methods exposed
  }
});
```

### 5. Testability

Services are designed for unit testing:

```typescript
describe('ServiceContainer', () => {
  it('should initialize all services in correct order', async () => {
    const container = new ServiceContainer();
    await container.initialize(testUserDataPath, testSettings);

    expect(container.getDatabaseManager()).not.toBeNull();
    expect(container.getGoalsService()).not.toBeNull();
  });
});
```

---

## Main Process Architecture

The main process handles:
- Window lifecycle
- System tray
- IPC communication
- Database access
- Background services
- OS integration (auto-start, notifications)

### High-Level Structure

```
main.ts (LumeApp)
├── Core Managers (5 managers)
│   ├── WindowManager - BrowserWindow lifecycle
│   ├── TrayManager - System tray icon & menu
│   ├── SettingsManager - Persistent configuration
│   ├── AppLifecycleManager - Electron app events
│   └── AutoLaunchManager - Launch at login
├── Service Container (Phase 3)
│   ├── DatabaseManager
│   ├── NotificationService
│   ├── CategoriesService
│   ├── ActivityValidationService
│   ├── ActivityMergeService
│   ├── GoalsService
│   ├── ActivityTrackingService
│   └── PomodoroService
└── IPC Layer (Phase 2)
    ├── IPCRouter
    └── 20 Handler Groups
```

### Core Managers

#### WindowManager

**File**: `src/main/core/WindowManager.ts`

**Responsibilities**:
- Create and configure `BrowserWindow`
- Handle show/hide operations
- Manage minimize-to-tray behavior
- Load renderer (dev: localhost:5173, prod: index.html)

**Key Methods**:
- `createWindow()`: Create main window with security settings
- `showWindow()`: Show and focus window, restore if minimized
- `hideWindow()`: Hide window (tray mode)
- `isVisible()`: Check visibility state

**Dependencies**: SettingsManager

#### TrayManager

**File**: `src/main/core/TrayManager.ts`

**Responsibilities**:
- Create system tray icon
- Build context menu with app state
- Handle click events (toggle window)
- Display tracking status

**Key Methods**:
- `setup()`: Create tray if minimizeToTray enabled
- `updateMenu()`: Refresh menu with current state
- `destroy()`: Remove tray icon

**Dependencies**: WindowManager, SettingsManager, ActivityTracker (optional)

#### SettingsManager

**File**: `src/main/core/SettingsManager.ts`

**Responsibilities**:
- Load settings from `settings.json`
- Save settings with formatting
- Provide default values

**Settings Structure**:
```json
{
  "autoTrackApps": true,
  "showNotifications": true,
  "minimizeToTray": false,
  "autoStartOnLogin": false,
  "autoStartTracking": false,
  "defaultCategory": null,
  "activityTracking": { "enabled": true, ... },
  "pomodoro": { "focusDuration": 25, ... }
}
```

**File Location**:
- macOS: `~/Library/Application Support/Electron/settings.json`
- Windows: `%APPDATA%/Electron/settings.json`
- Linux: `~/.config/Electron/settings.json`

#### AppLifecycleManager

**File**: `src/main/core/AppLifecycleManager.ts`

**Responsibilities**:
- Handle Electron app events
- Set dock icon (macOS)
- Coordinate startup/shutdown

**Events Handled**:
- `ready`: Initialize app components
- `activate`: Reopen window (macOS)
- `window-all-closed`: Quit or stay in tray
- `before-quit`: Cleanup

#### AutoLaunchManager

**File**: `src/main/core/AutoLaunchManager.ts`

**Responsibilities**:
- Enable/disable launch at login
- Sync OS login items with settings
- Cross-platform implementation

**Platform Behavior**:
- **macOS**: Login Items in System Preferences
- **Windows**: Registry key in `HKCU\...\Run`
- **Linux**: `.desktop` file in `~/.config/autostart/`

### Initialization Flow

```typescript
// 1. Create managers
const settingsManager = new SettingsManager();
const windowManager = new WindowManager(settingsManager);
const lifecycleManager = new AppLifecycleManager(app);
const autoLaunchManager = new AutoLaunchManager(app, settingsManager);

// 2. Setup lifecycle
lifecycleManager.setup({
  onReady: async () => {
    // 3. Create window
    windowManager.createWindow();

    // 4. Initialize services
    const serviceContainer = new ServiceContainer();
    await serviceContainer.initialize(
      app.getPath('userData'),
      settingsManager.getSettings()
    );

    // 5. Setup tray
    const activityTracker = serviceContainer.getActivityTrackingService();
    const trayManager = new TrayManager(
      windowManager,
      settingsManager,
      activityTracker
    );
    trayManager.setup();

    // 6. Register IPC handlers
    const router = new IPCRouter(ipcMain, context);
    router.registerAll([...20 handler groups]);

    // 7. Apply auto-start
    autoLaunchManager.apply();
  },
  // Other lifecycle callbacks...
});
```

---

## Renderer Process Architecture

The renderer process is a standard React application with no direct Node.js access.

### Project Structure

```
src/renderer/
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Settings.tsx     # Settings panel
│   ├── Timeline.tsx     # Activity timeline
│   ├── Analytics.tsx    # Charts & insights
│   ├── Goals.tsx        # Goal management
│   ├── Categories.tsx   # Category management
│   └── ...
├── contexts/            # React contexts
│   ├── PomodoroContext.tsx
│   └── ThemeContext.tsx
├── hooks/               # Custom hooks
├── i18n/                # Translations (EN, AR)
├── types/               # TypeScript types
└── App.tsx              # Root component
```

### Component Communication

Components communicate with the main process via `window.electronAPI`:

```typescript
// Dashboard.tsx
function Dashboard() {
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);

  useEffect(() => {
    // Fetch activities using namespaced API
    const fetchActivities = async () => {
      const data = await window.electronAPI.activities.getAll(
        startDate,
        endDate
      );
      setActivities(data);
    };

    fetchActivities();
  }, [startDate, endDate]);

  return <ActivityList activities={activities} />;
}
```

### State Management

- **React Context**: For global state (theme, pomodoro timer)
- **Local State**: For component-specific data
- **IPC Events**: For real-time updates from main process

```typescript
// PomodoroContext.tsx
const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: Props) {
  const [timerStatus, setTimerStatus] = useState<TimerStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const status = await window.electronAPI.pomodoro.timer.getStatus();
      setTimerStatus(status);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <PomodoroContext.Provider value={{ timerStatus, ... }}>
      {children}
    </PomodoroContext.Provider>
  );
}
```

---

## IPC Communication

### Phase 2: Handler Groups

Before Phase 2, all IPC handlers were registered inline in `main.ts` (~600 lines).

After Phase 2, handlers are organized into 20 groups:

| Handler Group | File | Responsibilities |
|--------------|------|------------------|
| **Batch 1: Simple CRUD** | | |
| TimeEntryHandlers | TimeEntryHandlers.ts | Time entry operations |
| AppUsageHandlers | AppUsageHandlers.ts | App usage logging |
| SettingsHandlers | SettingsHandlers.ts | Settings get/save |
| CategoriesHandlers | CategoriesHandlers.ts | Category management |
| TagsHandlers | TagsHandlers.ts | Tag management |
| **Batch 2: Service-Based** | | |
| ActivityTrackingHandlers | ActivityTrackingHandlers.ts | Start/stop tracking |
| PomodoroTimerHandlers | PomodoroTimerHandlers.ts | Timer control |
| PomodoroSettingsHandlers | PomodoroSettingsHandlers.ts | Pomodoro config |
| PomodoroSessionHandlers | PomodoroSessionHandlers.ts | Session history |
| GoalsHandlers | GoalsHandlers.ts | Goals CRUD + progress |
| AutoStartHandlers | AutoStartHandlers.ts | Launch at login |
| **Batch 3: Complex Queries** | | |
| CategoryMappingsHandlers | CategoryMappingsHandlers.ts | App/domain mappings |
| TagAssociationsHandlers | TagAssociationsHandlers.ts | Tag relationships |
| StatisticsHandlers | StatisticsHandlers.ts | Aggregate stats |
| TimelineHandlers | TimelineHandlers.ts | Timeline view data |
| AnalyticsHandlers | AnalyticsHandlers.ts | Charts & insights |
| **Batch 4: Data Quality** | | |
| CrashReporterHandlers | CrashReporterHandlers.ts | Crash reports |
| DataManagementHandlers | DataManagementHandlers.ts | Export/import |
| UnifiedActivityHandlers | UnifiedActivityHandlers.ts | Activity log |
| DataQualityHandlers | DataQualityHandlers.ts | Gap/duplicate detection |

### IPCRouter Pattern

**File**: `src/main/ipc/IPCRouter.ts`

Centralizes handler registration:

```typescript
export class IPCRouter {
  constructor(
    private ipcMain: IpcMain,
    private context: IIPCHandlerContext
  ) {}

  register(handlerGroup: IIPCHandlerGroup): void {
    try {
      handlerGroup.register(this.ipcMain, this.context);
      console.log(`✅ Registered IPC handler group: ${handlerGroup.constructor.name}`);
    } catch (error) {
      console.error(`❌ Failed to register handler group:`, error);
    }
  }

  registerAll(handlerGroups: IIPCHandlerGroup[]): void {
    console.log(`🔌 Registering ${handlerGroups.length} IPC handler groups...`);

    let successCount = 0;
    let failureCount = 0;

    handlerGroups.forEach(group => {
      try {
        this.register(group);
        successCount++;
      } catch (error) {
        failureCount++;
      }
    });

    console.log(`✅ IPC registration complete: ${successCount} succeeded, ${failureCount} failed`);
  }
}
```

### Handler Group Interface

```typescript
export interface IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void;
}

// Example implementation
export class CategoriesHandlers implements IIPCHandlerGroup {
  register(ipcMain: IpcMain, context: IIPCHandlerContext): void {
    const { categoriesService } = context;

    ipcMain.handle('get-categories', async () => {
      if (!categoriesService) {
        throw new Error('CategoriesService not initialized');
      }
      return await categoriesService.getAll();
    });

    ipcMain.handle('add-category', async (event, category: Category) => {
      if (!categoriesService) {
        throw new Error('CategoriesService not initialized');
      }
      return await categoriesService.add(category);
    });

    // ... more handlers
  }
}
```

### Context Object

The context provides access to all services and managers:

```typescript
export interface IIPCHandlerContext {
  // Core managers
  windowManager: WindowManager;
  trayManager: TrayManager | null;
  settingsManager: SettingsManager;
  autoLaunchManager: AutoLaunchManager;

  // Services (from ServiceContainer)
  dbManager: DatabaseManager | null;
  activityTracker: ActivityTrackingService | null;
  pomodoroService: PomodoroService | null;
  notificationService: NotificationService | null;
  goalsService: GoalsService | null;
  categoriesService: CategoriesService | null;
  activityValidationService: ActivityValidationService | null;
  activityMergeService: ActivityMergeService | null;
}
```

---

## Preload API

### Phase 4: Namespaced API

The preload script is the **security bridge** between renderer and main process.

**File**: `src/main/preload.ts` (~820 lines)

#### Before Phase 4: Flat API (91 methods)

```typescript
// Hard to discover, poor organization
window.electronAPI.getCategories()
window.electronAPI.getCategoryById(id)
window.electronAPI.addCategory(category)
window.electronAPI.updateCategory(id, updates)
window.electronAPI.deleteCategory(id)
window.electronAPI.getTags()
window.electronAPI.getTagById(id)
// ... 84 more flat methods
```

**Problems**:
- Hard to discover related methods
- Poor IDE autocomplete experience
- No logical grouping
- Difficult to navigate

#### After Phase 4: Namespaced API (18 namespaces)

```typescript
// Clear organization, excellent discoverability
window.electronAPI.categories.getAll()
window.electronAPI.categories.getById(id)
window.electronAPI.categories.add(category)
window.electronAPI.categories.update(id, updates)
window.electronAPI.categories.delete(id)

window.electronAPI.tags.getAll()
window.electronAPI.tags.getById(id)

// Nested structures for complex features
window.electronAPI.pomodoro.settings.get()
window.electronAPI.pomodoro.timer.start(task, type)
window.electronAPI.pomodoro.sessions.getStats(start, end)
```

**Benefits**:
- ✅ Clear logical organization
- ✅ Better IDE autocomplete
- ✅ Easy to discover related methods
- ✅ Type-safe with full TypeScript support
- ✅ Backward compatible (hybrid API during migration)

### 18 Namespaces

| Namespace | Methods | Description |
|-----------|---------|-------------|
| `timeEntries` | 3 | Time entry management |
| `appUsage` | 1 | App usage logging |
| `settings` | 2 | Settings get/save |
| `activityTracking` | 7 | Activity tracking control |
| `autoStart` | 2 | Auto-start config |
| `crashReporting` | 3 | Crash reporting |
| `pomodoro` | 11 (nested) | Timer, sessions, settings |
| `goals` | 8 | Goal CRUD + progress |
| `categories` | 5 | Category management |
| `tags` | 4 | Tag management |
| `categoryMappings` | 6 (nested) | App/domain mappings |
| `tagAssociations` | 12 (nested) | Tag relationships |
| `statistics` | 2 | Aggregate stats |
| `timeline` | 2 | Timeline data |
| `analytics` | 8 | Charts & insights |
| `dataManagement` | 3 | Export/import/clear |
| `activities` | 9 | Unified activity log |
| `dataQuality` | 14 (nested) | Gaps, duplicates, validation |

### Namespace Interface Example

```typescript
interface IPomodoroAPI {
  settings: {
    get: () => Promise<PomodoroSettings>;
    save: (settings: Partial<PomodoroSettings>) => Promise<boolean>;
  };
  sessions: {
    add: (session: PomodoroSession) => Promise<number>;
    update: (id: number, updates: Partial<PomodoroSession>) => Promise<boolean>;
    getStats: (startDate?: string, endDate?: string) => Promise<PomodoroStats>;
  };
  timer: {
    start: (task: string, sessionType: string) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    stop: () => Promise<void>;
    skip: () => Promise<void>;
    getStatus: () => Promise<PomodoroTimerStatus>;
  };
}
```

### Context Bridge Security

The preload script uses `contextBridge` to safely expose APIs:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Helper function (not exposed)
function createCategoriesAPI(): ICategoriesAPI {
  return {
    getAll: () => ipcRenderer.invoke('get-categories'),
    getById: (id) => ipcRenderer.invoke('get-category-by-id', id),
    add: (category) => ipcRenderer.invoke('add-category', category),
    update: (id, updates) => ipcRenderer.invoke('update-category', id, updates),
    delete: (id) => ipcRenderer.invoke('delete-category', id),
  };
}

// Build API object
const electronAPI = {
  categories: createCategoriesAPI(),
  tags: createTagsAPI(),
  // ... 16 more namespaces
};

// Expose to renderer (ONLY this object is accessible)
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

**Security guarantees**:
- Renderer cannot access `ipcRenderer` directly
- Renderer cannot access Node.js APIs
- Only whitelisted methods are exposed
- All IPC communication is auditable

---

## Service Layer

### Phase 3: Service Container

The ServiceContainer manages 8 services with dependency injection.

**File**: `src/main/services/ServiceContainer.ts`

### Dependency Graph

```
DatabaseManager (root)
├── NotificationService (settings)
├── CategoriesService (DB)
├── ActivityValidationService (DB)
│   └── ActivityMergeService (DB + validation)
├── GoalsService (DB + notifications)
├── ActivityTrackingService (DB + goals)
└── PomodoroService (DB + notifications + settings)
```

### Initialization Order

```typescript
async initialize(userDataPath: string, settings: Settings): Promise<void> {
  // 1. Root dependency
  await this.initializeDatabaseManager(userDataPath);

  // 2. Settings-dependent services
  this.initializeNotificationService(settings);

  // 3. Database-dependent services
  await this.initializeCategoriesService();
  this.initializeActivityValidationService();

  // 4. Multi-dependency services
  this.initializeActivityMergeService(); // DB + validation
  this.initializeGoalsService(); // DB + notifications
  this.initializeActivityTrackingService(); // DB + goals
  this.initializePomodoroService(); // DB + notifications + settings
}
```

### Service Descriptions

#### 1. DatabaseManager

**File**: `src/main/database/DatabaseManager.ts`

**Responsibilities**:
- SQLite connection management
- Database initialization and migrations
- Repository pattern implementation
- Transaction management

**Key Features**:
- **Repositories**: TimeEntry, AppUsage, Goals, Pomodoro, Categories, Tags
- **Analytics**: Complex aggregations and statistics
- **Migrations**: Versioned schema updates (14 tables)
- **Transactions**: ACID guarantees via better-sqlite3

#### 2. NotificationService

**File**: `src/main/services/notifications/NotificationService.ts`

**Responsibilities**:
- System notifications (Electron Notification API)
- Sound playback for alerts
- Configurable notification preferences

**Used By**: GoalsService (goal achieved), PomodoroService (timer complete)

#### 3. CategoriesService

**File**: `src/main/services/categories/CategoriesService.ts`

**Responsibilities**:
- Category CRUD operations
- Default category initialization (first run)
- Category validation

**Default Categories**:
- Work, Personal, Meeting, Break, Learning, Entertainment, Health, Other

#### 4. ActivityValidationService

**File**: `src/main/services/activity/ActivityValidationService.ts`

**Responsibilities**:
- Validate activity data for consistency
- Check for overlaps and gaps
- Detect invalid durations
- Quality scoring

#### 5. ActivityMergeService

**File**: `src/main/services/activity/ActivityMergeService.ts`

**Responsibilities**:
- Merge duplicate activities
- Deduplicate based on similarity
- Handle conflicting time ranges

**Depends On**: ActivityValidationService (for validation before merge)

#### 6. GoalsService

**File**: `src/main/services/goals/GoalsService.ts`

**Responsibilities**:
- Goal CRUD operations
- Progress calculation
- Achievement detection
- Notification triggers

**Features**:
- Daily/weekly goals
- Category-based goals
- Progress tracking
- Achievement history

#### 7. ActivityTrackingService

**File**: `src/main/services/activity/ActivityTrackingService.ts`

**Responsibilities**:
- Automatic activity tracking
- Cross-platform activity detection (macOS, Windows, Linux)
- Idle detection
- Session management

**Features**:
- Configurable tracking interval (default: 20s)
- Idle threshold (default: 3 minutes)
- Blacklist for apps/domains
- Auto-start on app launch (configurable)

#### 8. PomodoroService

**File**: `src/main/services/pomodoro/PomodoroService.ts`

**Responsibilities**:
- Pomodoro timer management
- Session tracking (work, short break, long break)
- Statistics calculation
- Timer notifications

**Features**:
- Customizable durations (work: 25min, break: 5min)
- Auto-start breaks/work sessions
- Session history
- Daily goal tracking

### Service Getters

All services are accessed via ServiceContainer getters:

```typescript
const dbManager = serviceContainer.getDatabaseManager();
const notificationService = serviceContainer.getNotificationService();
const goalsService = serviceContainer.getGoalsService();
const categoriesService = serviceContainer.getCategoriesService();
const activityValidationService = serviceContainer.getActivityValidationService();
const activityMergeService = serviceContainer.getActivityMergeService();
const activityTracker = serviceContainer.getActivityTrackingService();
const pomodoroService = serviceContainer.getPomodoroService();
```

**Note**: All getters return `null` if the container is not initialized.

---

## Database Layer

### SQLite with better-sqlite3

Lume uses SQLite for local storage with the `better-sqlite3` driver (synchronous, fast).

**Database File**: `<userData>/lume.db`
- macOS: `~/Library/Application Support/Electron/lume.db`
- Windows: `%APPDATA%/Electron/lume.db`
- Linux: `~/.config/Electron/lume.db`

### Schema (14 Tables)

| Table | Description |
|-------|-------------|
| `migrations` | Schema version tracking |
| `time_entries` | Manual time entries |
| `app_usage` | Application usage logs |
| `categories` | Activity categories |
| `tags` | User-defined tags |
| `app_category_mappings` | App → Category mappings |
| `domain_category_mappings` | Domain → Category mappings |
| `time_entry_tags` | TimeEntry ↔ Tag associations |
| `app_usage_tags` | AppUsage ↔ Tag associations |
| `productivity_goals` | Goals configuration |
| `goal_progress` | Daily goal progress |
| `productivity_goal_tags` | Goal ↔ Tag associations |
| `pomodoro_settings` | Pomodoro configuration |
| `pomodoro_sessions` | Pomodoro session history |

### Repository Pattern

Each entity has a dedicated repository:

```typescript
// Example: TimeEntryRepository
class DatabaseManager {
  addTimeEntry(entry: TimeEntry): number {
    const stmt = this.db.prepare(`
      INSERT INTO time_entries (start_time, end_time, description, category_id, tags)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      entry.startTime,
      entry.endTime,
      entry.description,
      entry.categoryId,
      JSON.stringify(entry.tags || [])
    );

    return result.lastInsertRowid as number;
  }

  getAllTimeEntries(): TimeEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM time_entries
      ORDER BY start_time DESC
    `);

    return stmt.all() as TimeEntry[];
  }

  // ... more methods
}
```

### Analytics Queries

Complex analytics are encapsulated in analytics modules:

```typescript
// ActivityAnalytics
getDailyProductivityStats(startDate: string, endDate: string): DailyStats[] {
  const stmt = this.db.prepare(`
    SELECT
      DATE(start_time) as date,
      COUNT(*) as activity_count,
      SUM(duration_seconds) as total_seconds,
      c.name as category_name
    FROM app_usage au
    LEFT JOIN categories c ON au.category_id = c.id
    WHERE DATE(start_time) BETWEEN ? AND ?
    GROUP BY DATE(start_time), c.name
    ORDER BY date DESC
  `);

  return stmt.all(startDate, endDate) as DailyStats[];
}
```

### Migrations

Schema changes are managed via numbered migrations:

```typescript
// Migration 001: Initial schema
const migrations = [
  {
    version: 1,
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS time_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          description TEXT,
          category_id INTEGER,
          tags TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  },
  // Migration 002, 003, etc.
];
```

### Transactions

Database operations use transactions for consistency:

```typescript
mergeActivities(activityIds: number[]): void {
  const transaction = this.db.transaction(() => {
    // 1. Get activities
    const activities = activityIds.map(id => this.getActivity(id));

    // 2. Calculate merged activity
    const merged = this.calculateMerged(activities);

    // 3. Insert merged activity
    const mergedId = this.addActivity(merged);

    // 4. Delete original activities
    activityIds.forEach(id => this.deleteActivity(id));

    return mergedId;
  });

  transaction();
}
```

---

## Refactoring Journey

Lume underwent a **5-phase refactoring** over 5 weeks to improve code quality and maintainability.

### Phase 1: Proof of Concept (Week 1)

**Goal**: Validate the IPCRouter pattern

**Changes**:
- Extracted `PomodoroTimerHandlers` as proof of concept
- Created `IPCRouter` and `IIPCHandlerGroup` interface
- Moved ~50 lines from main.ts

**Result**: ✅ Pattern validated, ready for Phase 2

### Phase 2: IPC Handlers (Week 2)

**Goal**: Extract all IPC handlers into groups

**Changes**:
- Created 20 handler groups in 4 batches
- Batch 1: Simple CRUD (5 handlers)
- Batch 2: Service-based (5 handlers)
- Batch 3: Complex queries (5 handlers)
- Batch 4: Data quality (5 handlers)
- Moved ~600 lines from main.ts

**Result**: ✅ main.ts reduced by 28%, all handlers organized

### Phase 3: Service Container (Week 3)

**Goal**: Centralize service lifecycle management

**Changes**:
- Created `ServiceContainer` class
- Implemented dependency injection for 8 services
- Defined initialization order based on dependency graph
- Wrote 32 unit tests
- Moved ~300 lines from main.ts

**Result**: ✅ main.ts reduced by 47%, services testable

### Phase 4: Preload API Refactoring (Week 4)

**Goal**: Organize 91 flat methods into logical namespaces

**Changes**:
- Defined 18 namespace interfaces
- Created helper functions for each namespace
- Built hybrid API (namespaced + flat for backward compatibility)
- Exposed via `contextBridge`
- ~350 lines organized in preload.ts

**Result**: ✅ Better discoverability, type-safe, ready for component migration

### Phase 5: Documentation & Cleanup (Week 5)

**Goal**: Complete documentation and remove deprecated code

**Changes**:
- Added JSDoc to 36+ public APIs (5 managers + ServiceContainer)
- Created 6 Mermaid diagrams
- Wrote ARCHITECTURE.md (2000+ lines)
- Updated CONTRIBUTING.md
- Verified no deprecated API usage

**Result**: ✅ Comprehensive documentation for future development

### Before & After Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| main.ts lines | 2106 | ~220 | 90% reduction |
| IPC handlers in main.ts | 91 inline | 0 (20 groups) | 100% extracted |
| Service initialization | Inline | ServiceContainer | Testable |
| Preload API | 91 flat methods | 18 namespaces | Organized |
| Documentation | Minimal | Comprehensive | Professional |
| Test coverage | Limited | 32 unit tests | Phase 3+ |

---

## Testing Strategy

### Unit Tests

**Framework**: Jest + TypeScript

**Example**: ServiceContainer tests

```typescript
// ServiceContainer.test.ts
describe('ServiceContainer', () => {
  let container: ServiceContainer;
  let testUserDataPath: string;
  let testSettings: Settings;

  beforeEach(async () => {
    testUserDataPath = path.join(os.tmpdir(), 'lume-test-' + Date.now());
    await fs.mkdir(testUserDataPath, { recursive: true });

    testSettings = {
      autoTrackApps: true,
      showNotifications: true,
      minimizeToTray: false,
      autoStartOnLogin: false,
      autoStartTracking: false,
      defaultCategory: null,
    };

    container = new ServiceContainer();
  });

  afterEach(async () => {
    if (container.isInitialized()) {
      await container.cleanup();
    }
    await fs.rm(testUserDataPath, { recursive: true, force: true });
  });

  it('should initialize all services in correct order', async () => {
    await container.initialize(testUserDataPath, testSettings);

    expect(container.getDatabaseManager()).not.toBeNull();
    expect(container.getNotificationService()).not.toBeNull();
    expect(container.getCategoriesService()).not.toBeNull();
    expect(container.getActivityValidationService()).not.toBeNull();
    expect(container.getActivityMergeService()).not.toBeNull();
    expect(container.getGoalsService()).not.toBeNull();
    expect(container.getActivityTrackingService()).not.toBeNull();
    expect(container.getPomodoroService()).not.toBeNull();
  });

  it('should prevent multiple initializations', async () => {
    await container.initialize(testUserDataPath, testSettings);
    await container.initialize(testUserDataPath, testSettings); // Should warn

    expect(container.isInitialized()).toBe(true);
  });

  it('should cleanup all services', async () => {
    await container.initialize(testUserDataPath, testSettings);
    await container.cleanup();

    expect(container.getDatabaseManager()).toBeNull();
    expect(container.isInitialized()).toBe(false);
  });
});
```

### Component Tests

**Framework**: React Testing Library

```typescript
// Categories.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Categories from './Categories';

// Mock electronAPI
const mockElectronAPI = {
  categories: {
    getAll: jest.fn().mockResolvedValue([
      { id: 1, name: 'Work', color: '#FF0000' },
      { id: 2, name: 'Personal', color: '#00FF00' },
    ]),
    add: jest.fn().mockResolvedValue(3),
  },
};

(window as any).electronAPI = mockElectronAPI;

describe('Categories', () => {
  it('should display categories from API', async () => {
    render(<Categories />);

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    expect(mockElectronAPI.categories.getAll).toHaveBeenCalledTimes(1);
  });

  it('should add a new category', async () => {
    render(<Categories />);

    const input = screen.getByPlaceholderText('Category name');
    const button = screen.getByText('Add Category');

    await userEvent.type(input, 'Meeting');
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockElectronAPI.categories.add).toHaveBeenCalledWith({
        name: 'Meeting',
        color: expect.any(String),
      });
    });
  });
});
```

### Integration Tests

Integration tests verify main process + database:

```typescript
// ActivityTracking.integration.test.ts
describe('Activity Tracking Integration', () => {
  let container: ServiceContainer;
  let tracker: ActivityTrackingService;

  beforeEach(async () => {
    container = new ServiceContainer();
    await container.initialize(testUserDataPath, testSettings);
    tracker = container.getActivityTrackingService()!;
  });

  it('should track activity and save to database', async () => {
    await tracker.start();

    // Simulate activity
    await new Promise(resolve => setTimeout(resolve, 2000));

    await tracker.stop();

    // Verify database entry
    const db = container.getDatabaseManager()!;
    const activities = db.getAllAppUsage();

    expect(activities.length).toBeGreaterThan(0);
  });
});
```

### Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test ServiceContainer.test.ts
```

---

## Build & Deployment

### Development

```bash
# Install dependencies
npm install

# Start dev server (Vite + Electron)
npm run dev

# Build TypeScript (main process)
npm run build:electron

# Build React (renderer process)
npm run build:react
```

### Production Build

```bash
# Build all
npm run build

# Package for current platform
npm run package

# Package for specific platforms
npm run package:mac
npm run package:win
npm run package:linux
```

### electron-builder Configuration

**File**: `electron-builder.yml`

```yaml
appId: com.lume.app
productName: Lume
directories:
  output: release

files:
  - dist/**/*
  - node_modules/**/*
  - package.json

mac:
  target:
    - dmg
    - zip
  icon: assets/icon.icns
  category: public.app-category.productivity
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: entitlements.mac.plist

win:
  target:
    - nsis
    - portable
  icon: assets/icon.ico

linux:
  target:
    - AppImage
    - deb
  icon: assets/icon.png
  category: Utility
```

### Release Process

1. **Version Bump**: Update `package.json` version
2. **Build**: `npm run build`
3. **Test**: Manual testing on target platforms
4. **Package**: `npm run package`
5. **Release**: Upload to GitHub Releases or distribution platform

### CI/CD

**GitHub Actions**: Automated builds on push

```yaml
# .github/workflows/build.yml
name: Build & Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm run build
      - run: npm run package

      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: release/*
```

---

## Appendix

### File Structure

```
lume/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # Entry point (~220 lines)
│   │   ├── preload.ts           # Context bridge (~820 lines)
│   │   ├── utils.ts             # Utility functions
│   │   ├── core/                # Core managers (5 managers)
│   │   │   ├── WindowManager.ts
│   │   │   ├── TrayManager.ts
│   │   │   ├── SettingsManager.ts
│   │   │   ├── AppLifecycleManager.ts
│   │   │   └── AutoLaunchManager.ts
│   │   ├── services/            # Service container (8 services)
│   │   │   ├── ServiceContainer.ts
│   │   │   ├── activity/
│   │   │   ├── pomodoro/
│   │   │   ├── goals/
│   │   │   ├── categories/
│   │   │   └── notifications/
│   │   ├── ipc/                 # IPC layer
│   │   │   ├── IPCRouter.ts
│   │   │   ├── types.ts
│   │   │   └── handlers/        # 20 handler groups
│   │   └── database/            # Database layer
│   │       ├── DatabaseManager.ts
│   │       ├── repositories/
│   │       └── analytics/
│   ├── renderer/                # React renderer process
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── i18n/
│   ├── types/                   # Shared TypeScript types
│   └── public/                  # Static assets
├── tests/                       # Test files
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # This file
│   ├── diagrams.md              # Mermaid diagrams
│   ├── PHASE4_PROGRESS.md       # Phase 4 details
│   └── PHASE4_SUMMARY.md        # Phase 4 summary
├── dist/                        # Compiled output
├── release/                     # Packaged builds
├── package.json
├── tsconfig.json
├── tsconfig.electron.json
├── vite.config.ts
└── electron-builder.yml
```

### Key Dependencies

```json
{
  "dependencies": {
    "better-sqlite3": "^9.x",
    "electron": "^29.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "react-i18next": "^13.x",
    "recharts": "^2.x"
  },
  "devDependencies": {
    "@types/react": "^18.x",
    "@types/node": "^20.x",
    "typescript": "^5.x",
    "vite": "^6.x",
    "electron-builder": "^24.x",
    "jest": "^29.x",
    "@testing-library/react": "^14.x"
  }
}
```

### Performance Considerations

**Main Process**:
- Synchronous database operations (better-sqlite3)
- Service initialization on app startup (~200ms)
- Lazy-loaded services where possible

**Renderer Process**:
- Code splitting with React lazy loading
- Memoization for expensive computations
- Virtual scrolling for large lists

**IPC Communication**:
- Batched requests where possible
- Optimistic UI updates
- Background data refresh

### Security Checklist

- [x] Context isolation enabled
- [x] Node integration disabled in renderer
- [x] Preload script with contextBridge
- [x] IPC input validation
- [x] Sensitive data (passwords, tokens) not stored
- [x] Optional Sentry error tracking with PII filtering
- [x] Regular dependency updates

---

## Conclusion

Lume's architecture has evolved through **5 phases of refactoring**, resulting in a clean, maintainable, and well-documented codebase. The separation of concerns, dependency injection, and namespaced API provide a solid foundation for future development.

### Key Achievements

✅ **90% reduction** in main.ts size (2106 → 220 lines)
✅ **20 handler groups** for organized IPC communication
✅ **8 services** with dependency injection
✅ **18 namespaced APIs** for better discoverability
✅ **Comprehensive documentation** (JSDoc + diagrams + this file)

### Next Steps

- Migrate remaining components to namespaced API
- Expand test coverage beyond Phase 3
- Consider TypeScript strict mode for renderer
- Add E2E tests with Playwright/Spectron
- Document renderer architecture in detail

---

**Contributors**: Lume Development Team
**License**: MIT
**Repository**: https://github.com/osama1998H/lume

For questions or contributions, see [CONTRIBUTING.md](../CONTRIBUTING.md).
