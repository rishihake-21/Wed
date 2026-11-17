import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initEnvironment } from './core/environment';
import './index.css';

initEnvironment();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
