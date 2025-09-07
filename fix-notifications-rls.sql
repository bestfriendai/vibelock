-- Fix notifications RLS so the app can create notifications safely
-- Option A (recommended): privileged RPC that inserts rows bypassing RLS

-- 1) Create a SECURITY DEFINER function to insert notifications
create or replace function public.create_notification(
  target_user_id uuid,
  n_type text,
  n_title text,
  n_body text,
  n_data jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
  insert into public.notifications (user_id, type, title, body, data, is_read, is_sent)
  values (target_user_id, n_type, n_title, n_body, coalesce(n_data, '{}'::jsonb), false, false)
  returning id into new_id;
  return new_id;
end;
$$;

-- 2) Ensure function is executable by client roles
grant execute on function public.create_notification(uuid, text, text, text, jsonb) to anon, authenticated;

-- Option B (fallback for dev): allow any authenticated user to insert directly
-- Uncomment only if you do NOT want to use the RPC above.
-- create policy if not exists requires Postgres 15+, so we guard with an existence check.
do $$
begin
  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'notifications' and p.policyname = 'Allow authenticated inserts (dev)'
  ) then
    create policy "Allow authenticated inserts (dev)"
      on public.notifications
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

-- Verification notice
do $$ begin
  raise notice '✅ Notifications RPC + policy installed. App can now create notifications.';
end $$;

