import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// Rejestracja service workera. Nowa wersja apki wczyta się sama, ale dopiero
// gdy apka zejdzie w tło — żeby nie przerwać nikomu wpisywania.
registerSW({
  immediate: true,
  onNeedReload() {
    if (document.visibilityState === 'hidden') window.location.reload()
    else document.addEventListener('visibilitychange', () => window.location.reload(), { once: true })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
