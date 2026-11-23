import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ensureSeeded } from './services/seed.service';

// Copy the JSON demo data into the shared store (once) BEFORE anything reads it.
ensureSeeded();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// Service worker: lets browser notifications work while the app is in a background tab.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* optional - in-app notifications still work */
    });
  });
}
