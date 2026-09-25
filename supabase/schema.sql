-- Supabase setup for true one-time MOSHA DROP codes.
-- Run this once in the Supabase SQL editor, then set these env vars:
--   NEXT_PUBLIC_SUPABASE_URL
--   NEXT_PUBLIC_SUPABASE_ANON_KEY
-- The RPC is sealed with SECURITY DEFINER + RLS so anonymous clients can only
-- attempt a redeem (never read code hashes or other rows). atomic single-use
-- is enforced by the UPDATE ... WHERE used = false guard inside a transaction
-- (the WHERE clause makes concurrent redeems safe: exactly one wins).
--
-- IMPORTANT: if roll_prize / get_prize already exist with a DIFFERENT return
-- type, `create or replace` cannot change it — drop them first:
--   drop function if exists public.roll_prize(text);
--   drop function if exists public.get_prize(text);
-- (Those functions must accept a redeemed code: by the time a prize is rolled
-- the code is already used=true — that is the entire point of a single-use code.
-- A version that rejects used codes burns the code and then fails the roll.)

create table if not exists public.drop_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.drop_codes enable row level security;

-- Case-insensitive lookups mean 'ADIR-NEW-2026' and 'adir-new-2026' can both
-- exist (the UNIQUE constraint is case-sensitive). Two rows for one code used
-- to make resets look ignored, because the RPC matched the stale used row
-- first. Keep one row per code (prefer an unused one), then forbid duplicates.
delete from public.drop_codes
 where id in (
   select id from (
     select id,
            row_number() over (
              partition by lower(code)
              order by used asc nulls first, created_at asc, id asc
            ) as rn
       from public.drop_codes
   ) t
   where t.rn > 1
 );

create unique index if not exists drop_codes_code_lower_key
  on public.drop_codes (lower(code));

-- Prize assignment columns (idempotent upgrades for existing installs).
alter table public.drop_codes add column if not exists prize_id text;
alter table public.drop_codes add column if not exists prize_rolled_at timestamptz;

-- Cash prize pool. The real weighted roll happens here (roll_prize), never in
-- the browser. Weights are relative to each other and this seed sums to 10000,
-- so the real hit chance of a tier is weight / 10000 — sub-1% odds are
-- expressible, which is what makes the top tiers genuinely hard to hit.
create table if not exists public.drop_prizes (
  id text primary key,
  name text not null,
  amount integer not null,
  chance text not null,
  weight numeric not null check (weight > 0),
  rarity text not null,
  icon text not null
);

alter table public.drop_prizes enable row level security;

-- Rarity curve: the everyday tiers carry the volume, and high tiers are
-- genuinely hard to hit (exponentially rarer drop rates).
insert into public.drop_prizes (id, name, amount, chance, weight, rarity, icon) values
  ('cash-20',  '20 ₪',   20,  '39%',   3900, 'common',     '💵'),
  ('cash-30',  '30 ₪',   30,  '25%',   2500, 'common',     '💵'),
  ('cash-50',  '50 ₪',   50,  '16%',   1600, 'uncommon',   '💰'),
  ('cash-100', '100 ₪', 100,  '10%',   1000, 'rare',       '💰'),
  ('cash-200', '200 ₪', 200,  '5%',     500, 'classified', '💎'),
  ('cash-350', '350 ₪', 350,  '2%',     200, 'covert',     '💎'),
  ('cash-500', '500 ₪', 500,  '0.8%',    80, 'special',    '🔥'),
  ('cash-1000','1000 ₪',1000, '0.2%',    20, 'special',    '👑')
on conflict (id) do update set
  name = excluded.name,
  amount = excluded.amount,
  chance = excluded.chance,
  weight = excluded.weight,
  rarity = excluded.rarity,
  icon = excluded.icon;

-- The single source of truth for displayed odds: probability derived from the
-- live weights, so the number shown on a card can never drift from the roll.
create or replace view public.drop_prize_odds as
  select p.id,
         p.name,
         p.amount,
         p.weight,
         p.rarity,
         p.icon,
         round(100.0 * p.weight / nullif(sum(p.weight) over (), 0), 2) as chance_pct
    from public.drop_prizes p;

-- Formats the derived probability for display: 42 -> "42%", 3.3 -> "3.3%",
-- 0.4 -> "0.4%". Both prize RPCs return this, never a hand-written label.
create or replace function public.drop_prize_chance(p_id text)
returns text
language sql
stable
set search_path = public
as $$
  select case
           when o.chance_pct = trunc(o.chance_pct)
             then trunc(o.chance_pct)::integer::text
           else rtrim(rtrim(o.chance_pct::text, '0'), '.')
         end || '%'
    from public.drop_prize_odds o
   where o.id = p_id;
