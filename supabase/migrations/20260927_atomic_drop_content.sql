-- Standalone, repeatable setup for the Supabase drop flow. Run in the SQL editor.
-- Existing codes, usage history, content, and prize assignments are preserved.
begin;

create table if not exists public.drop_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_active boolean not null default true,
  used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  prize_id text,
  prize_rolled_at timestamptz,
  drop_content jsonb not null default '{}'::jsonb
);

-- CREATE TABLE IF NOT EXISTS leaves an existing legacy table untouched.
-- Legacy id columns may be integer/serial; only NEW id columns get a UUID default.
-- The functions below do not depend on the type (or presence) of that id.
alter table public.drop_codes add column if not exists id uuid default gen_random_uuid();
alter table public.drop_codes add column if not exists code text;
alter table public.drop_codes add column if not exists is_active boolean default true;
alter table public.drop_codes add column if not exists used boolean;
alter table public.drop_codes add column if not exists used_at timestamptz;
alter table public.drop_codes add column if not exists created_at timestamptz default now();
alter table public.drop_codes add column if not exists prize_id text;
alter table public.drop_codes add column if not exists prize_rolled_at timestamptz;
alter table public.drop_codes add column if not exists drop_content jsonb not null default '{}'::jsonb;

-- When adding `used` to a legacy table, preserve its redemption history.
update public.drop_codes
   set used = (used_at is not null or prize_id is not null)
 where used is null;
update public.drop_codes set is_active = true where is_active is null;
update public.drop_codes set created_at = now() where created_at is null;
update public.drop_codes set drop_content = '{}'::jsonb where drop_content is null;
alter table public.drop_codes alter column used set default false;
alter table public.drop_codes alter column used set not null;
alter table public.drop_codes alter column is_active set default true;
alter table public.drop_codes alter column is_active set not null;
alter table public.drop_codes alter column created_at set default now();
alter table public.drop_codes alter column drop_content set default '{}'::jsonb;

create table if not exists public.drop_prizes (
  id text primary key,
  name text not null,
  amount integer not null,
  chance text not null,
  weight numeric not null check (weight > 0),
  rarity text not null,
  icon text not null
);

alter table public.drop_prizes add column if not exists id text;
alter table public.drop_prizes add column if not exists name text;
alter table public.drop_prizes add column if not exists amount integer;
alter table public.drop_prizes add column if not exists chance text;
alter table public.drop_prizes add column if not exists weight numeric;
alter table public.drop_prizes add column if not exists rarity text;
alter table public.drop_prizes add column if not exists icon text;

-- Defaults for a new installation. Never overwrite an existing configured pool.
insert into public.drop_prizes (id, name, amount, chance, weight, rarity, icon)
select sample.* from (values
  ('cash-50',  '50 ₪',  50, '48.48%', 1600, 'uncommon',   '💰'),
  ('cash-100', '100 ₪', 100, '30.30%', 1000, 'rare',       '💸'),
  ('cash-200', '200 ₪', 200, '15.15%',  500, 'classified', '💎'),
  ('cash-350', '350 ₪', 350, '4.55%',   150, 'covert',     '💎'),
  ('cash-500', '500 ₪', 500, '1.52%',    50, 'special',    '🔥')
) as sample(id, name, amount, chance, weight, rarity, icon)
where not exists (select 1 from public.drop_prizes existing where existing.id = sample.id)
on conflict do nothing;

-- Complete any partially populated sample rows without changing configured values.
update public.drop_prizes p
   set name = coalesce(p.name, sample.name),
       amount = coalesce(p.amount, sample.amount),
       chance = coalesce(p.chance, sample.chance),
       weight = coalesce(p.weight, sample.weight),
       rarity = coalesce(p.rarity, sample.rarity),
       icon = coalesce(p.icon, sample.icon)
  from (values
    ('cash-50',  '50 ₪',  50, '48.48%', 1600, 'uncommon',   '💰'),
    ('cash-100', '100 ₪', 100, '30.30%', 1000, 'rare',       '💸'),
    ('cash-200', '200 ₪', 200, '15.15%',  500, 'classified', '💎'),
    ('cash-350', '350 ₪', 350, '4.55%',   150, 'covert',     '💎'),
    ('cash-500', '500 ₪', 500, '1.52%',    50, 'special',    '🔥')
  ) as sample(id, name, amount, chance, weight, rarity, icon)
 where p.id = sample.id;

update public.drop_prizes set name = '50 ₪', amount = 50 where id = 'cash-50';
update public.drop_codes
   set prize_id = 'cash-50', prize_rolled_at = coalesce(prize_rolled_at, used_at, now())
 where prize_id in (select id from public.drop_prizes where amount < 50)
    or prize_id in ('cash-20', 'cash-30');
delete from public.drop_prizes where amount < 50 or id in ('cash-20', 'cash-30');
alter table public.drop_prizes drop constraint if exists drop_prizes_min_amount;
alter table public.drop_prizes add constraint drop_prizes_min_amount check (amount >= 50);

-- Provision example community codes without reactivating previously used codes.
insert into public.drop_codes (code)
select sample.code
  from (values
    ('DROP-M-1'), ('KOKOS-LOSINKA'), ('MMM-MMM1'),
    ('MOSIKO-DROP-1001'), ('RONEN-DROP-1'),
    ('ADIR-DROP-2026'), ('MOSIKO-COIN-2026')
  ) as sample(code)
 where not exists (
   select 1 from public.drop_codes existing
    where lower(existing.code) = lower(sample.code)
 )
