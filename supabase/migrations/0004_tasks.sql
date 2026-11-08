-- =====================================================================
-- 0004_tasks — moduł „Sprawy do załatwienia”
--
-- Ktoś wpisuje sprawę („Odebrać paczkę”), ktoś inny klika „Biorę to”,
-- potem „Zrobione”. Zrobione znikają z ekranu po 7 dniach (zostają w bazie).
-- =====================================================================

-- Pomocnicza: czy dana osoba należy do mojego domu (do polityk RLS modułów).
create function public.in_my_household(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_profile_id and household_id = public.my_household_id()
  )
$$;

revoke execute on function public.in_my_household(uuid) from public, anon;
grant execute on function public.in_my_household(uuid) to authenticated;


create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household_id()
               references public.households (id) on delete cascade,
  title        text not null check (char_length(trim(title)) between 1 and 200),
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  taken_by     uuid references public.profiles (id) on delete set null,
  taken_at     timestamptz,
  done_by      uuid references public.profiles (id) on delete set null,
  done_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index tasks_household_id_idx on public.tasks (household_id, created_at);

revoke all on public.tasks from anon;
grant select, insert, update, delete on public.tasks to authenticated;

alter table public.tasks enable row level security;

create policy "tasks: odczyt" on public.tasks
  for select to authenticated
  using (household_id = public.my_household_id());

create policy "tasks: dodawanie" on public.tasks
  for insert to authenticated
  with check (household_id = public.my_household_id() and public.in_my_household(created_by));

create policy "tasks: zmiana" on public.tasks
  for update to authenticated
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

create policy "tasks: usuwanie" on public.tasks
  for delete to authenticated
  using (household_id = public.my_household_id());

alter publication supabase_realtime add table public.tasks;
