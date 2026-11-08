-- Execute no SQL Editor do Supabase antes de usar o modo compartilhado.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('admin', 'user')) default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.unavailabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  member_name text not null,
  unavailable_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, unavailable_date)
);

create table if not exists public.app_settings (
  key text primary key,
  edits_locked boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, edits_locked)
values ('unavailabilities', false)
on conflict (key) do nothing;

alter table public.profiles enable row level security;
alter table public.unavailabilities enable row level security;
alter table public.app_settings enable row level security;

create policy "users can read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "users manage own unavailability" on public.unavailabilities;
drop policy if exists "users_can_insert_own_unavailability" on public.unavailabilities;
drop policy if exists "users_can_select_own_unavailability" on public.unavailabilities;

create policy "users insert own unavailability" on public.unavailabilities
  for insert to authenticated with check (auth.uid() = user_id);

create policy "users read own unavailability" on public.unavailabilities
  for select to authenticated using (auth.uid() = user_id);

create policy "users update own unavailability" on public.unavailabilities
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users delete own unavailability" on public.unavailabilities
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "authenticated read edit lock" on public.app_settings
  for select to authenticated using (true);

create policy "admins update edit lock" on public.app_settings
  for update to authenticated using (public.is_admin())
  with check (public.is_admin());

create policy "admins read all unavailability" on public.unavailabilities
  for select using (public.is_admin());

create policy "admins manage all unavailability" on public.unavailabilities
  for all using (public.is_admin())
  with check (public.is_admin());

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if lower(new.email) = 'danilabbr@gmail.com' then
    insert into public.profiles (id, email, full_name, role)
    values (new.id, lower(new.email), 'DANILA BARROS BANDEIRA RIBEIRO', 'admin')
    on conflict (id) do update
      set email = excluded.email, full_name = excluded.full_name, role = excluded.role;
  elsif lower(new.email) = 'esribeiro43@gmail.com' then
    insert into public.profiles (id, email, full_name, role)
    values (new.id, lower(new.email), 'EDUARDO DOS SANTOS RIBEIRO', 'user')
    on conflict (id) do update
      set email = excluded.email, full_name = excluded.full_name, role = excluded.role;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Após o primeiro login de cada conta, execute uma vez, substituindo os IDs
-- pelos UUIDs existentes em Authentication > Users.
-- insert into public.profiles (id,email,full_name,role) values
-- ('UUID_DANILA','danilabbr@gmail.com','DANILA BARROS BANDEIRA RIBEIRO','admin'),
-- ('UUID_EDUARDO','esribeiro43@gmail.com','EDUARDO DOS SANTOS RIBEIRO','user');
