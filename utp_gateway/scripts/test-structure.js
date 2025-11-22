#!/usr/bin/env node

/**
 * UTP Gateway Structure Test Script
 * Tests the organized codebase structure and functionality
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🧪 UTP Gateway Structure Test');
console.log('==============================');

// Test configuration
const tests = [];
let passed = 0;
let failed = 0;

function addTest(name, testFn) {
  tests.push({ name, testFn });
}

function logResult(test, result, message = '') {
  if (result) {
    console.log(`✅ ${test}: PASSED ${message}`);
    passed++;
  } else {
    console.log(`❌ ${test}: FAILED ${message}`);
    failed++;
  }
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  logResult(`File exists: ${description}`, exists, exists ? `(${filePath})` : '');
  return exists;
}

function checkDirectory(dirPath, description) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  logResult(`Directory exists: ${description}`, exists, exists ? `(${dirPath})` : '');
  return exists;
}

// Run tests
addTest('Project root structure', () => {
  const requiredDirs = [
    'backend',
    'frontend', 
    'docs',
    'tests',
    'scripts',
    'config',
    'utils'
  ];
  
  return requiredDirs.every(dir => checkDirectory(dir, dir));
});

addTest('Backend structure', () => {
  const requiredDirs = [
    'backend/config',
    'backend/controllers',
    'backend/middleware',
    'backend/models',
    'backend/routes',
    'backend/services'
  ];
  
  return requiredDirs.every(dir => checkDirectory(dir, dir));
});

addTest('Frontend structure', () => {
  return checkDirectory('frontend/pages', 'frontend pages') &&
         checkDirectory('frontend/assets', 'frontend assets');
});

addTest('Frontend assets structure', () => {
  const requiredDirs = [
    'frontend/assets/css',
    'frontend/assets/js',
    'frontend/assets/images'
  ];
  
  return requiredDirs.every(dir => checkDirectory(dir, dir));
});

addTest('Package.json exists', () => {
  return checkFile('package.json', 'package.json');
});

addTest('Environment example exists', () => {
  return checkFile('.env.example', '.env.example');
});

addTest('README exists', () => {
  return checkFile('README.md', 'README.md');
});

addTest('Gitignore exists', () => {
  return checkFile('.gitignore', '.gitignore');
});

addTest('Main server file exists', () => {
  return checkFile('backend/server.js', 'main server');
});

addTest('Configuration file exists', () => {
  return checkFile('backend/config/index.js', 'configuration');
});

addTest('Middleware files exist', () => {
  const middlewareFiles = [
    'backend/middleware/auth.middleware.js',
    'backend/middleware/validation.middleware.js',
    'backend/middleware/error.middleware.js'
  ];
  
  return middlewareFiles.every(file => checkFile(file, file));
});

addTest('Service files exist', () => {
  const serviceFiles = [
    'backend/services/conversion.js',
    'backend/services/settlement.js'
  ];
  
  return serviceFiles.every(file => checkFile(file, file));
});

addTest('Route files exist', () => {
  const routeFiles = [
    'backend/routes/auth.routes.js',
    'backend/routes/payments.routes.js',
    'backend/routes/merchant.routes.js',
    'backend/routes/settlement.routes.js',
    'backend/routes/conversion.routes.js',
    'backend/routes/integration.routes.js',
    'backend/routes/admin.routes.js'
  ];
  
  return routeFiles.every(file => checkFile(file, file));
});

addTest('Frontend pages exist', () => {
  const pageFiles = [
    'frontend/pages/index.html',
    'frontend/pages/dashboard.html'
  ];
  
  return pageFiles.every(file => checkFile(file, file));
});

addTest('Frontend assets exist', () => {
  const assetFiles = [
    'frontend/assets/css/main.css',
    'frontend/assets/css/dashboard.css',
    'frontend/assets/js/main.js',
    'frontend/assets/js/dashboard.js'
  ];
  
  return assetFiles.every(file => checkFile(file, file));
});

addTest('Package.json has correct structure', () => {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const hasName = pkg.name === 'utp-gateway';
    const hasMain = pkg.main === 'backend/server.js';
    const hasScripts = pkg.scripts && Object.keys(pkg.scripts).length > 0;
    const hasDependencies = pkg.dependencies && Object.keys(pkg.dependencies).length > 0;
    
    logResult('Package has correct name', hasName, `(name: ${pkg.name})`);
    logResult('Package has correct main', hasMain, `(main: ${pkg.main})`);
    logResult('Package has scripts', hasScripts);
    logResult('Package has dependencies', hasDependencies);
    
    return hasName && hasMain && hasScripts && hasDependencies;
  } catch (error) {
    logResult('Package.json is valid JSON', false, `(${error.message})`);
    return false;
  }
});

addTest('Server file syntax', () => {
  try {
    require('../backend/server.js');
    return true;
  } catch (error) {
    logResult('Server file syntax', false, `(${error.message})`);
    return false;
  }
});

// Run all tests
console.log('\n🔍 Running tests...\n');

tests.forEach(test => {
  try {
    test.testFn();
  } catch (error) {
    logResult(test.name, false, `(error: ${error.message})`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${tests.length}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! UTP Gateway structure is valid.');
  console.log('\n🚀 Ready to start the server:');
  console.log('   npm run dev   - Development mode');
  console.log('   npm start     - Production mode');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please check the structure.');
  console.log('   Run: bash scripts/setup.sh to fix issues');
  process.exit(1);
}