on conflict do nothing;

-- Return odds derived from the live pool weights, including custom prize tiers.
create or replace function public.drop_prize_chance(p_id text)
returns text
language sql
stable
set search_path = public
as $$
  select case when odds.pct = trunc(odds.pct)
    then trunc(odds.pct)::integer::text
    else rtrim(rtrim(odds.pct::text, '0'), '.')
  end || '%'
  from (
    select round(100.0 * p.weight / nullif((select sum(weight) from public.drop_prizes
                                           where id is not null and name is not null
                                             and amount >= 50 and weight > 0), 0), 2) as pct
    from public.drop_prizes p where p.id = p_id and p.amount >= 50 and p.weight > 0
  ) odds;
$$;

update public.drop_prizes
   set chance = public.drop_prize_chance(id)
 where id is not null and amount >= 50 and weight > 0;

-- The row lock serializes competing redeems. The prize and code update commit
-- together; an empty pool or any other SQL error rolls the whole attempt back.
create or replace function public.verify_drop_code(p_code text)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object('status', case
    when nullif(trim(p_code), '') is null then 'invalid'
    when exists (select 1 from public.drop_codes
                  where lower(trim(code)) = lower(trim(p_code)) and is_active is true and used is false) then 'valid'
    when exists (select 1 from public.drop_codes
                  where lower(trim(code)) = lower(trim(p_code)) and is_active is true and used is true) then 'already_used'
    else 'invalid'
  end);
$$;

create or replace function public.redeem_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_prize public.drop_prizes%rowtype;
begin
  if nullif(trim(p_code), '') is null then
    return json_build_object('success', false, 'error', 'not_found');
  end if;

  select c.ctid as row_tid, c.code, c.drop_content into v_row
    from public.drop_codes c
   where lower(trim(c.code)) = lower(trim(p_code))
     and c.is_active is true and c.used is false
   order by c.created_at asc, c.ctid asc
   limit 1 for update;
  if not found then
    if exists (select 1 from public.drop_codes
                where lower(trim(code)) = lower(trim(p_code)) and is_active is true and used is true) then
      return json_build_object('success', false, 'error', 'already_redeemed');
    end if;
    return json_build_object('success', false, 'error', 'not_found');
  end if;

  select * into v_prize from public.drop_prizes
   where id is not null and name is not null and amount >= 50 and weight > 0
   order by -ln(greatest(random(), 1e-12)) / weight::double precision
   limit 1;
  if not found then
    raise exception 'prize_pool_empty';
  end if;

  update public.drop_codes
     set used = true, used_at = now(),
         prize_id = v_prize.id, prize_rolled_at = now()
   where ctid = v_row.row_tid and is_active is true and used is false;
  if not found then
    return json_build_object('success', false, 'error', 'already_redeemed');
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

-- Read only an already assigned prize (used by the browser to resume a drop).
create or replace function public.get_drop(p_code text)
returns json
language sql
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
   where lower(c.code) = lower(trim(p_code)) and c.used = true
     and c.prize_rolled_at >= c.used_at
   order by c.used_at desc nulls last
   limit 1;
$$;

alter table public.drop_codes enable row level security;
alter table public.drop_prizes enable row level security;
drop policy if exists "Allow anon and authenticated select on drop_codes" on public.drop_codes;
drop policy if exists "Allow anon and authenticated insert on drop_codes" on public.drop_codes;
drop policy if exists "Allow anon and authenticated update on drop_codes" on public.drop_codes;
drop policy if exists "Service role manages drop codes" on public.drop_codes;
create policy "Service role manages drop codes" on public.drop_codes
  for all to service_role using (true) with check (true);
drop policy if exists "Service role manages drop prizes" on public.drop_prizes;
create policy "Service role manages drop prizes" on public.drop_prizes
  for all to service_role using (true) with check (true);
drop policy if exists "Public can view active drop codes" on public.drop_codes;
drop policy if exists "Public can consume active drop codes" on public.drop_codes;
create policy "Public can view active drop codes" on public.drop_codes
  for select to anon, authenticated using (is_active is true);
create policy "Public can consume active drop codes" on public.drop_codes
  for update to anon, authenticated
  using (is_active is true and used is false)
  with check (is_active is true and used is true);
-- Only the used flag can be written directly. Prize assignment uses the RPC.
revoke all on public.drop_codes from anon, authenticated;
grant select (code, is_active, used) on public.drop_codes to anon, authenticated;
grant update (used) on public.drop_codes to anon, authenticated;
revoke all on public.drop_prizes from anon, authenticated;
grant select, insert, update on public.drop_codes to service_role;
grant select, insert, update on public.drop_prizes to service_role;
revoke all on function public.redeem_code(text) from public;
revoke all on function public.get_drop(text) from public;
revoke all on function public.verify_drop_code(text) from public;
grant execute on function public.redeem_code(text) to anon, authenticated, service_role;
grant execute on function public.get_drop(text) to anon, authenticated, service_role;
grant execute on function public.verify_drop_code(text) to anon, authenticated, service_role;

commit;
