import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { queryClient } from './lib/queryClient';
import { initBrewSync } from './services/brewSync';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

setTimeout(() => initBrewSync().catch(console.error), 0);

// Reload only when update was user-requested (PWA update flow via UpdateNotificationModal).
// Avoids losing form/cart state on unexpected controllerchange (e.g. SW crash recovery).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (localStorage.getItem('pwa_just_updated') === 'true') {
      localStorage.removeItem('pwa_just_updated');
      window.location.reload();
    }
  });
}
