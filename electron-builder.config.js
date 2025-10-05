module.exports = {
  appId: 'com.lume.timetracker',
  productName: 'Lume',
  directories: {
    output: 'release',
  },
  files: [
    'dist/**/*',
    'node_modules/**/*',
    '!node_modules/.cache',
    '!**/*.test.{js,ts}',
    '!**/*.spec.{js,ts}',
  ],
  mac: {
    category: 'public.app-category.productivity',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
    ],
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
    ],
  },
};