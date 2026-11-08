-- =====================================================================
-- 0002_undo_delete — „Cofnij” po usunięciu produktu
--
-- Przywrócenie usuniętego produktu wstawia go ponownie z oryginalnym
-- autorem (np. produkt dodany przez mamę wraca z jej kolorem).
-- Autorem może być tylko ktoś z tego samego domu.
-- =====================================================================

drop policy "shopping_items: dodawanie" on public.shopping_items;

create policy "shopping_items: dodawanie" on public.shopping_items
  for insert to authenticated
  with check (
    household_id = public.my_household_id()
    and (
      added_by = auth.uid()
      or added_by in (select p.id from public.profiles p where p.household_id = public.my_household_id())
    )
  );
