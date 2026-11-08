# Nasz Dom

Rodzinna apka (PWA): wspólna lista zakupów, a z czasem kolejne moduły.

**Na żywo:** https://nasz-dom-phi.vercel.app — każdy push na `main` wdraża się sam (Vercel).

## Uruchomienie lokalnie

```bash
npm install
cp .env.example .env   # uzupełnij klucze Supabase
npm run dev
```

## Struktura

- `src/core/` — wspólne rzeczy: Supabase, logowanie (`auth/`), dom i domownicy (`household/`), layout, UI, pamięć offline (`storage.ts`)
- `src/modules/<nazwa>/` — moduły (komponenty, hooki, typy)
- `src/modules/registry.ts` — rejestr modułów; z niego budują się trasy i dolna nawigacja
- `src/sw.ts` — service worker (apka działa bez internetu)
- `supabase/migrations/` — migracje bazy jako pliki SQL

## Nowy moduł

1. Utwórz folder `src/modules/<nazwa>/` z komponentem strony (eksport domyślny) i ikoną.
2. Dodaj jeden wpis w `src/modules/registry.ts`.
3. Nowa tabela: kolumna `household_id` + polityki RLS oparte na `public.my_household_id()`.

## Baza danych (Supabase)

Migracje wgrywa się ręcznie, po kolei: **SQL Editor → wklej plik → Run**.

| Plik | Co robi |
|---|---|
| `0001_init.sql` | domy, profile, lista zakupów, RLS, kod zaproszenia, realtime |
| `0002_undo_delete.sql` | „Cofnij” po usunięciu produktu dodanego przez kogoś z domu |

W **Authentication → Sign In / Providers → Email** wyłączone jest „Confirm email”.

## Wdrożenie (Vercel)

Zmienne środowiskowe w projekcie Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
(klucz publishable/anon — jawny z założenia; nigdy klucz `secret`/`service_role`).
