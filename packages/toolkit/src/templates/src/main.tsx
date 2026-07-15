import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@doodle-engine/react/style.css';
import { App } from './App';
import './index.css';

// Register the service worker in production so the game keeps working
// offline after the first visit. The relative path means the same build
// works at a domain root or hosted under a folder.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('sw.js').catch(() => {
        // SW registration failure is non-fatal
    });
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
