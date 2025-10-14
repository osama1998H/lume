# Lume Architecture Diagrams

This document contains all architecture diagrams for the Lume application, rendered using Mermaid syntax.

---

## 1. Service Dependency Graph

Shows the dependency relationships between the 8 services in the ServiceContainer.

```mermaid
graph TB
    %% Root dependency
    DB[DatabaseManager<br/>SQLite + Repositories]

    %% Services depending on DB
    DB --> CS[CategoriesService<br/>Category Management]
    DB --> AVS[ActivityValidationService<br/>Data Quality Checks]
    DB --> GS[GoalsService<br/>Productivity Goals]
    DB --> ATS[ActivityTrackingService<br/>Auto Tracking]
    DB --> PS[PomodoroService<br/>Focus Timer]

    %% Services depending on Settings
    Settings[Application Settings] --> NS[NotificationService<br/>System Notifications]
    Settings --> PS

    %% Complex dependencies
    AVS --> AMS[ActivityMergeService<br/>Deduplication]
    DB --> AMS

    NS --> GS
    NS --> PS

    GS --> ATS

    %% Styling
    classDef root fill:#e1f5ff,stroke:#01579b,stroke-width:3px
    classDef service fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef settings fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class DB root
    class CS,AVS,AMS,GS,ATS,PS service
    class Settings,NS settings
```

**Initialization Order**:
1. DatabaseManager (root)
2. NotificationService (settings)
3. CategoriesService (DB)
4. ActivityValidationService (DB)
5. ActivityMergeService (DB + validation)
6. GoalsService (DB + notifications)
7. ActivityTrackingService (DB + goals)
8. PomodoroService (DB + notifications)

---

## 2. IPC Architecture Flow

Shows the complete request/response flow from renderer to main process.

```mermaid
sequenceDiagram
    participant R as Renderer Process<br/>(React UI)
    participant P as Preload Script<br/>(Context Bridge)
    participant IPC as IPC Channel<br/>(Electron)
    participant Router as IPCRouter<br/>(Handler Registration)
    participant H as Handler Group<br/>(e.g., CategoriesHandlers)
    participant S as Service<br/>(e.g., CategoriesService)
    participant DB as DatabaseManager<br/>(SQLite)

    %% Request flow
    R->>P: window.electronAPI.categories.getAll()
    Note over P: Namespaced API<br/>(Phase 4 Refactoring)

    P->>IPC: ipcRenderer.invoke('get-categories')
    Note over IPC: Secure IPC<br/>via contextBridge

    IPC->>Router: Route to handler
    Note over Router: 20 handler groups<br/>registered

    Router->>H: CategoriesHandlers.handle()
    Note over H: Extract from context<br/>Validate params

    H->>S: categoriesService.getAll()
    Note over S: Business logic<br/>Dependency injection

    S->>DB: SELECT * FROM categories
    Note over DB: Repository pattern<br/>SQLite queries

    %% Response flow
    DB-->>S: Category[]
    S-->>H: Category[]
    H-->>Router: Category[]
    Router-->>IPC: Category[]
    IPC-->>P: Category[]
    P-->>R: Category[]

    Note over R: Update UI state<br/>Render categories
```

**Key Points**:
- **Renderer**: Type-safe API via TypeScript interfaces
- **Preload**: Exposes limited, secure API to renderer
- **IPC**: Electron's inter-process communication
- **Router**: Centralizes handler registration (Phase 2)
- **Handlers**: 20 groups organized by feature (Phase 2)
- **Services**: Business logic with dependency injection (Phase 3)
- **Database**: Persistent storage via SQLite

---

## 3. Main Process Architecture

Shows the high-level structure of the main process.

