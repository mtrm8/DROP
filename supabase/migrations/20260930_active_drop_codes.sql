-- Apply after 20260927_atomic_drop_content.sql (and 20260928 / 20260929
-- when applicable). No code is consumed by the validation RPC.
begin;

alter table public.drop_codes add column if not exists is_active boolean default true;
update public.drop_codes set is_active = true where is_active is null;
alter table public.drop_codes alter column is_active set default true;
alter table public.drop_codes alter column is_active set not null;

-- SECURITY DEFINER allows an anonymous visitor to check exactly one code
-- without granting SELECT access to the private drop_codes table.
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

-- Repeat the same active/unused check under a row lock on activation. Assign
-- the prize before committing used=true, so any failure leaves the code unused.
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

revoke all on function public.verify_drop_code(text) from public;
revoke all on function public.redeem_code(text) from public;
grant execute on function public.verify_drop_code(text) to anon, authenticated, service_role;
grant execute on function public.redeem_code(text) to anon, authenticated, service_role;

commit;
