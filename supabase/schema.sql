-- Supabase setup for reusable MOSHA DROP codes.
-- Run this once in the Supabase SQL editor, then set these env vars:
--   NEXT_PUBLIC_SUPABASE_URL
--   NEXT_PUBLIC_SUPABASE_ANON_KEY
-- Public clients may read active codes. Prize RPCs use SECURITY DEFINER + RLS;
-- preparation stores a prize once, while verification and collection are read-only.
-- Codes remain reusable while is_active is true, regardless of legacy used flags.
--
-- IMPORTANT: if roll_prize / get_prize already exist with a DIFFERENT return
-- type, `create or replace` cannot change it — drop them first:
--   drop function if exists public.roll_prize(text);
--   drop function if exists public.get_prize(text);

create table if not exists public.drop_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_active boolean not null default true,
  used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.drop_codes enable row level security;
alter table public.drop_codes add column if not exists is_active boolean default true;
update public.drop_codes set is_active = true where is_active is null;
alter table public.drop_codes alter column is_active set default true;
alter table public.drop_codes alter column is_active set not null;

drop policy if exists "Allow anon and authenticated select on drop_codes" on public.drop_codes;
drop policy if exists "Allow anon and authenticated insert on drop_codes" on public.drop_codes;
drop policy if exists "Allow anon and authenticated update on drop_codes" on public.drop_codes;

-- Anonymous clients can select active codes; prize assignment uses RPCs.

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
alter table public.drop_codes add column if not exists drop_content jsonb not null default '{}'::jsonb;

-- Cash prize pool. The real weighted roll happens here (roll_prize), never in
-- the browser. All assigned and future prizes must be at least 50₪.
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

drop policy if exists "Allow anon and authenticated select on drop_prizes" on public.drop_prizes;
create policy "Allow anon and authenticated select on drop_prizes" on public.drop_prizes for select using (true);

-- Rarity curve: the everyday tiers carry the volume, and high tiers are
-- genuinely hard to hit (exponentially rarer drop rates).
insert into public.drop_prizes (id, name, amount, chance, weight, rarity, icon) values
  ('cash-50',   '50 ₪',   50,   '48.48%', 1600, 'uncommon',   '💰'),
  ('cash-100',  '100 ₪',  100,  '30.30%', 1000, 'rare',       '💸'),
  ('cash-200',  '200 ₪',  200,  '15.15%',  500, 'classified', '💎'),
  ('cash-350',  '350 ₪',  350,  '4.55%',   150, 'covert',     '💎'),
  ('cash-500',  '500 ₪',  500,  '1.52%',    50, 'special',    '🔥')
on conflict (id) do update set
  name = excluded.name,
  amount = excluded.amount,
  chance = excluded.chance,
  weight = excluded.weight,
  rarity = excluded.rarity,
  icon = excluded.icon;

-- Honor already redeemed low-tier codes with the new 50₪ minimum rather than
-- clearing their prize and leaving their used code with nothing to display.
update public.drop_codes
   set prize_id = 'cash-50', prize_rolled_at = coalesce(prize_rolled_at, used_at, now())
 where prize_id in (select id from public.drop_prizes where amount < 50)
    or prize_id in ('cash-20', 'cash-30');
delete from public.drop_prizes where amount < 50 or id in ('cash-20', 'cash-30');

alter table public.drop_prizes drop constraint if exists drop_prizes_min_amount;
alter table public.drop_prizes add constraint drop_prizes_min_amount check (amount >= 50);

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
    from public.drop_prizes p
   where p.amount >= 50;

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

update public.drop_prizes
   set chance = public.drop_prize_chance(id)
 where id is not null and amount >= 50 and weight > 0;

-- Install-time guard: the pool must be populated and contain no prize below 50₪.
do $$
declare
  v_total numeric;
  v_bad text;
begin
  select sum(weight) into v_total from public.drop_prizes;
  if v_total is null or v_total <= 0 then
    raise exception 'drop_prizes is empty';
  end if;
  if exists (select 1 from public.drop_prizes where amount < 50) then
    raise exception 'prize below 50 remains in drop_prizes';
  end if;

  select string_agg(format('%s claims %s but its real odds are %s',
                          p.id, p.chance, public.drop_prize_chance(p.id)), '; ')
    into v_bad
    from public.drop_prize_odds o
    join public.drop_prizes p on p.id = o.id
   where p.chance <> public.drop_prize_chance(p.id);

  if v_bad is not null then
    raise exception 'drop_prize_odds mismatch: %', v_bad;
  end if;
end;
$$;

