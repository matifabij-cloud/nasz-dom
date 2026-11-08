-- =====================================================================
-- 0001_init — domy, profile, lista zakupów
--
-- Zasada dla WSZYSTKICH tabel modułów:
--   * każda ma kolumnę household_id,
--   * RLS wpuszcza tylko do wierszy z domu zalogowanej osoby,
--   * polityki używają funkcji public.my_household_id().
-- =====================================================================


-- ---------------------------------------------------------------------
-- Domy
-- ---------------------------------------------------------------------
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 60),
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{6}$'),
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- Profile (jeden na konto; tworzony automatycznie przy rejestracji)
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  color        text not null default '#16a34a' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at   timestamptz not null default now()
);

create index profiles_household_id_idx on public.profiles (household_id);


-- ---------------------------------------------------------------------
-- Funkcja pomocnicza: dom zalogowanej osoby.
-- SECURITY DEFINER, żeby nie wpadać w pętlę RLS na tabeli profiles.
-- ---------------------------------------------------------------------
create function public.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.profiles where id = auth.uid()
$$;


-- ---------------------------------------------------------------------
-- Lista zakupów
-- ---------------------------------------------------------------------
create table public.shopping_items (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household_id()
               references public.households (id) on delete cascade,
  name         text not null check (char_length(trim(name)) between 1 and 100),
  quantity     text check (quantity is null or char_length(quantity) <= 30),
  category     text not null default 'inne' check (category in (
                 'warzywa', 'pieczywo', 'nabial', 'mieso', 'mrozonki',
                 'suche', 'napoje', 'chemia', 'inne')),
  added_by     uuid default auth.uid() references public.profiles (id) on delete set null,
  is_bought    boolean not null default false,
  bought_by    uuid references public.profiles (id) on delete set null,
  bought_at    timestamptz,
  created_at   timestamptz not null default now()
);

create index shopping_items_household_id_idx on public.shopping_items (household_id);


-- ---------------------------------------------------------------------
-- Profil zakładany automatycznie po rejestracji.
-- Imię przychodzi z formularza (options.data.display_name).
-- ---------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- Kolory domowników: każdy w domu dostaje inny (dopóki starczy kolorów).
-- ---------------------------------------------------------------------
create function public.pick_member_color(p_household_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select c.color
      from unnest(array[
        '#16a34a', '#2563eb', '#dc2626', '#9333ea',
        '#ea580c', '#0891b2', '#db2777', '#ca8a04'
      ]) with ordinality as c(color, ord)
      where c.color not in (
        select p.color from public.profiles p where p.household_id = p_household_id
      )
      order by c.ord
      limit 1
    ),
    '#57534e'
  )
$$;


-- ---------------------------------------------------------------------
-- Kod zaproszenia: 6 znaków, bez mylących (0/O, 1/I/L).
-- ---------------------------------------------------------------------
create function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- 31 znaków
  bytes bytea;
  code text;
begin
  loop
    bytes := uuid_send(gen_random_uuid());
    code := '';
    for i in 0..5 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end;
$$;


-- ---------------------------------------------------------------------
-- Utworzenie domu (osoba zakładająca od razu do niego należy).
-- ---------------------------------------------------------------------
create function public.create_household(p_name text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  h public.households;
begin
  if auth.uid() is null then
    raise exception 'Musisz być zalogowany.';
  end if;
  if (select household_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'Należysz już do domu.';
  end if;

  insert into public.households (name, invite_code)
  values (trim(p_name), public.generate_invite_code())
  returning * into h;

  update public.profiles
  set household_id = h.id,
      color = public.pick_member_color(h.id)
  where id = auth.uid();

  return h;
end;
$$;


-- ---------------------------------------------------------------------
-- Dołączenie do domu kodem zaproszenia.
-- ---------------------------------------------------------------------
create function public.join_household(p_code text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  h public.households;
begin
  if auth.uid() is null then
    raise exception 'Musisz być zalogowany.';
  end if;
  if (select household_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'Należysz już do domu.';
  end if;

  select * into h
  from public.households
  where invite_code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));

  if h.id is null then
    raise exception 'Nie ma domu z takim kodem.';
  end if;

  update public.profiles
  set household_id = h.id,
      color = public.pick_member_color(h.id)
  where id = auth.uid();

  return h;
end;
$$;


-- ---------------------------------------------------------------------
-- Uprawnienia do funkcji: tylko zalogowani, i tylko te, które są do tego.
-- ---------------------------------------------------------------------
revoke execute on function public.my_household_id()          from public, anon;
revoke execute on function public.handle_new_user()          from public, anon, authenticated;
revoke execute on function public.pick_member_color(uuid)    from public, anon, authenticated;
revoke execute on function public.generate_invite_code()     from public, anon, authenticated;
revoke execute on function public.create_household(text)     from public, anon;
revoke execute on function public.join_household(text)       from public, anon;

grant execute on function public.my_household_id()      to authenticated;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text)   to authenticated;


-- ---------------------------------------------------------------------
-- Uprawnienia do tabel. Niezalogowani (anon) nie mają dostępu do niczego.
-- Profilu i domu nie da się „przepiąć” ręcznie — tylko przez funkcje wyżej.
-- ---------------------------------------------------------------------
revoke all on public.households, public.profiles, public.shopping_items from anon;

revoke insert, update, delete on public.households from authenticated;
grant  select, update (name)  on public.households to authenticated;

revoke insert, update, delete on public.profiles from authenticated;
grant  select, update (display_name, color) on public.profiles to authenticated;

grant select, insert, update, delete on public.shopping_items to authenticated;


-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.households     enable row level security;
alter table public.profiles       enable row level security;
alter table public.shopping_items enable row level security;

-- Domy: widzę i mogę przemianować tylko swój.
create policy "households: odczyt swojego domu" on public.households
  for select to authenticated
  using (id = public.my_household_id());

create policy "households: zmiana nazwy swojego domu" on public.households
  for update to authenticated
  using (id = public.my_household_id())
  with check (id = public.my_household_id());

-- Profile: widzę siebie i domowników; zmieniam tylko swój.
create policy "profiles: odczyt siebie i domowników" on public.profiles
  for select to authenticated
  using (id = auth.uid() or household_id = public.my_household_id());

create policy "profiles: edycja własnego" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Lista zakupów: pełny dostęp tylko do pozycji z mojego domu.
create policy "shopping_items: odczyt" on public.shopping_items
  for select to authenticated
  using (household_id = public.my_household_id());

create policy "shopping_items: dodawanie" on public.shopping_items
  for insert to authenticated
  with check (household_id = public.my_household_id() and added_by = auth.uid());

create policy "shopping_items: zmiana" on public.shopping_items
  for update to authenticated
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

create policy "shopping_items: usuwanie" on public.shopping_items
  for delete to authenticated
  using (household_id = public.my_household_id());


-- ---------------------------------------------------------------------
-- Realtime: zmiany na liście od razu u wszystkich.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.shopping_items;
