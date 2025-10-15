# GitHub Actions Workflows

This document describes the automated CI/CD pipelines configured for the Lume project.

## 📋 Overview

The project uses eleven comprehensive workflows for continuous integration, security, quality assurance, and release management:

### Core CI/CD
1. **CI (Continuous Integration)** - Validates code quality on every push/PR
2. **Build & Release** - Creates distributable packages for all platforms
3. **Dependency Review** - Checks for security vulnerabilities in dependencies

### Quality & Testing
4. **Code Coverage** - Tracks test coverage and prevents regressions
5. **Bundle Size Tracking** - Monitors application bundle size changes

### Security
6. **CodeQL Security Analysis** - Advanced security vulnerability scanning
7. **Dependabot** - Automated dependency updates

### Automation
8. **PR Auto-labeling** - Automatically categorizes pull requests
9. **Stale Management** - Manages inactive issues and PRs
10. **Release Automation** - Generates changelogs and release notes

### Additional
11. **Nightly Builds** - Daily edge case testing and pre-release builds

---

## 🔄 CI Workflow

**File**: `.github/workflows/ci.yml`

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch

**Jobs**:

### 1. Lint Code
- Runs ESLint on the codebase
- Checks code style and catches common errors
- Fails if linting errors are found

### 2. Build Application
- Builds the React frontend with Vite
- Compiles TypeScript for Electron
- Uploads build artifacts (retained for 7 days)

### 3. TypeScript Type Check
- Runs TypeScript compiler in check mode
- Validates type correctness across the codebase

### 4. Run Tests
- Executes Jest test suite
- Currently set to `continue-on-error: true` due to configuration issues
- Will be enforced once test setup is complete

---

## 🚀 Build & Release Workflow

**File**: `.github/workflows/build.yml`

**Triggers**:
- Push of version tags (e.g., `v1.0.0`)
- Published GitHub releases
- Manual trigger via workflow_dispatch

**Matrix Strategy**:
Builds on three platforms simultaneously:
- **macOS** (latest) → .dmg, .zip
- **Linux** (Ubuntu latest) → .AppImage, .deb
- **Windows** (latest) → .exe

**Process**:

1. **Build Phase** (runs on each OS):
   - Checkout code
   - Install dependencies
   - Build application
   - Package with electron-builder
   - Upload platform-specific artifacts

2. **Release Phase** (runs on Ubuntu):
   - Downloads all platform artifacts
   - Uploads to GitHub Release (only for version tags)

