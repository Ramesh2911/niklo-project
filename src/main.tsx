import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ponytail: seed/CDN image URLs (e.g. cdn.niklo.com) can 404 or fail DNS —
// swap to an inline placeholder instead of showing a broken-image icon.
const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="sans-serif" font-size="18"%3EImage unavailable%3C/text%3E%3C/svg%3E';
window.addEventListener('error', (e) => {
  const target = e.target;
  if (target instanceof HTMLImageElement && target.src !== IMG_FALLBACK) {
    target.src = IMG_FALLBACK;
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
