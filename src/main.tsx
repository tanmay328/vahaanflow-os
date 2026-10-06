import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Silence non-actionable iframe WebSocket connection rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'string' && event.reason.includes('WebSocket')) {
    event.preventDefault();
  }
  if (event.reason?.message && typeof event.reason.message === 'string' && event.reason.message.includes('WebSocket')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallbackTitle="GoDrive encountered an error">
    <App />
  </ErrorBoundary>
);
