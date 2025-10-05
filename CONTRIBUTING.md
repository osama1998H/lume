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
│   ├── main/           # Electron main process
│   │   ├── main.ts     # Application entry point
│   │   └── preload.ts  # Preload script for IPC
│   ├── components/     # React components
│   │   ├── Timer.tsx   # Manual time tracking
│   │   ├── Reports.tsx # Data visualization
│   │   └── Settings.tsx # App configuration
│   ├── services/       # Core business logic
│   │   ├── ActivityMonitor.ts      # Cross-platform activity detection
│   │   └── ActivityTrackingService.ts # Session management
│   ├── database/       # Data persistence
│   │   └── DatabaseManager.ts # SQLite operations
│   └── types/          # TypeScript definitions
├── tests/              # Test files
└── docs/              # Documentation
```

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