**Creating a Release**:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# Or create a GitHub Release via the UI
# The workflow will automatically build and attach installers
```

---

## 🔒 Dependency Review Workflow

**File**: `.github/workflows/dependency-review.yml`

**Triggers**:
- Pull requests to `main` branch

**Features**:
- Scans dependency changes for security vulnerabilities
- Fails if moderate or higher severity issues found
- Posts summary comment in PR

---

## 📊 Code Coverage Workflow

**File**: `.github/workflows/coverage.yml`

**Triggers**:
- Pull requests to `main` branch
- Paths: `src/**`, test files, config files

**Features**:
- Runs Jest test suite with coverage collection
- Uploads coverage reports to Codecov
- Posts coverage summary as PR comment
- Fails if overall coverage drops below 70%

**Coverage Thresholds**:
- Overall: 70%
- Per file: 60%
- New files: 70%

**Formats Generated**:
- lcov (for Codecov)
- json-summary (for PR comments)
- text (for console output)

**Usage**:
```bash
# Run locally with coverage
npm run test -- --coverage
```

---

## 📦 Bundle Size Tracking

**File**: `.github/workflows/bundle-size.yml`

**Triggers**:
- Pull requests to `main` branch
- Paths: `src/**`, `package.json`, `package-lock.json`, `vite.config.ts`, `electron/**`

**Features**:
- Compares bundle size between PR and base branch
- Tracks both React (renderer) and Electron (main) bundles
- Posts detailed size comparison in PR comments
- Warns if size increases by >50MB or >5%
- Automatically updates comment on new commits

**Threshold Alerts**:
- Size increase >50MB → Warning
- Percentage increase >5% → Warning
- Fails the check if thresholds exceeded

**Example Output**:
```
| Component | Base | PR | Change |
|-----------|------|-----|--------|
| React | 2.5M | 2.6M | 📈 +100K (+4%) |
| Electron | 1.2M | 1.2M | ➡️ No change |
| Total | 3.7M | 3.8M | 📈 +100K (+2.7%) |
```

---

## 🛡️ CodeQL Security Analysis

**File**: `.github/workflows/codeql.yml`

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch (paths: `src/**`, config files)
- Weekly schedule: Sundays at 3 AM (Baghdad time)

**Languages Analyzed**:
- JavaScript/TypeScript

**Features**:
- Advanced semantic code analysis
- Detects security vulnerabilities and coding errors
- Uses `security-and-quality` query suite
- Uploads results to GitHub Security tab
- Ignores: `node_modules`, `dist`, `release`, `coverage`

**Query Categories**:
- SQL injection
- Cross-site scripting (XSS)
- Command injection
- Path traversal
- Code quality issues

---

## 🤖 Dependabot Configuration

**File**: `.github/dependabot.yml`

**Schedule**:
- Weekly updates on Mondays at 6 AM (Baghdad time)

**Ecosystems**:

### NPM Dependencies
- Directory: `/`
- Max open PRs: 10
- Reviewer: @osama1998H
- Commit prefix: `deps` (prod), `deps-dev` (dev)

**Grouped Updates**:
- **React**: All React packages and types
- **Testing**: Jest, Testing Library, Playwright
- **ESLint**: ESLint and TypeScript ESLint plugins
- **Build Tools**: Vite, TypeScript, electron-builder

**Ignored Major Updates**:
- React (stay on current major version)
- React DOM (stay on current major version)
- Electron (stay on current major version)

### GitHub Actions
- Directory: `/`
- Max open PRs: 5
- Commit prefix: `ci`

---

## 🏷️ PR Auto-labeling

**Files**:
- `.github/workflows/pr-labeler.yml`
- `.github/labeler.yml`

**Triggers**:
- Pull requests (opened, synchronized, reopened)

**Automatic Labels**:
- `frontend` - React components, UI changes
- `backend` - Electron main process, Node.js code
- `database` - Database schemas, migrations
- `i18n` - Translation files
- `testing` - Test files and configurations
- `docs` - Documentation changes
- `ci` - Workflow and CI configuration
- `dependencies` - Package changes

**Features**:
- Labels applied based on changed file paths
- Multiple labels can be applied to a single PR
- Runs on every PR update

---

## 🧹 Stale Issue & PR Management

**File**: `.github/workflows/stale.yml`

**Schedule**:
- Daily at 1 AM UTC
- Manual trigger available

**Configuration**:

### Issues
- **Stale after**: 60 days of inactivity
- **Close after**: 7 additional days
- **Exempt labels**: `pinned`, `security`, `roadmap`, `good first issue`, `help wanted`

### Pull Requests
- **Stale after**: 60 days of inactivity
- **Close after**: 7 additional days
- **Exempt labels**: `pinned`, `work-in-progress`, `security`

**Features**:
- Removes stale label when activity resumes
- Processes up to 100 operations per run
- Posts friendly reminder messages
- Adds `stale` and `closed-by-bot` labels

---

## 📝 Release Automation

**File**: `.github/workflows/release-automation.yml`

**Triggers**:
- Published releases
- Manual trigger with version input

**Jobs**:

### 1. Generate Changelog
- Uses GitHub's API to generate changelog
- Compares release tag with base branch
- Includes all merged PRs and commits

### 2. Create Release Notes
- Formats comprehensive release notes
- Includes:
  - What's Changed section
  - Installation instructions for all platforms
  - Upgrade notes
  - Full changelog link

**Release Note Sections**:
```markdown
## What's Changed
[Auto-generated changelog]

## Installation
### macOS
- Download instructions

### Windows
- Download instructions

### Linux
- AppImage and Debian instructions

## Upgrade Notes
Backup instructions

## Full Changelog
Link to compare view
```

### 3. Update Version File
- Bumps `package.json` version
- Creates PR with version changes
- Labels: `automated`, `release`

**Manual Release Workflow**:
```bash
# Trigger via GitHub UI
Actions → Release Automation → Run workflow
Enter version: v1.2.3
```

---

## 🌙 Nightly Builds

**File**: `.github/workflows/nightly.yml`

**Schedule**:
- Daily at 2 AM UTC (3 AM Baghdad time)
- Manual trigger available

**Jobs**:

### 1. Check for Changes
- Detects commits in last 24 hours
- Skips build if no changes
- Manual trigger bypasses check

### 2. Build (Matrix)
- Builds on macOS, Linux, Windows
- Runs tests (non-blocking)
- Packages with electron-builder
- Renames artifacts with `nightly-{short-sha}` prefix

**Artifact Retention**: 7 days

### 3. Notify Build Status
- Creates GitHub issue on failure
- Issue includes workflow run link
- Labels: `ci`, `nightly-build`, `automated`

### 4. Cleanup Old Artifacts
- Keeps only last 7 nightly builds (21 artifacts total: 7 days × 3 platforms)
- Automatically deletes older artifacts
- Prevents storage bloat

**Nightly Artifact Naming**:
```
nightly-abc1234-Lume-1.0.0.dmg
nightly-abc1234-Lume-1.0.0.AppImage
nightly-abc1234-Lume-Setup-1.0.0.exe
```

---

## 📦 Artifacts

### CI Workflow
- **build-output** - Compiled application code (7-day retention)

### Build Workflow
- **lume-macos** - macOS installers (.dmg, .zip)
- **lume-linux** - Linux packages (.AppImage, .deb)
- **lume-windows** - Windows installer (.exe)
- Artifacts retained for 30 days

### Nightly Builds
- **nightly-macos-{sha}** - macOS nightly installers
- **nightly-linux-{sha}** - Linux nightly packages
- **nightly-windows-{sha}** - Windows nightly installer
- Artifacts retained for 7 days

---

## ⚙️ Configuration

### Required Secrets
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions
- `CODECOV_TOKEN` - For code coverage uploads (optional but recommended)

### Node.js Version
- All workflows use Node.js 20 LTS

### Caching
- npm dependencies are cached using `actions/setup-node` cache feature
- Improves build speed by avoiding redundant downloads

### Permissions
All workflows use minimal required permissions:
- `contents: read/write` - For repository access
- `pull-requests: write` - For PR comments
- `issues: write` - For issue management
- `security-events: write` - For CodeQL results

---

## 🐛 Troubleshooting

### CI Fails on Type Check
```bash
# Run locally to debug
npm run build:electron
```

### Build Fails on Specific Platform
- Check electron-builder configuration in `package.json`
- Verify platform-specific icon paths exist
- Review build logs in Actions tab

### Tests Fail
```bash
# Run locally
npm run test

# Watch mode for development
npm run test:watch
```

### Coverage Upload Fails
- Verify `CODECOV_TOKEN` is set in repository secrets
- Check Codecov service status
- Review coverage report generation

### Bundle Size Check Fails
- Review size increase in PR comment
- Analyze what caused the increase
- Consider code splitting or lazy loading
- Check for unintended dependencies

### Dependabot PRs Not Created
- Check `.github/dependabot.yml` syntax
- Verify schedule configuration
- Check Dependabot dashboard for errors

---

## 🔄 Workflow Status Badges

Add to your README.md:

```markdown
[![CI](https://github.com/osama1998H/lume/actions/workflows/ci.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/ci.yml)
[![Build](https://github.com/osama1998H/lume/actions/workflows/build.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/build.yml)
[![Code Coverage](https://github.com/osama1998H/lume/actions/workflows/coverage.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/coverage.yml)
[![CodeQL](https://github.com/osama1998H/lume/actions/workflows/codeql.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/codeql.yml)
[![Bundle Size](https://github.com/osama1998H/lume/actions/workflows/bundle-size.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/bundle-size.yml)
[![Nightly Builds](https://github.com/osama1998H/lume/actions/workflows/nightly.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/nightly.yml)
```

---

## 📈 Workflow Statistics

| Workflow | Frequency | Platform | Retention |
|----------|-----------|----------|-----------|
| CI | Every push/PR | Ubuntu | 7 days |
| Build & Release | On tags | Multi-platform | 30 days |
| Coverage | Every PR | Ubuntu | N/A |
| CodeQL | Weekly + PR | Ubuntu | N/A |
| Bundle Size | Every PR | Ubuntu | N/A |
| Nightly | Daily | Multi-platform | 7 days |
| Stale | Daily | Ubuntu | N/A |

---

## 🎯 Best Practices

### For Developers

1. **Before Creating PR**:
   - Run `npm run lint` locally
   - Run `npm run test` locally
   - Run `npm run build` to verify compilation

2. **During PR Review**:
   - Check coverage report for new code
   - Review bundle size impact
   - Address any security alerts from CodeQL

3. **Before Merging**:
   - Ensure all CI checks pass
   - Review Dependabot PRs regularly
   - Keep PRs focused and small for faster reviews

### For Maintainers

1. **Release Process**:
   - Use semantic versioning (MAJOR.MINOR.PATCH)
   - Create tags for stable releases
   - Use release automation workflow for changelog

2. **Security**:
   - Review CodeQL alerts weekly
   - Keep dependencies updated via Dependabot
   - Monitor nightly build failures

3. **Quality Assurance**:
   - Maintain >70% code coverage
   - Monitor bundle size trends
   - Review and update stale issues quarterly

---

## 🚀 Future Enhancements

- [ ] Add performance benchmarks
- [ ] Implement visual regression testing
- [ ] Add auto-update server support
- [ ] Create canary/beta release channels
- [ ] Add E2E tests in CI pipeline
- [ ] Implement automatic security patching
