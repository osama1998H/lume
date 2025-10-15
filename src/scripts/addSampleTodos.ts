// This script can be run through the Electron console to add sample todos
const addSampleTodos = async () => {
  if (!window.electronAPI) {
    console.error('This script must be run in the Electron app');
    return;
  }

  const sampleTodos = [
    {
      title: 'Implement test cases',
      description: 'Write comprehensive unit tests for the new authentication module',
      status: 'in_progress' as const,
      priority: 'medium' as const,
      categoryId: 1,
      estimatedMinutes: 50,
      pomodoroCount: 2,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
      tags: [
        { name: 'testing', color: '#3B82F6' },
        { name: 'backend', color: '#10B981' },
        { name: 'auth', color: '#8B5CF6' }
      ]
    },
    {
      title: 'Review pull requests',
      description: 'Check and approve pending PRs from the team',
      status: 'todo' as const,
      priority: 'high' as const,
      categoryId: 1,
      estimatedMinutes: 30,
      pomodoroCount: 1,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
      tags: [
        { name: 'code-review', color: '#F59E0B' },
        { name: 'team', color: '#EC4899' }
      ]
    },
    {
      title: 'Fix navigation bug',
      description: 'Users report navigation menu not working on mobile devices',
      status: 'todo' as const,
      priority: 'urgent' as const,
      categoryId: 1,
      estimatedMinutes: 120,
      pomodoroCount: 5,
      dueDate: new Date().toISOString().split('T')[0], // Today
      tags: [
        { name: 'bug', color: '#EF4444' },
        { name: 'mobile', color: '#06B6D4' },
        { name: 'ui', color: '#8B5CF6' }
      ]
    },
    {
      title: 'Update documentation',
      description: 'Add API endpoints documentation for new features',
      status: 'todo' as const,
      priority: 'low' as const,
      categoryId: 2,
      estimatedMinutes: 90,
      pomodoroCount: 3,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
      tags: [
        { name: 'documentation', color: '#10B981' },
        { name: 'api', color: '#3B82F6' }
      ]
    },
    {
      title: 'Optimize database queries',
      description: 'Improve performance of slow queries identified in monitoring',
      status: 'in_progress' as const,
      priority: 'high' as const,
      categoryId: 1,
      estimatedMinutes: 180,
      pomodoroCount: 7,
      actualMinutes: 60,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
      tags: [
        { name: 'performance', color: '#F59E0B' },
        { name: 'database', color: '#10B981' },
        { name: 'backend', color: '#3B82F6' }
      ]
    },
    {
      title: 'Design new dashboard',
      description: 'Create mockups for the analytics dashboard redesign',
      status: 'todo' as const,
      priority: 'medium' as const,
      categoryId: 3,
      estimatedMinutes: 240,
      pomodoroCount: 10,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
      tags: [
        { name: 'design', color: '#8B5CF6' },
        { name: 'ui/ux', color: '#EC4899' },
        { name: 'dashboard', color: '#06B6D4' }
      ]
    },
    {
      title: 'Set up CI/CD pipeline',
      description: 'Configure automated testing and deployment workflows',
      status: 'completed' as const,
      priority: 'high' as const,
      categoryId: 1,
      estimatedMinutes: 120,
      pomodoroCount: 5,
      actualMinutes: 110,
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Completed yesterday
      tags: [
        { name: 'devops', color: '#6366F1' },
        { name: 'automation', color: '#10B981' },
        { name: 'ci/cd', color: '#F59E0B' }
      ]
    },
    {
      title: 'Conduct user interviews',
      description: 'Interview 5 users for feedback on new features',
      status: 'todo' as const,
      priority: 'medium' as const,
      categoryId: 4,
      estimatedMinutes: 150,
      pomodoroCount: 6,
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 days from now
      tags: [
        { name: 'research', color: '#8B5CF6' },
        { name: 'user-feedback', color: '#EC4899' },
        { name: 'product', color: '#06B6D4' }
      ]
    },
    {
      title: 'Refactor authentication module',
      description: 'Clean up and optimize the auth code for better maintainability',
      status: 'in_progress' as const,
      priority: 'medium' as const,
      categoryId: 1,
      estimatedMinutes: 200,
      pomodoroCount: 8,
      actualMinutes: 90,
      dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 days from now
      tags: [
        { name: 'refactoring', color: '#6366F1' },
        { name: 'auth', color: '#3B82F6' },
        { name: 'backend', color: '#10B981' }
      ]
    },
    {
      title: 'Prepare quarterly report',
      description: 'Compile metrics and achievements for Q4 presentation',
      status: 'todo' as const,
      priority: 'low' as const,
      categoryId: 4,
      estimatedMinutes: 120,
      pomodoroCount: 5,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
      tags: [
        { name: 'reporting', color: '#F59E0B' },
        { name: 'management', color: '#EF4444' },
        { name: 'metrics', color: '#10B981' }
      ]
    }
  ];

  // First check/create categories
  const categories = await window.electronAPI.categories.getAll();
  if (categories.length === 0) {
    console.log('Creating sample categories...');
    const sampleCategories = [
      { name: 'Development', color: '#3B82F6' },
      { name: 'Documentation', color: '#10B981' },
      { name: 'Design', color: '#8B5CF6' },
      { name: 'Management', color: '#F59E0B' }
    ];

    for (const category of sampleCategories) {
      await window.electronAPI.categories.create(category);
    }
    console.log('Created', sampleCategories.length, 'categories');
  }

  // Add todos
  let addedCount = 0;
  for (const todo of sampleTodos) {
    try {
      await window.electronAPI.todos.create(todo);
      console.log(`✓ Added todo: "${todo.title}"`);
      addedCount++;
    } catch (error) {
      console.error(`Failed to add todo "${todo.title}":`, error);
    }
  }

  console.log(`\n✅ Successfully added ${addedCount} sample todos!`);
  console.log('Refresh the page to see the new todos.');
};

// Run the function
addSampleTodos();