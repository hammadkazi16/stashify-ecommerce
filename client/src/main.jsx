import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/sora/400.css';
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/sora/800.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './styles.css';
import App from './App.jsx';

async function boot() {
  let initialConfig = null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch('/api/config', { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (res.ok) initialConfig = await res.json();
  } catch {
    // StoreProvider will retry and surface a connection error in the UI.
  } finally {
    clearTimeout(timeout);
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <App initialConfig={initialConfig} />
      </BrowserRouter>
    </StrictMode>
  );
}

boot();
