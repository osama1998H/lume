# GitHub Actions Workflows

This document describes the automated CI/CD pipelines configured for the Lume project.

## 📋 Overview

The project uses three main workflows:

1. **CI (Continuous Integration)** - Validates code quality on every push/PR
2. **Build & Release** - Creates distributable packages for all platforms
3. **Dependency Review** - Checks for security vulnerabilities in dependencies

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

## 📦 Artifacts

### CI Workflow
- **build-output** - Compiled application code (7-day retention)

### Build Workflow
- **lume-macos** - macOS installers (.dmg, .zip)
- **lume-linux** - Linux packages (.AppImage, .deb)
- **lume-windows** - Windows installer (.exe)
- Artifacts retained for 30 days

---

## ⚙️ Configuration

### Required Secrets
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### Node.js Version
- All workflows use Node.js 20 LTS

### Caching
- npm dependencies are cached using `actions/setup-node` cache feature
- Improves build speed by avoiding redundant downloads

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

---

## 🔄 Workflow Status Badges

Add to your README.md:

```markdown
[![CI](https://github.com/osama1998H/lume/actions/workflows/ci.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/ci.yml)
[![Build](https://github.com/osama1998H/lume/actions/workflows/build.yml/badge.svg)](https://github.com/osama1998H/lume/actions/workflows/build.yml)
```

---

## 📈 Future Enhancements

- [ ] Add code coverage reporting
- [ ] Implement automatic version bumping
- [ ] Add performance benchmarks
- [ ] Create nightly builds
- [ ] Add auto-update server support
- [ ] Implement changelog generation
