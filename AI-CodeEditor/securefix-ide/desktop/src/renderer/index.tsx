import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { injectDecorationStyles } from '../../editor/decorations';

// Inject Monaco decoration styles
injectDecorationStyles();

// Mount the React application
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log startup
console.log('SecureFix IDE: Renderer process started');
