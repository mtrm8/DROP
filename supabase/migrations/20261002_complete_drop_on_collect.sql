-- Run after 20260930_active_drop_codes.sql. A prize is prepared once when the
-- player activates the drop, but the code is consumed only upon collection.
begin;

-- Consuming a code directly through PostgREST would bypass prize completion.
-- Keep read access to active codes, but permit writes only via SECURITY DEFINER.
drop policy if exists "Public can consume active drop codes" on public.drop_codes;
revoke update (used) on public.drop_codes from anon, authenticated;

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

  select c.ctid as row_tid, c.code, c.drop_content, c.prize_id into v_row
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

  -- Reuse an already-prepared prize on retries; activation cannot re-roll it.
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
     where ctid = v_row.row_tid and is_active is true and used is false;
    if not found then raise exception 'code_not_available'; end if;
  end if;

  return json_build_object(
    'success', true, 'prize_id', v_prize.id, 'prize_name', v_prize.name,
    'amount', v_prize.amount, 'chance', public.drop_prize_chance(v_prize.id),
    'rarity', v_prize.rarity, 'icon', v_prize.icon, 'drop_content', v_row.drop_content
  );
end;
$$;

-- Idempotent: if the response is lost, retrying with the same prize retrieves
-- the committed result. A different prize ID can never replace the assignment.
create or replace function public.complete_drop(p_code text, p_prize_id text)
returns json
language plpgsql
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

  select c.ctid as row_tid, c.used, c.used_at, c.prize_id,
         c.prize_rolled_at, c.drop_content into v_row
    from public.drop_codes c
   where lower(trim(c.code)) = lower(trim(p_code)) and c.is_active is true
   order by c.used asc, c.created_at asc, c.ctid asc
   limit 1 for update;
  if not found then
    return json_build_object('success', false, 'error', 'not_found');
  end if;
  if v_row.prize_id is distinct from p_prize_id or v_row.prize_rolled_at is null then
    return json_build_object('success', false, 'error', 'prize_mismatch');
  end if;
  if v_row.used and (v_row.used_at is null or v_row.prize_rolled_at < v_row.used_at) then
    return json_build_object('success', false, 'error', 'already_redeemed');
  end if;

  select * into v_prize from public.drop_prizes
   where id = v_row.prize_id and amount >= 50;
  if not found then raise exception 'prize_not_available'; end if;

  if not v_row.used then
    update public.drop_codes
       set used = true, used_at = now(), prize_rolled_at = now()
     where ctid = v_row.row_tid and is_active is true and used is false
       and prize_id = p_prize_id;
    if not found then raise exception 'code_not_available'; end if;
  end if;

  return json_build_object(
    'success', true, 'prize_id', v_prize.id, 'prize_name', v_prize.name,
    'amount', v_prize.amount, 'chance', public.drop_prize_chance(v_prize.id),
    'rarity', v_prize.rarity, 'icon', v_prize.icon, 'drop_content', v_row.drop_content
  );
end;
$$;

-- Allow an interrupted, prepared (still unused) drop to resume its exact prize.
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
   where lower(trim(c.code)) = lower(trim(p_code)) and c.is_active is true
     and c.prize_rolled_at is not null
     and (c.used is false or c.prize_rolled_at >= c.used_at)
   order by c.used asc, c.created_at asc
   limit 1;
$$;

revoke all on function public.redeem_code(text) from public;
revoke all on function public.complete_drop(text, text) from public;
revoke all on function public.get_drop(text) from public;
grant execute on function public.redeem_code(text) to anon, authenticated, service_role;
grant execute on function public.complete_drop(text, text) to anon, authenticated, service_role;
grant execute on function public.get_drop(text) to anon, authenticated, service_role;

commit;