$$;

-- Install-time guard: the seeded labels must match the weights they claim, and
-- the pool must stay a proper distribution. A mismatch fails loudly instead of
-- quietly promising odds the roll does not honour.
do $$
declare
  v_total numeric;
  v_bad text;
begin
  select sum(weight) into v_total from public.drop_prizes;
  if v_total is null or v_total <= 0 then
    raise exception 'drop_prizes is empty';
  end if;

  select string_agg(format('%s claims %s but its real odds are %s',
                          id, chance, public.drop_prize_chance(id)), '; ')
    into v_bad
    from public.drop_prize_odds
   where chance <> public.drop_prize_chance(id);

  if v_bad is not null then
    raise exception 'drop_prize_odds mismatch: %', v_bad;
  end if;
end;
$$;

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
   order by used asc nulls first, created_at asc, id asc
   limit 1
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
   order by used asc nulls first, created_at asc, id asc
   limit 1
   for update;

  if not found or not v_code.used then
    raise exception 'code_not_redeemed';
  end if;

  -- The stored prize counts only if it belongs to the CURRENT redemption. If a
  -- code was reset (used_at bumped on the next redeem) and re-redeemed, the old
  -- prize is stale and gets rolled fresh — so "reset the code" really resets
  -- the whole drop instead of replaying the previous amount. A prize_id that no
  -- longer exists in the pool is treated as stale too, so this can never
  -- return a row of NULLs.
  if v_code.prize_id is not null
     and v_code.prize_rolled_at is not null
     and v_code.used_at is not null
     and v_code.prize_rolled_at >= v_code.used_at then
    select * into v_prize
      from public.drop_prizes
     where id = v_code.prize_id;
  end if;

  if v_prize.id is null then
    select * into v_prize
      from public.drop_prizes
     order by -ln(random()) / greatest(weight::double precision, 0.0001)
     limit 1;

    if not found then
      raise exception 'prize_pool_empty';
    end if;

    update public.drop_codes
       set prize_id = v_prize.id,
           prize_rolled_at = now()
     where id = v_code.id;
  end if;

  return query
    select v_prize.id, v_prize.name, v_prize.amount,
           public.drop_prize_chance(v_prize.id), v_prize.rarity, v_prize.icon;
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
  select p.id, p.name, p.amount, public.drop_prize_chance(p.id), p.rarity, p.icon
    from public.drop_codes c
    join public.drop_prizes p on p.id = c.prize_id
   where lower(c.code) = lower(trim(p_code))
     and c.used = true
   order by c.used_at desc nulls last, c.created_at asc
   limit 1;
$$;

-- Read-only diagnostics: exact stored state of a code (never burns anything),
-- so a reset can be verified without redeeming. Returns the row as stored, the
-- live used/prize flags and a flag telling you when several case-variants of
-- the same code exist (the classic "I reset it but it says used" cause).
create or replace function public.code_status(p_code text)
returns json
language sql
security definer
set search_path = public
as $$
  with matches as (
    select * from public.drop_codes
     where lower(code) = lower(trim(p_code))
     order by used asc nulls first, created_at asc, id asc
  ), target as (
    select * from matches limit 1
  )
  select json_build_object(
    'exists', (select count(*) > 0 from matches),
    'matches', (select count(*) from matches),
    'code', (select code from target),
    'used', (select used from target),
    'used_at', (select used_at from target),
    'prize_id', (select prize_id from target),
    'prize_rolled_at', (select prize_rolled_at from target)
  );
$$;

revoke all on function public.roll_prize(text) from public;
grant execute on function public.roll_prize(text) to anon;

revoke all on function public.get_prize(text) from public;
grant execute on function public.get_prize(text) to anon;

revoke all on function public.code_status(text) from public;
grant execute on function public.code_status(text) to anon;

-- Seed active codes (add any community codes here; each can be used once, ever).
insert into public.drop_codes (code)
values ('DROP-M-1'), ('KOKOS-LOSINKA'), ('MMM-MMM1'), ('MOSIKO-DROP-1001'), ('RONEN-DROP-1')
on conflict (code) do nothing;

-- Reset/activate a specific code back to a fresh, unused state.
-- Safe to re-run as often as needed: inserts the row if missing, or clears the
-- used flag AND any previous prize if the code was already redeemed — so the
-- next test is a completely fresh drop. Point it at the code you want to hand
-- out or test right now.
insert into public.drop_codes (code)
values ('RONEN-DROP-1')
on conflict (code) do update
  set used = false, used_at = null, prize_id = null, prize_rolled_at = null;