-- Legacy prize endpoint: active codes can reuse their stored prize indefinitely.
create or replace function public.roll_prize(p_code text)
returns table (prize_id text, prize_name text, amount integer, chance text, rarity text, icon text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  v_result := public.redeem_code(p_code);
  if not coalesce((v_result->>'success')::boolean, false) then
    raise exception 'code_not_available';
  end if;
  return query select v_result->>'prize_id', v_result->>'prize_name',
    (v_result->>'amount')::integer, v_result->>'chance', v_result->>'rarity', v_result->>'icon';
end;
$$;

-- Read-only access to an active code's existing prize.
create or replace function public.get_prize(p_code text)
returns table (prize_id text, prize_name text, amount integer, chance text, rarity text, icon text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.amount, public.drop_prize_chance(p.id), p.rarity, p.icon
    from public.drop_codes c
     join public.drop_prizes p on p.id = c.prize_id and p.amount >= 50
   where lower(trim(c.code)) = lower(trim(p_code)) and c.is_active is true
   order by c.created_at asc
   limit 1;
 $$;

-- Compatibility verification RPC is read-only; the frontend uses SELECT directly.
create or replace function public.verify_drop_code(p_code text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object('status', case
    when nullif(trim(p_code), '') is null then 'invalid'
    when exists (select 1 from public.drop_codes
                  where lower(trim(code)) = lower(trim(p_code)) and is_active is true) then 'valid'
    else 'invalid'
  end);
$$;

-- Prepare a prize once without consuming or deactivating the reusable code.
create or replace function public.redeem_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.drop_codes%rowtype;
  v_prize public.drop_prizes%rowtype;
begin
  if nullif(trim(p_code), '') is null then
    return json_build_object('success', false, 'error', 'not_found');
  end if;

  select * into v_row from public.drop_codes
   where lower(trim(code)) = lower(trim(p_code))
     and is_active is true
   limit 1 for update;
  if not found then
    return json_build_object('success', false, 'error', 'not_found');
  end if;

  if v_row.prize_id is not null then
    select * into v_prize from public.drop_prizes
     where id = v_row.prize_id and amount >= 50;
  end if;
  if v_prize.id is null then
    select * into v_prize from public.drop_prizes
     where id is not null and name is not null and amount >= 50 and weight > 0
     order by -ln(greatest(random(), 1e-12)) / weight::double precision
     limit 1;
    if not found then raise exception 'prize_pool_empty'; end if;
    update public.drop_codes
       set prize_id = v_prize.id, prize_rolled_at = now()
     where id = v_row.id and is_active is true;
    if not found then raise exception 'code_not_available'; end if;
  end if;
  return json_build_object(
    'success', true, 'prize_id', v_prize.id,
    'prize_name', v_prize.name, 'amount', v_prize.amount,
    'chance', public.drop_prize_chance(v_prize.id),
    'rarity', v_prize.rarity, 'icon', v_prize.icon,
    'drop_content', v_row.drop_content
  );
end;
$$;

-- Resume only an already-assigned prize; never re-roll on a read.
create or replace function public.get_drop(p_code text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'prize_id', p.id, 'prize_name', p.name, 'amount', p.amount,
    'chance', public.drop_prize_chance(p.id), 'rarity', p.rarity,
    'icon', p.icon, 'drop_content', c.drop_content
  )
    from public.drop_codes c
    join public.drop_prizes p on p.id = c.prize_id and p.amount >= 50
    where lower(trim(c.code)) = lower(trim(p_code)) and c.is_active is true
    order by c.created_at asc
   limit 1;
 $$;

-- Collection confirms the assigned prize without writing to drop_codes.
create or replace function public.complete_drop(p_code text, p_prize_id text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.drop_codes%rowtype;
  v_prize public.drop_prizes%rowtype;
begin
  if nullif(trim(p_code), '') is null or nullif(trim(p_prize_id), '') is null then
    return json_build_object('success', false, 'error', 'not_found');
  end if;
  select * into v_row from public.drop_codes
   where lower(trim(code)) = lower(trim(p_code)) and is_active is true
   order by created_at asc, id asc
    limit 1;
  if not found then return json_build_object('success', false, 'error', 'not_found'); end if;
  if v_row.prize_id is distinct from p_prize_id then
    return json_build_object('success', false, 'error', 'prize_mismatch');
  end if;
  select * into v_prize from public.drop_prizes
   where id = v_row.prize_id and amount >= 50;
  if not found then raise exception 'prize_not_available'; end if;
  return json_build_object(
    'success', true, 'prize_id', v_prize.id, 'prize_name', v_prize.name,
    'amount', v_prize.amount, 'chance', public.drop_prize_chance(v_prize.id),
    'rarity', v_prize.rarity, 'icon', v_prize.icon, 'drop_content', v_row.drop_content
  );
end;
$$;

revoke all on function public.complete_drop(text, text) from public;
grant execute on function public.complete_drop(text, text) to anon, authenticated, service_role;

revoke all on function public.get_drop(text) from public;
grant execute on function public.get_drop(text) to anon, authenticated, service_role;
revoke all on function public.verify_drop_code(text) from public;
grant execute on function public.verify_drop_code(text) to anon, authenticated, service_role;

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
grant execute on function public.roll_prize(text) to anon, authenticated, service_role;

revoke all on function public.get_prize(text) from public;
grant execute on function public.get_prize(text) to anon, authenticated, service_role;

revoke all on function public.code_status(text) from public;
grant execute on function public.code_status(text) to anon, authenticated, service_role;

drop policy if exists "Public can view active drop codes" on public.drop_codes;
create policy "Public can view active drop codes" on public.drop_codes
  for select to anon, authenticated using (is_active is true);
drop policy if exists "Public can consume active drop codes" on public.drop_codes;
revoke all on public.drop_codes from public, anon, authenticated;
revoke update (used) on public.drop_codes from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select (code, is_active, used) on public.drop_codes to anon, authenticated;
grant select, insert, update on public.drop_codes to service_role;
grant select on public.drop_prizes to anon, authenticated, service_role;
grant select on public.drop_prize_odds to anon, authenticated, service_role;

revoke all on function public.redeem_code(text) from public;
grant execute on function public.redeem_code(text) to anon, authenticated, service_role;
grant execute on function public.drop_prize_chance(text) to anon, authenticated, service_role;

-- Seed reusable community codes. Administrators retire them via is_active=false.
insert into public.drop_codes (code)
values ('DROP-M-1'), ('KOKOS-LOSINKA'), ('MMM-MMM1'), ('MOSIKO-DROP-1001'), ('RONEN-DROP-1'), ('ADIR-DROP-2026'), ('MOSIKO-COIN-2026')
on conflict (code) do nothing;
