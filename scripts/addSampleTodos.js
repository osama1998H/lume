const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Get the database path
const dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'Lume', 'lume.db');
console.log('Database path:', dbPath);

// Connect to the database
const db = new Database(dbPath);

// Sample todos data
const sampleTodos = [
  {
    title: 'Implement test cases',
    description: 'Write comprehensive unit tests for the new authentication module',
    status: 'in_progress',
    priority: 'medium',
    categoryId: 1,
    estimatedMinutes: 50,
    pomodoroCount: 2,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
    tags: JSON.stringify(['testing', 'backend', 'auth'])
  },
  {
    title: 'Review pull requests',
    description: 'Check and approve pending PRs from the team',
    status: 'todo',
    priority: 'high',
    categoryId: 1,
    estimatedMinutes: 30,
    pomodoroCount: 1,
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    tags: JSON.stringify(['code-review', 'team'])
  },
  {
    title: 'Fix navigation bug',
    description: 'Users report navigation menu not working on mobile devices',
    status: 'todo',
    priority: 'urgent',
    categoryId: 1,
    estimatedMinutes: 120,
    pomodoroCount: 5,
    dueDate: new Date().toISOString().split('T')[0], // Today
    tags: JSON.stringify(['bug', 'mobile', 'ui'])
  },
  {
    title: 'Update documentation',
    description: 'Add API endpoints documentation for new features',
    status: 'todo',
    priority: 'low',
    categoryId: 2,
    estimatedMinutes: 90,
    pomodoroCount: 3,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
    tags: JSON.stringify(['documentation', 'api'])
  },
  {
    title: 'Optimize database queries',
    description: 'Improve performance of slow queries identified in monitoring',
    status: 'in_progress',
    priority: 'high',
    categoryId: 1,
    estimatedMinutes: 180,
    pomodoroCount: 7,
    actualMinutes: 60,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
    tags: JSON.stringify(['performance', 'database', 'backend'])
  },
  {
    title: 'Design new dashboard',
    description: 'Create mockups for the analytics dashboard redesign',
    status: 'todo',
    priority: 'medium',
    categoryId: 3,
    estimatedMinutes: 240,
    pomodoroCount: 10,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
    tags: JSON.stringify(['design', 'ui/ux', 'dashboard'])
  },
  {
    title: 'Set up CI/CD pipeline',
    description: 'Configure automated testing and deployment workflows',
    status: 'completed',
    priority: 'high',
    categoryId: 1,
    estimatedMinutes: 120,
    pomodoroCount: 5,
    actualMinutes: 110,
    completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Completed yesterday
    tags: JSON.stringify(['devops', 'automation', 'ci/cd'])
  },
  {
    title: 'Conduct user interviews',
    description: 'Interview 5 users for feedback on new features',
    status: 'todo',
    priority: 'medium',
    categoryId: 4,
    estimatedMinutes: 150,
    pomodoroCount: 6,
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 days from now
    tags: JSON.stringify(['research', 'user-feedback', 'product'])
  },
  {
    title: 'Refactor authentication module',
    description: 'Clean up and optimize the auth code for better maintainability',
    status: 'in_progress',
    priority: 'medium',
    categoryId: 1,
    estimatedMinutes: 200,
    pomodoroCount: 8,
    actualMinutes: 90,
    dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 days from now
    tags: JSON.stringify(['refactoring', 'auth', 'backend'])
  },
  {
    title: 'Prepare quarterly report',
    description: 'Compile metrics and achievements for Q4 presentation',
    status: 'todo',
    priority: 'low',
    categoryId: 4,
    estimatedMinutes: 120,
    pomodoroCount: 5,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
    tags: JSON.stringify(['reporting', 'management', 'metrics'])
  }
];

// First, let's check if categories exist, if not create some
const checkAndCreateCategories = () => {
  const categories = db.prepare('SELECT * FROM categories').all();

  if (categories.length === 0) {
    console.log('Creating sample categories...');
    const sampleCategories = [
      { name: 'Development', color: '#3B82F6' },
      { name: 'Documentation', color: '#10B981' },
      { name: 'Design', color: '#8B5CF6' },
      { name: 'Management', color: '#F59E0B' }
    ];

    const insertCategory = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
    for (const category of sampleCategories) {
      insertCategory.run(category.name, category.color);
    }
    console.log('Created', sampleCategories.length, 'categories');
  } else {
    console.log('Categories already exist:', categories.length);
  }
};

// Create categories if needed
checkAndCreateCategories();

// Insert todos
try {
  const insertTodo = db.prepare(`
    INSERT INTO todos (
      title, description, status, priority, categoryId,
      estimatedMinutes, pomodoroCount, actualMinutes,
      dueDate, completedAt, tags, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
    )
  `);

  let insertedCount = 0;
  for (const todo of sampleTodos) {
    try {
      insertTodo.run(
        todo.title,
        todo.description,
        todo.status,
        todo.priority,
        todo.categoryId || null,
        todo.estimatedMinutes || null,
        todo.pomodoroCount || null,
        todo.actualMinutes || null,
        todo.dueDate || null,
        todo.completedAt || null,
        todo.tags || null
      );
      insertedCount++;
      console.log(`✓ Added todo: "${todo.title}"`);
    } catch (error) {
      console.error(`Failed to insert todo "${todo.title}":`, error.message);
    }
  }

  console.log(`\n✅ Successfully added ${insertedCount} sample todos to the database!`);

  // Show current todo count
  const todoCount = db.prepare('SELECT COUNT(*) as count FROM todos').get();
  console.log(`📊 Total todos in database: ${todoCount.count}`);

} catch (error) {
  console.error('Error adding sample todos:', error);
} finally {
  db.close();
}