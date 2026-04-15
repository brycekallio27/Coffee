import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'

// Register service worker for offline PWA support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch((error) => {
    console.log('Service Worker registration failed:', error)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster
      theme="dark"
      position="top-right"
      toastOptions={{
        style: {
          background: 'rgba(11, 20, 32, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white',
          backdropFilter: 'blur(16px)',
        },
      }}
    />
    <App />
  </StrictMode>,
)
