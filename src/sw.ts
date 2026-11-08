/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>
}

// Nowa wersja apki przejmuje stronę od razu (bez czekania na zamknięcie wszystkich kart).
self.skipWaiting()
clientsClaim()

// Pliki apki w pamięci telefonu — szybkie uruchamianie.
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Każdy adres w apce (np. /zakupy) otwiera index.html — routing robi React Router.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Tu w przyszłości: obsługa powiadomień push ('push' i 'notificationclick').
