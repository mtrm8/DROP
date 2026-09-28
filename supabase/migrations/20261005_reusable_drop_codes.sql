-- Apply after the existing drop-code migrations. Codes are reusable for as long
-- as is_active is true. Historical used/used_at values are neither reset nor read
-- for eligibility. Only initial prize preparation writes prize metadata.
begin;

alter table public.drop_codes enable row level security;
drop policy if exists "Public can view active drop codes" on public.drop_codes;
create policy "Public can view active drop codes" on public.drop_codes
  for select to anon, authenticated using (is_active is true);
drop policy if exists "Public can consume active drop codes" on public.drop_codes;
revoke insert, update, delete on public.drop_codes from public, anon, authenticated;
revoke update (used) on public.drop_codes from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select (code, is_active) on public.drop_codes to anon, authenticated;

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

-- Keep one persisted prize per code so concurrent users and retries agree.
-- A previous redemption never blocks a new one or changes code visibility.
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
  select c.ctid as row_tid, c.drop_content, c.prize_id into v_row
    from public.drop_codes c
   where lower(trim(c.code)) = lower(trim(p_code)) and c.is_active is true
   order by c.created_at asc, c.ctid asc
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
     where ctid = v_row.row_tid and is_active is true;
    if not found then raise exception 'code_not_available'; end if;
  end if;

  return json_build_object(
    'success', true, 'prize_id', v_prize.id, 'prize_name', v_prize.name,
    'amount', v_prize.amount, 'chance', public.drop_prize_chance(v_prize.id),
    'rarity', v_prize.rarity, 'icon', v_prize.icon, 'drop_content', v_row.drop_content
  );
end;
$$;

-- Read-only completion: validates the winner but never consumes the code.
create or replace function public.complete_drop(p_code text, p_prize_id text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
  v_prize public.drop_prizes%rowtype;
begin
  if nullif(trim(p_code), '') is null or nullif(trim(p_prize_id), '') is null then
    return json_build_object('success', false, 'error', 'not_found');
  end if;
  select c.prize_id, c.drop_content into v_row
    from public.drop_codes c
   where lower(trim(c.code)) = lower(trim(p_code)) and c.is_active is true
   order by c.created_at asc, c.ctid asc
   limit 1;
  if not found then
    return json_build_object('success', false, 'error', 'not_found');
  end if;
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

-- Older clients must use the same active-only rule, not legacy used flags.
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

revoke all on function public.verify_drop_code(text) from public;
revoke all on function public.redeem_code(text) from public;
revoke all on function public.complete_drop(text, text) from public;
revoke all on function public.get_drop(text) from public;
revoke all on function public.roll_prize(text) from public;
revoke all on function public.get_prize(text) from public;
grant execute on function public.verify_drop_code(text) to anon, authenticated, service_role;
grant execute on function public.redeem_code(text) to anon, authenticated, service_role;
grant execute on function public.complete_drop(text, text) to anon, authenticated, service_role;
grant execute on function public.get_drop(text) to anon, authenticated, service_role;
grant execute on function public.roll_prize(text) to anon, authenticated, service_role;
grant execute on function public.get_prize(text) to anon, authenticated, service_role;

commit;