```mermaid
graph TB
    %% Entry point
    Main[main.ts<br/>LumeApp Class<br/>~220 lines]

    %% Core Managers
    subgraph Core Managers
        WM[WindowManager<br/>Window Lifecycle]
        TM[TrayManager<br/>System Tray]
        SM[SettingsManager<br/>Persistent Config]
        AL[AppLifecycleManager<br/>Electron Events]
        AU[AutoLaunchManager<br/>Startup Config]
    end

    %% Service Container
    subgraph Service Container
        SC[ServiceContainer<br/>Dependency Injection]
        SC --> S1[DatabaseManager]
        SC --> S2[NotificationService]
        SC --> S3[CategoriesService]
        SC --> S4[ActivityValidationService]
        SC --> S5[ActivityMergeService]
        SC --> S6[GoalsService]
        SC --> S7[ActivityTrackingService]
        SC --> S8[PomodoroService]
    end

    %% IPC Layer
    subgraph IPC Layer
        Router[IPCRouter<br/>Handler Registration]
        Router --> H1[20 Handler Groups]
        H1 --> H2[TimeEntryHandlers]
        H1 --> H3[CategoriesHandlers]
        H1 --> H4[GoalsHandlers]
        H1 --> H5[...16 more]
    end

    %% Connections
    Main --> WM
    Main --> TM
    Main --> SM
    Main --> AL
    Main --> AU
    Main --> SC
    Main --> Router

    SC -.provides services.-> Router
    SM -.provides settings.-> WM
    SM -.provides settings.-> TM
    SM -.provides settings.-> AU
    WM -.window ref.-> TM
    SC -.tracker ref.-> TM

    %% Styling
    classDef entry fill:#ffcdd2,stroke:#c62828,stroke-width:3px
    classDef manager fill:#c5e1a5,stroke:#558b2f,stroke-width:2px
    classDef container fill:#b3e5fc,stroke:#0277bd,stroke-width:2px
    classDef ipc fill:#f8bbd0,stroke:#c2185b,stroke-width:2px

    class Main entry
    class WM,TM,SM,AL,AU manager
    class SC,S1,S2,S3,S4,S5,S6,S7,S8 container
    class Router,H1,H2,H3,H4,H5 ipc
```

**Responsibilities**:
- **LumeApp**: Orchestrates initialization, minimal logic
- **Core Managers**: Window, tray, settings, lifecycle, auto-start
- **ServiceContainer**: Manages 8 services with DI (Phase 3)
- **IPC Layer**: Routes renderer requests to handlers (Phase 2)

---

## 4. Refactoring Journey Timeline

Shows the 5-phase refactoring process over 5 weeks.

```mermaid
timeline
    title Lume Refactoring Journey (5 Weeks)

    section Week 1: Phase 1
        POC : PomodoroTimerHandlers
            : Extracted 1 handler as proof of concept
            : Validated IPCRouter pattern
            : ~50 lines moved from main.ts

    section Week 2: Phase 2
        IPC Handlers : 20 handler groups in 4 batches
            : Batch 1 - Simple CRUD (5 handlers)
            : Batch 2 - Service-based (5 handlers)
            : Batch 3 - Complex queries (5 handlers)
            : Batch 4 - Data quality (5 handlers)
            : ~600 lines moved from main.ts

    section Week 3: Phase 3
        Service Container : 8 services with DI
            : DatabaseManager (root)
            : 7 specialized services
            : Dependency injection pattern
            : 32 unit tests written
            : ~300 lines refactored

    section Week 4: Phase 4
        Preload API : Namespaced API structure
            : 91 flat methods → 18 namespaces
            : Hybrid API (backward compatible)
            : Context bridge security
            : TypeScript interfaces
            : ~350 lines organized

    section Week 5: Phase 5
        Documentation : Cleanup & docs
            : JSDoc for 36+ public APIs
            : ARCHITECTURE.md (2000+ lines)
            : Mermaid diagrams (4 diagrams)
            : Updated CONTRIBUTING.md
            : Removed deprecated code
```

**Results**:
- **Before**: main.ts = 2106 lines
- **After**: main.ts = ~220 lines
- **Reduction**: ~90% smaller main file
- **Benefits**: Better testability, maintainability, discoverability

