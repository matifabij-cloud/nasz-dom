-- =====================================================================
-- 0003_history — historia zakupów
--
-- „Wyczyść kupione” nie kasuje już produktów, tylko chowa je do historii
-- (cleared_at). Z historii apka uczy się:
--   * podpowiedzi przy wpisywaniu (co zwykle kupujecie),
--   * kolejności działów w Waszym sklepie (w jakiej kolejności odhaczacie).
-- „×” nadal usuwa produkt na stałe (pomyłki nie trafiają do historii).
-- =====================================================================

alter table public.shopping_items add column cleared_at timestamptz;

-- Aktualna lista (niewyczyszczone) i historia zakupów — szybkie zapytania.
create index shopping_items_active_idx
  on public.shopping_items (household_id)
  where cleared_at is null;

create index shopping_items_history_idx
  on public.shopping_items (household_id, created_at);
