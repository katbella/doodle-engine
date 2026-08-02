import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@fontsource-variable/ibm-plex-sans';
import '@fontsource-variable/ibm-plex-sans/wght-italic.css';
import '@fontsource/monaspace-neon';
import '@fontsource/monaspace-neon/600.css';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/globals.css';
import './styles/shell.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
