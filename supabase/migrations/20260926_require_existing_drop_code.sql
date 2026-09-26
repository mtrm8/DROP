-- Only pre-issued, unused codes may be redeemed. Anonymous users cannot
-- create a new code or change its used flag through the public REST table.
begin;

drop policy if exists "Allow anon and authenticated select on drop_codes" on public.drop_codes;
drop policy if exists "Allow anon and authenticated insert on drop_codes" on public.drop_codes;
drop policy if exists "Allow anon and authenticated update on drop_codes" on public.drop_codes;
revoke select, insert, update on public.drop_codes from anon, authenticated;

create or replace function public.redeem_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.drop_codes%rowtype;
  v_trimmed text;
begin
  v_trimmed := trim(p_code);
  if v_trimmed = '' then
    return json_build_object('success', false, 'error', 'not_found');
  end if;

  select * into v_row
    from public.drop_codes
   where lower(code) = lower(v_trimmed)
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
   where id = v_row.id and used = false;

  if not found then
    return json_build_object('success', false, 'error', 'already_redeemed');
  end if;

  return json_build_object('success', true);
end;
$$;

revoke all on function public.redeem_code(text) from public;
grant execute on function public.redeem_code(text) to anon, authenticated, service_role;

commit;
