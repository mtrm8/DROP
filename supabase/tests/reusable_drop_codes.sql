-- Run on a test database after schema.sql or the reusable-code migration.
begin;

insert into public.drop_codes (code, is_active, used, used_at, prize_id, prize_rolled_at)
values
  ('REUSABLE-TEST-NEW', true, false, null, null, null),
  ('REUSABLE-TEST-OLD', true, true, '2026-09-28', 'cash-50', '2026-09-27'),
  ('REUSABLE-TEST-INACTIVE', false, false, null, 'cash-50', '2026-09-27');

create temporary table code_before as
  select code, to_jsonb(c) as data from public.drop_codes c
   where code like 'REUSABLE-TEST-%';
create temporary table drop_results (step text, result jsonb);
grant select, insert on drop_results to anon, authenticated;

set local role anon;
do $$
begin
  if (select count(*) from public.drop_codes where code like 'REUSABLE-TEST-%') <> 2 then
    raise exception 'anon must see both active codes and no inactive code';
  end if;
  if (public.verify_drop_code('  reusable-test-old  ')->>'status') <> 'valid' then
    raise exception 'legacy used code must verify';
  end if;
  if (public.verify_drop_code('REUSABLE-TEST-INACTIVE')->>'status') <> 'invalid'
     or (public.verify_drop_code('NO-SUCH-REUSABLE-CODE')->>'status') <> 'invalid'
     or (public.verify_drop_code('   ')->>'status') <> 'invalid' then
    raise exception 'inactive, missing, and blank codes must not verify';
  end if;
  if has_column_privilege(current_user, 'public.drop_codes', 'used', 'UPDATE')
     or has_table_privilege(current_user, 'public.drop_codes', 'DELETE') then
    raise exception 'anonymous clients must not consume or delete code rows';
  end if;
end;
$$;
reset role;

do $$
begin
  if exists (select 1 from code_before b left join public.drop_codes c using (code)
              where b.data is distinct from to_jsonb(c)) then
    raise exception 'verification must not modify any code field';
  end if;
end;
$$;

set local role anon;
insert into drop_results values ('new-first', public.redeem_code('  reusable-test-new  ')::jsonb);
insert into drop_results
  select 'new-complete', public.complete_drop('REUSABLE-TEST-NEW', result->>'prize_id')::jsonb
    from drop_results where step = 'new-first';
insert into drop_results values ('new-second', public.redeem_code('REUSABLE-TEST-NEW')::jsonb);
insert into drop_results
  select 'new-complete-again', public.complete_drop('REUSABLE-TEST-NEW', result->>'prize_id')::jsonb
    from drop_results where step = 'new-second';
insert into drop_results values ('old-first', public.redeem_code('REUSABLE-TEST-OLD')::jsonb);
insert into drop_results values ('old-complete', public.complete_drop('REUSABLE-TEST-OLD', 'cash-50')::jsonb);
insert into drop_results values ('old-second', public.redeem_code('REUSABLE-TEST-OLD')::jsonb);

do $$
begin
  if exists (select 1 from drop_results where result->>'success' is distinct from 'true') then
    raise exception 'all repeated redemptions and collections must succeed';
  end if;
  if (select count(distinct result->>'prize_id') from drop_results where step like 'new-%') <> 1 then
    raise exception 'repeated redemptions must retain the assigned prize';
  end if;
  if public.get_drop('REUSABLE-TEST-OLD')->>'prize_id' is distinct from 'cash-50'
     or (select prize_id from public.get_prize('REUSABLE-TEST-OLD')) is distinct from 'cash-50'
     or (select prize_id from public.roll_prize('REUSABLE-TEST-OLD')) is distinct from 'cash-50' then
    raise exception 'legacy used timestamps must not block prize access';
  end if;
  if public.complete_drop('REUSABLE-TEST-OLD', 'cash-500')->>'error' is distinct from 'prize_mismatch' then
    raise exception 'completion must reject a different prize';
  end if;
  if public.redeem_code('REUSABLE-TEST-INACTIVE')->>'error' is distinct from 'not_found'
     or public.complete_drop('REUSABLE-TEST-INACTIVE', 'cash-50')->>'error' is distinct from 'not_found'
     or public.redeem_code('NO-SUCH-REUSABLE-CODE')->>'error' is distinct from 'not_found'
     or public.redeem_code('   ')->>'error' is distinct from 'not_found'
     or public.get_drop('REUSABLE-TEST-INACTIVE') is not null
     or exists (select 1 from public.get_prize('REUSABLE-TEST-INACTIVE')) then
    raise exception 'inactive and missing codes must not redeem or expose prizes';
  end if;
  begin
    perform public.roll_prize('REUSABLE-TEST-INACTIVE');
    raise exception 'inactive legacy roll unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> 'code_not_available' then raise; end if;
  end;
  if (select count(*) from public.drop_codes where code like 'REUSABLE-TEST-%') <> 2
     or public.verify_drop_code('REUSABLE-TEST-NEW')->>'status' is distinct from 'valid' then
    raise exception 'redemption must not hide or invalidate active codes';
  end if;
end;
$$;
reset role;

do $$
begin
  if exists (
    select 1 from code_before b left join public.drop_codes c using (code)
     where (b.data - 'prize_id' - 'prize_rolled_at')
       is distinct from (to_jsonb(c) - 'prize_id' - 'prize_rolled_at')
  ) then
    raise exception 'redemption may only prepare prize metadata, never consume/delete/deactivate codes';
  end if;
  if exists (
    select 1 from code_before b left join public.drop_codes c using (code)
     where b.code <> 'REUSABLE-TEST-NEW' and b.data is distinct from to_jsonb(c)
  ) then
    raise exception 'existing prize and inactive rows must remain completely unchanged';
  end if;
end;
$$;

-- A completed code can be used by a different public role, without any writes.
create temporary table prepared_before as
  select code, to_jsonb(c) as data from public.drop_codes c where code like 'REUSABLE-TEST-%';
set local role authenticated;
insert into drop_results values ('another-user', public.redeem_code('REUSABLE-TEST-NEW')::jsonb);
insert into drop_results
  select 'another-user-complete', public.complete_drop('REUSABLE-TEST-NEW', result->>'prize_id')::jsonb
    from drop_results where step = 'another-user';
reset role;

do $$
begin
  if exists (select 1 from drop_results where result->>'success' is distinct from 'true') then
    raise exception 'another user must be able to reuse the completed code';
  end if;
  if exists (select 1 from prepared_before b left join public.drop_codes c using (code)
              where b.data is distinct from to_jsonb(c)) then
    raise exception 'reuse and collection must leave prepared code rows unchanged';
  end if;
end;
$$;

-- Manual deactivation still takes effect after any number of redemptions.
update public.drop_codes set is_active = false where code = 'REUSABLE-TEST-NEW';
set local role anon;
do $$
begin
  if exists (select 1 from public.drop_codes where code = 'REUSABLE-TEST-NEW')
     or public.redeem_code('REUSABLE-TEST-NEW')->>'error' is distinct from 'not_found' then
    raise exception 'explicitly deactivated codes must stop working';
  end if;
end;
$$;
reset role;

rollback;
