// Check if we're in electron
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);

// Try to access electron via require
try {
  const mod = require.resolve('electron');
  console.log('electron resolves to:', mod);
} catch (e) {
  console.log('electron resolve error:', e.message);
}

// Check module paths
console.log('module.paths:', module.paths);
