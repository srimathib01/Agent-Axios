import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
// https://tauri.app/v2/guides/frontend/vite
export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  publicDir: 'public',
  base: './',

  // Tauri expects a fixed port - using 5174 to avoid conflict with Agent-Axios frontend (5173)
  server: {
    port: 5174,
    strictPort: true,
    host: true,
  },

  // Environment variables
  envPrefix: ['VITE_', 'TAURI_'],

  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // Produce sourcemaps for error reporting
    sourcemap: !!process.env.TAURI_DEBUG,
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@securefix/core': resolve(__dirname, '../core/src'),
      '@securefix/gui': resolve(__dirname, '../gui/src'),
    },
  },

  // Clear console on rebuild
  clearScreen: false,

  optimizeDeps: {
    include: ['monaco-editor'],
    // Exclude Tauri API from pre-bundling
    exclude: ['@tauri-apps/api'],
  },
});
