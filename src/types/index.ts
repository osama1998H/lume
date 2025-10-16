// Re-export all types from domain-specific files
// This maintains backward compatibility with existing imports

// Activity types (existing activity tracking)
export * from './activity';

// Unified Activity types (TimeEntry, AppUsage, UnifiedActivity)
export * from './unified-activity';

// Pomodoro types
export * from './pomodoro';

// Goals types
export * from './goals';

// Todos types
export * from './todos';

// Categories and Tags types
export * from './categories';

// Timeline types
export * from './timeline';

// Analytics types
export * from './analytics';

// Data Management types
export * from './data-management';

// Validation types
export * from './validation';

// MCP Configuration types
export * from './mcp';

// Electron API types
export * from './electron-api';