---

## 5. Component Architecture (Renderer Process)

Shows how React components interact with the Electron API.

```mermaid
graph LR
    %% UI Components
    subgraph React Components
        D[Dashboard]
        S[Settings]
        T[Timeline]
        A[Analytics]
        G[Goals]
        C[Categories]
    end

    %% Preload API
    subgraph Preload API
        API[window.electronAPI<br/>18 Namespaces]

        subgraph Namespaces
            N1[categories.*]
            N2[goals.*]
            N3[settings.*]
            N4[activities.*]
            N5[pomodoro.*]
            N6[analytics.*]
        end
    end

    %% Connections
    C --> N1
    G --> N2
    S --> N3
    T --> N4
    D --> N5
    A --> N6

    N1 --> API
    N2 --> API
    N3 --> API
    N4 --> API
    N5 --> API
    N6 --> API

    API -.IPC.-> Main[Main Process<br/>Handlers + Services]

    %% Styling
    classDef component fill:#e1bee7,stroke:#6a1b9a,stroke-width:2px
    classDef api fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef main fill:#b2dfdb,stroke:#00695c,stroke-width:2px

    class D,S,T,A,G,C component
    class API,N1,N2,N3,N4,N5,N6 api
    class Main main
```

**Migration Path** (Phase 4):
- Old: `window.electronAPI.getCategories()` ❌
- New: `window.electronAPI.categories.getAll()` ✅

---

## 6. Database Layer Architecture

Shows the repository pattern and database organization.

```mermaid
graph TB
    %% Services layer
    subgraph Services
        ATS[ActivityTrackingService]
        GS[GoalsService]
        PS[PomodoroService]
        CS[CategoriesService]
    end

    %% Database Manager
    DM[DatabaseManager<br/>SQLite Connection<br/>Migration System]

    %% Repositories
    subgraph Repositories
        TR[TimeEntryRepository]
        AR[AppUsageRepository]
        GR[GoalsRepository]
        PR[PomodoroRepository]
        CR[CategoryRepository]
    end

    %% SQLite Database
    DB[(lume.db<br/>SQLite Database<br/>14 Tables)]

    %% Analytics Layer
    subgraph Analytics
        AA[ActivityAnalytics]
        GA[GoalAnalytics]
        PA[PomodoroAnalytics]
    end

    %% Connections
    ATS --> DM
    GS --> DM
    PS --> DM
    CS --> DM

    DM --> TR
    DM --> AR
    DM --> GR
    DM --> PR
    DM --> CR

    TR --> DB
    AR --> DB
    GR --> DB
    PR --> DB
    CR --> DB

    DM --> AA
    DM --> GA
    DM --> PA

    AA --> DB
    GA --> DB
    PA --> DB

    %% Styling
    classDef service fill:#ffe0b2,stroke:#e65100,stroke-width:2px
    classDef manager fill:#b3e5fc,stroke:#01579b,stroke-width:3px
    classDef repo fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    classDef db fill:#f8bbd0,stroke:#c2185b,stroke-width:3px
    classDef analytics fill:#d1c4e9,stroke:#4527a0,stroke-width:2px

    class ATS,GS,PS,CS service
    class DM manager
    class TR,AR,GR,PR,CR repo
    class DB db
    class AA,GA,PA analytics
```

**Features**:
- **Repositories**: CRUD operations, type-safe queries
- **Analytics**: Complex aggregations and statistics
- **Migrations**: Versioned schema updates
- **Transactions**: ACID guarantees via better-sqlite3

---

## Legend

```mermaid
graph LR
    A[Component] --> B[Dependency]
    C[Component] -.provides.-> D[Reference]

    classDef default fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

- **Solid arrows** (→): Direct dependencies
- **Dotted arrows** (⇢): Provides reference or data
- **Subgraphs**: Logical grouping of related components

---

**Last Updated**: 2025-10-14
**Generated for**: Lume v2.5.4
**Related**: See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation
