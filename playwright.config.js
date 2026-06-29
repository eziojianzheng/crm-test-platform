const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests'),
  testMatch: ['**/*.spec.js'],
  testIgnore: ['**/node_modules/**'],
  timeout: 180000,
  use: {
    headless: true,
  },
  reporter: 'list',
});
