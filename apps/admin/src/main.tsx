import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// SW update guard — reload only if user triggered update
if ('serviceWorker' in navigator) {
  window.addEventListener('controllerchange', () => {
    if (localStorage.getItem('pwa_just_updated') === 'true') {
      localStorage.removeItem('pwa_just_updated');
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
