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

-- Prize assignment columns (idempotent upgrades for existing installs).
alter table public.drop_codes add column if not exists prize_id text;
alter table public.drop_codes add column if not exists prize_rolled_at timestamptz;

-- Cash prize pool. The real weighted roll happens here (roll_prize), never in
-- the browser. Weights are relative; this seed sums to 100 so the odds column
-- equals the exact probability of hitting that amount.
create table if not exists public.drop_prizes (
  id text primary key,
  name text not null,
  amount integer not null,
  chance text not null,
  weight numeric not null,
  rarity text not null,
  icon text not null
);

alter table public.drop_prizes enable row level security;

insert into public.drop_prizes (id, name, amount, chance, weight, rarity, icon) values
  ('cash-20',  '20 ₪',   20,  '40%', 40, 'common',     'chip'),
  ('cash-30',  '30 ₪',   30,  '25%', 25, 'common',     'chip'),
  ('cash-50',  '50 ₪',   50,  '15%', 15, 'uncommon',   'stack'),
  ('cash-100', '100 ₪', 100, '12%', 12, 'rare',       'card'),
  ('cash-200', '200 ₪', 200,  '5%',  5, 'classified', 'stack'),
  ('cash-350', '350 ₪', 350,  '2%',  2, 'covert',     'king'),
  ('cash-500', '500 ₪', 500,  '1%',  1, 'special',    'king')
on conflict (id) do update set
  name = excluded.name,
  amount = excluded.amount,
  chance = excluded.chance,
  weight = excluded.weight,
  rarity = excluded.rarity,
  icon = excluded.icon;

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

-- Server-authoritative weighted cash roll. Requires a redeemed (used = true)
-- code, picks a prize with the exponential-race trick
-- (order by -ln(random()) / weight), and PERSISTS it on the code row, so the
-- amount is decided once on the server and can never be re-rolled or edited
-- by the client. Calling it again for the same code returns the same prize
-- (idempotent), which also makes retries after a network hiccup safe.
create or replace function public.roll_prize(p_code text)
returns table (prize_id text, prize_name text, amount integer, chance text, rarity text, icon text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.drop_codes%rowtype;
  v_prize public.drop_prizes%rowtype;
begin
  select * into v_code
    from public.drop_codes
   where lower(code) = lower(trim(p_code))
   for update;

  if not found or not v_code.used then
    raise exception 'code_not_redeemed';
  end if;

  if v_code.prize_id is null then
    select * into v_prize
      from public.drop_prizes
     order by -ln(random()) / greatest(weight, 0.0001)
     limit 1;

    if not found then
      raise exception 'prize_pool_empty';
    end if;

    update public.drop_codes
       set prize_id = v_prize.id,
           prize_rolled_at = now()
     where id = v_code.id;
  else
    select * into v_prize
      from public.drop_prizes
     where id = v_code.prize_id;
  end if;

  return query
    select v_prize.id, v_prize.name, v_prize.amount, v_prize.chance, v_prize.rarity, v_prize.icon;
end;
$$;

-- Read-only resume: returns a prize ONLY if it was already rolled for this
-- redeemed code. This lets a player continue an interrupted drop, without ever
-- allowing a fresh roll for an already-used code.
create or replace function public.get_prize(p_code text)
returns table (prize_id text, prize_name text, amount integer, chance text, rarity text, icon text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.name, p.amount, p.chance, p.rarity, p.icon
    from public.drop_codes c
    join public.drop_prizes p on p.id = c.prize_id
   where lower(c.code) = lower(trim(p_code))
     and c.used = true;
$$;

revoke all on function public.roll_prize(text) from public;
grant execute on function public.roll_prize(text) to anon;

revoke all on function public.get_prize(text) from public;
grant execute on function public.get_prize(text) to anon;

-- Seed active codes (add any community codes here; each can be used once, ever).
insert into public.drop_codes (code)
values ('DROP-M-1'), ('KOKOS-LOSINKA'), ('MMM-MMM1'), ('MOSIKO-DROP-1001'), ('RONEN-DROP-1')
on conflict (code) do nothing;

-- Reset/activate a specific code back to a fresh, unused state.
-- Safe to re-run as often as needed: inserts the row if missing, or clears the
-- used flag if the code was previously redeemed. Point it at the code you want
-- to hand out or test right now.
insert into public.drop_codes (code)
values ('RONEN-DROP-1')
on conflict (code) do update
  set used = false, used_at = null;