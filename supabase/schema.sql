-- Supabase setup for true one-time MOSHA DROP codes.
-- Run this once in the Supabase SQL editor, then set these env vars:
--   NEXT_PUBLIC_SUPABASE_URL
--   NEXT_PUBLIC_SUPABASE_ANON_KEY
-- The RPC is sealed with SECURITY DEFINER + RLS so anonymous clients can only
-- attempt a redeem (never read code hashes or other rows). atomic single-use
-- is enforced by the UPDATE ... WHERE used = false guard inside a transaction
-- (the WHERE clause makes concurrent redeems safe: exactly one wins).

create table if not exists public.drop_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.drop_codes enable row level security;

create or replace function public.redeem_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.drop_codes%rowtype;
begin
  select * into v_row
    from public.drop_codes
   where lower(code) = lower(trim(p_code))
   for update;

  if not found then
    return json_build_object('success', false, 'error', 'not_found');
  end if;

  if v_row.used then
    return json_build_object('success', false, 'error', 'already_redeemed');
  end if;

  update public.drop_codes
     set used = true, used_at = now()
   where id = v_row.id
     and used = false;

  if not found then
    return json_build_object('success', false, 'error', 'already_redeemed');
  end if;

  return json_build_object('success', true);
end;
$$;

revoke all on function public.redeem_code from public;
grant execute on function public.redeem_code to anon;

-- Seed active codes (add any community codes here; each can be used once, ever).
insert into public.drop_codes (code)
values ('DROP-M-1'), ('KOKOS-LOSINKA'), ('MMM-MMM1'), ('MOSIKO-DROP-1001')
on conflict (code) do nothing;

-- Reset/activate a specific code back to a fresh, unused state.
-- Safe to re-run as often as needed: inserts the row if missing, or clears the
-- used flag if the code was previously redeemed. Point it at the code you want
-- to hand out or test right now.
insert into public.drop_codes (code)
values ('MOSIKO-DROP-1001')
on conflict (code) do update
  set used = false, used_at = null;