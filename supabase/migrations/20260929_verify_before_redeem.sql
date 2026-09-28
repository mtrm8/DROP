-- Apply after 20260927_atomic_drop_content.sql on existing Supabase projects.
-- Code entry is read-only; activation atomically assigns a prize and uses the
-- code in the same transaction. This also replaces legacy redeem_code RPCs
-- that returned only {"success":true} after consuming a code.
begin;

create or replace function public.verify_drop_code(p_code text)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object('status', case
    when nullif(trim(p_code), '') is null then 'invalid'
    when exists (select 1 from public.drop_codes where lower(code) = lower(trim(p_code)) and used = false) then 'valid'
    when exists (select 1 from public.drop_codes where lower(code) = lower(trim(p_code))) then 'already_used'
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

  select c.ctid as row_tid, c.code, c.used, c.drop_content into v_row
    from public.drop_codes c
   where lower(c.code) = lower(trim(p_code))
   order by c.used asc, c.created_at asc, c.ctid asc
   limit 1 for update;
  if not found then
    return json_build_object('success', false, 'error', 'not_found');
  end if;
  if v_row.used then
    return json_build_object('success', false, 'error', 'already_redeemed');
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
   where ctid = v_row.row_tid and used = false;
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

revoke all on function public.verify_drop_code(text) from public;
revoke all on function public.redeem_code(text) from public;
revoke all on function public.get_drop(text) from public;
grant execute on function public.verify_drop_code(text) to anon, authenticated, service_role;
grant execute on function public.redeem_code(text) to anon, authenticated, service_role;
grant execute on function public.get_drop(text) to anon, authenticated, service_role;

commit;
