-- Applied 2026-10-15 when the app moved off the Fly.io server to direct supabase-js calls.

-- Browser key for Google Maps address autocomplete (previously a server secret)
alter table public.settings add column if not exists google_maps_api_key text default '';

-- New tasks are automatically tagged with whoever created them
alter table public.tasks alter column user_id set default auth.uid();

-- Helper for policies: is the signed-in user an owner? (security definer avoids RLS recursion on users)
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'owner');
$$;
revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

-- Owners can see every CRM user (worker list, pay rates, technician dropdowns)
create policy owners_read_all_users on public.users
  for select to authenticated
  using (public.is_owner());
