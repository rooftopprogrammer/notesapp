#!/usr/bin/env node

/**
 * RNotes Deployment Status Checker
 * Verifies that all deployment configurations are correct
 */

import fs from 'fs';

console.log('🔍 RNotes Deployment Status Check\n');

const checks = [
  {
    name: 'Firebase Configuration',
    check: () => fs.existsSync('firebase.json') && fs.existsSync('.firebaserc'),
    details: 'firebase.json and .firebaserc exist'
  },
  {
    name: 'Next.js Configuration',
    check: () => {
      const config = fs.readFileSync('next.config.mjs', 'utf8');
      return config.includes('output: \'export\'') && config.includes('withPWA');
    },
    details: 'Static export and PWA enabled'
  },
  {
    name: 'GitHub Actions Workflows',
    check: () => {
      return fs.existsSync('.github/workflows/firebase-hosting-merge.yml') &&
             fs.existsSync('.github/workflows/firebase-hosting-pull-request.yml');
    },
    details: 'CI/CD workflows configured'
  },
  {
    name: 'Build Output',
    check: () => fs.existsSync('out') && fs.existsSync('out/index.html'),
    details: 'Static export build output exists'
  },
  {
    name: 'Environment Configuration',
    check: () => fs.existsSync('.env.example'),
    details: 'Environment template available'
  },
  {
    name: 'PWA Assets',
    check: () => fs.existsSync('public/manifest.json') && fs.existsSync('public/sw.js'),
    details: 'PWA manifest and service worker exist'
  },
  {
    name: 'Firebase Project',
    check: () => {
      try {
        const firebaserc = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'));
        return firebaserc.projects.default === 'notesapp-89d19';
      } catch {
        return false;
      }
    },
    details: 'Connected to notesapp-89d19 project'
  }
];

let passed = 0;
let failed = 0;

checks.forEach(({ name, check, details }) => {
  try {
    if (check()) {
      console.log(`✅ ${name}`);
      console.log(`   ${details}\n`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      console.log(`   ${details}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}\n`);
    failed++;
  }
});

console.log('📊 Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`🎯 Total: ${passed + failed}\n`);

if (failed === 0) {
  console.log('🚀 All checks passed! Your app is ready for deployment.');
  console.log('📍 Live URL: https://notesapp-89d19.web.app');
} else {
  console.log('⚠️  Some checks failed. Please review the configuration.');
}

// Additional info
console.log('\n🛠️  Useful Commands:');
console.log('   npm run build     - Build the project');
console.log('   npm run deploy    - Deploy to Firebase');
console.log('   npm run serve     - Serve locally with Firebase');
console.log('   firebase projects - List Firebase projects');
console.log('   firebase hosting  - View hosting info');
