# Nasz Dom

Rodzinna apka (PWA): wspólna lista zakupów, a z czasem kolejne moduły.

## Uruchomienie lokalnie

```bash
npm install
cp .env.example .env   # uzupełnij klucze Supabase
npm run dev
```

## Struktura

- `src/core/` — wspólne rzeczy: layout, UI, (wkrótce) Supabase, logowanie, profil
- `src/modules/<nazwa>/` — moduły (komponenty, hooki, typy)
- `src/modules/registry.ts` — rejestr modułów; z niego budują się trasy i dolna nawigacja
- `src/sw.ts` — service worker (cache apki, w przyszłości powiadomienia push)
- `supabase/migrations/` — migracje bazy jako pliki SQL

## Nowy moduł

1. Utwórz folder `src/modules/<nazwa>/` z komponentem strony (eksport domyślny) i ikoną.
2. Dodaj jeden wpis w `src/modules/registry.ts`.
