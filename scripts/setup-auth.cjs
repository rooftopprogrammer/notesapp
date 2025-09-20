#!/usr/bin/env node

// Script to enable Firebase Anonymous Authentication
// This script provides instructions and attempts to enable anonymous auth

const { execSync } = require('child_process');

console.log('🔥 Firebase Anonymous Authentication Setup');
console.log('='.repeat(50));
console.log();

try {
  // Check if Firebase CLI is available
  execSync('firebase --version', { stdio: 'ignore' });
  console.log('✅ Firebase CLI is available');
  
  // Try to get current project
  try {
    const project = execSync('firebase use', { encoding: 'utf-8' }).trim();
    console.log(`📝 Current project: ${project}`);
  } catch (error) {
    console.log('⚠️  No Firebase project selected');
  }

  console.log();
  console.log('🔧 Manual Setup Required:');
  console.log('1. Go to Firebase Console: https://console.firebase.google.com');
  console.log('2. Select your project');
  console.log('3. Go to Authentication > Sign-in method');
  console.log('4. Enable "Anonymous" provider');
  console.log('5. Click "Save"');
  console.log();
  
  console.log('📋 Or use this configuration:');
  console.log('- Anonymous authentication: ENABLED');
  console.log('- Email/Password authentication: ENABLED (recommended as fallback)');
  console.log();
  
  console.log('🚀 After enabling anonymous authentication:');
  console.log('1. Restart your Next.js development server');
  console.log('2. Try creating a temple plan');
  console.log('3. The authentication should work automatically');
  
} catch (error) {
  console.log('❌ Firebase CLI not found');
  console.log('Please install Firebase CLI: npm install -g firebase-tools');
}

console.log();
console.log('🔍 If you still get errors:');
console.log('- Check browser console for detailed error messages');
console.log('- Verify Firebase project configuration in .env files');
console.log('- Ensure Firestore rules allow authenticated users to read/write');
console.log();
console.log('✨ Authentication Fallback:');
console.log('If anonymous auth fails, users can create an email/password account');
console.log('through the AuthModal that will appear automatically.');