import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initEnvironment } from './core/environment';
import { startSceneProgressSync } from './core/sceneProgress';
import './index.css';

initEnvironment();
startSceneProgressSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
