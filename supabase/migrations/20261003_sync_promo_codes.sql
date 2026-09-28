-- Run after 20261002_complete_drop_on_collect.sql and after public.promo_codes
-- exists (re-run this file if promo_codes is created later). Verification reads
-- promo_codes first while every RPC still operates on drop_codes, so a code that
-- exists only in promo_codes is mirrored into drop_codes before it can activate.
begin;

-- Reads a flag stored as boolean, text or 0/1, the same tolerant way the
-- browser reads it, so a cosmetic type difference never blocks the sync.
create or replace function public.drop_flag(p_value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when lower(coalesce(trim(p_value), '')) in ('true', 't', '1', 'yes', 'on') then true
    when lower(coalesce(trim(p_value), '')) in ('false', 'f', '0', 'no', 'off') then false
    else null
  end;
$$;

-- Copies one promo row into drop_codes: inserts it when drop_codes has no row
-- for that code, otherwise brings the control flags back in step. A consumed
-- code is never unconsumed, an already prepared prize is never cleared, and a
-- code column that exists on only one side is simply left alone.
create or replace function public.sync_promo_code(p_code text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_norm text := lower(coalesce(p_code, ''));
  v_promo text[];
  v_drop text[];
  v_targets text[] := '{}';
  v_sources text[] := '{}';
  v_sets text[] := '{}';
  v_col text;
  v_type text;
  v_guard text;
  v_sql text;
begin
  if v_norm = '' or to_regclass('public.promo_codes') is null then
    return;
  end if;
  -- The reverse sync started this change: writing back would loop.
  if pg_trigger_depth() > 1 then
    return;
  end if;

  select array_agg(c.column_name) into v_promo
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = 'promo_codes';
  select array_agg(c.column_name) into v_drop
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = 'drop_codes';
  if v_promo is null or v_drop is null
     or not ('code' = any (v_promo)) or not ('code' = any (v_drop)) then
    return;
  end if;

  v_guard := format('lower(trim(p.code::text)) = %L', v_norm);

  for v_col in
    select m from unnest(array['code','is_active','used','used_at','created_at','drop_content','prize_id']) as m
  loop
    if not (v_col = any (v_promo)) or not (v_col = any (v_drop)) then
      continue;
    end if;
    select c.data_type into v_type
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = 'promo_codes'
       and c.column_name = v_col;

    if v_col = 'code' then
      v_targets := v_targets || format('%I', v_col);
      v_sources := v_sources || format('nullif(trim(p.%I::text), '''')', v_col);
    elsif v_col in ('is_active', 'used') then
      -- Insert: unreadable flags fall back to the column default.
      v_targets := v_targets || format('%I', v_col);
      v_sources := v_sources || format('coalesce(public.drop_flag(p.%I::text), %L::boolean)',
                                       v_col, case when v_col = 'is_active' then 'true' else 'false' end);
      if v_col = 'is_active' then
        -- Update: the promo row is authoritative for activation.
        v_sets := v_sets || format(
          '%I = coalesce((select public.drop_flag(p.%I::text) from public.promo_codes p where %s), %I)',
          v_col, v_col, v_guard, v_col);
      else
        -- Update: an already consumed code stays consumed.
        v_sets := v_sets || format(
          '%I = %I or coalesce((select public.drop_flag(p.%I::text) from public.promo_codes p where %s), false)',
          v_col, v_col, v_col, v_guard);
      end if;
    elsif v_col in ('used_at', 'created_at') then
      if v_type not in ('timestamp with time zone', 'timestamp without time zone', 'date') then
        continue;
      end if;
      v_targets := v_targets || format('%I', v_col);
      v_sources := v_sources || format('p.%I::timestamptz', v_col);
      if v_col = 'used_at' then
        v_sets := v_sets || format(
          '%I = coalesce(%I, (select p.%I::timestamptz from public.promo_codes p where %s))',
          v_col, v_col, v_col, v_guard);
      end if;
    elsif v_col = 'drop_content' then
      if v_type not in ('jsonb', 'json') then
        continue;
      end if;
      v_targets := v_targets || format('%I', v_col);
      v_sources := v_sources || format('p.%I::jsonb', v_col);
      v_sets := v_sets || format(
        '%I = coalesce((select case when p.%I::jsonb is not null and p.%I::jsonb <> ''{}''::jsonb'
        || ' then p.%I::jsonb end from public.promo_codes p where %s), %I)',
        v_col, v_col, v_col, v_col, v_guard, v_col);
    elsif v_col = 'prize_id' then
      v_targets := v_targets || format('%I', v_col);
      v_sources := v_sources || format('nullif(trim(p.%I::text), '''')', v_col);
      v_sets := v_sets || format(
        '%I = coalesce((select nullif(trim(p.%I::text), '''') from public.promo_codes p where %s), %I)',
        v_col, v_col, v_guard, v_col);
    end if;
  end loop;

  if not exists (select 1 from unnest(v_targets) t where t = 'code') then
    return;
  end if;

  -- A missing drop_codes row is created first, so activation always has one.
  v_sql := format(
    'insert into public.drop_codes (%s)
     select %s
       from public.promo_codes p
      where nullif(trim(p.code::text), '''') is not null
        and not exists (select 1 from public.drop_codes d
                         where lower(trim(d.code)) = lower(trim(p.code::text)))
      on conflict do nothing',
    array_to_string(v_targets, ', '), array_to_string(v_sources, ', '));
  execute v_sql;

  if cardinality(v_sets) > 0 then
    execute format(
      'update public.drop_codes set %s where lower(trim(code)) = %L',
      array_to_string(v_sets, ', '), v_norm);
  end if;
end;
$$;

-- Once a drop is collected, promo_codes must report the code as used too,
-- otherwise verification would keep accepting a code that no longer activates.
create or replace function public.sync_drop_to_promo(p_code text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_norm text := lower(coalesce(p_code, ''));
  v_type text;
  v_expr text;
begin
  if v_norm = '' or to_regclass('public.promo_codes') is null then
    return;
  end if;
  -- The forward sync started this change: writing back would loop.
  if pg_trigger_depth() > 1 then
    return;
  end if;

  select c.data_type into v_type
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = 'promo_codes'
     and c.column_name = 'code';
  if v_type is null then
    return;
  end if;
  select c.data_type into v_type
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = 'promo_codes'
     and c.column_name = 'used';
  if v_type is null then
    return;
  end if;

  -- The value is cast to the type promo_codes actually stores.
  if v_type = 'boolean' then
    v_expr := 'd.used';
  elsif v_type in ('smallint', 'integer', 'bigint', 'numeric', 'real', 'double precision', 'money') then
    v_expr := 'case when d.used then 1 else 0 end';
  elsif v_type in ('text', 'character varying', 'character') then
    v_expr := 'd.used::text';
  else
    return;
  end if;

  execute format(
    'update public.promo_codes p
        set used = (%s)
      from public.drop_codes d
     where lower(trim(p.code::text)) = %L
       and lower(trim(d.code)) = %L
       and p.used is distinct from (%s)',
    v_expr, v_norm, v_norm, v_expr);
end;
$$;

create or replace function public.sync_promo_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.sync_promo_code(new.code::text);
  return null;
end;
$$;

create or replace function public.sync_drop_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.sync_drop_to_promo(new.code::text);
  return null;
end;
$$;

-- One-time import of codes that already live in promo_codes.
create or replace function public.sync_promo_backfill()
returns bigint
language plpgsql
set search_path = public
as $$
declare
  v_targets text[] := '{}';
  v_sources text[] := '{}';
  v_col text;
  v_type text;
  v_sql text;
  v_count bigint := 0;
begin
  if to_regclass('public.promo_codes') is null then
    return 0;
  end if;

  for v_col in
    select m from unnest(array['code','is_active','used','used_at','created_at','drop_content','prize_id']) as m
  loop
    select c.data_type into v_type
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = 'promo_codes'
       and c.column_name = v_col;
    if v_type is null then
      continue;
    end if;
    if not exists (select 1 from information_schema.columns c
                    where c.table_schema = 'public' and c.table_name = 'drop_codes'
                      and c.column_name = v_col) then
      continue;
    end if;

    if v_col = 'code' then
      v_targets := v_targets || format('%I', v_col);
      v_sources := v_sources || format('nullif(trim(p.%I::text), '''')', v_col);
    elsif v_col in ('is_active', 'used') then
      v_targets := v_targets || format('%I', v_col);
      v_sources := v_sources || format('coalesce(public.drop_flag(p.%I::text), %L::boolean)',
                                       v_col, case when v_col = 'is_active' then 'true' else 'false' end);
    elsif v_col in ('used_at', 'created_at') then
      if v_type in ('timestamp with time zone', 'timestamp without time zone', 'date') then
        v_targets := v_targets || format('%I', v_col);
        v_sources := v_sources || format('p.%I::timestamptz', v_col);
      end if;
    elsif v_col = 'drop_content' then
      if v_type in ('jsonb', 'json') then
        v_targets := v_targets || format('%I', v_col);
        v_sources := v_sources || format('p.%I::jsonb', v_col);
      end if;
    elsif v_col = 'prize_id' then
      v_targets := v_targets || format('%I', v_col);
      v_sources := v_sources || format('nullif(trim(p.%I::text), '''')', v_col);
    end if;
  end loop;

  if not exists (select 1 from unnest(v_targets) t where t = 'code') then
    return 0;
  end if;

  v_sql := format(
    'insert into public.drop_codes (%s)
     select %s
       from public.promo_codes p
      where nullif(trim(p.code::text), '''') is not null
        and not exists (select 1 from public.drop_codes d
                         where lower(trim(d.code)) = lower(trim(p.code::text)))
      on conflict do nothing',
    array_to_string(v_targets, ', '), array_to_string(v_sources, ', '));
  execute v_sql;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Existing codes are imported before the triggers are installed, so the
-- backfill stays a single bulk insert.
select public.sync_promo_backfill();

do $$
begin
  if to_regclass('public.promo_codes') is null then
    raise notice 'promo_codes does not exist yet: re-run this migration after creating it';
    return;
  end if;
  if not exists (select 1 from information_schema.columns c
                  where c.table_schema = 'public' and c.table_name = 'promo_codes'
                    and c.column_name = 'code') then
    raise notice 'promo_codes has no code column: sync skipped';
    return;
  end if;

  drop trigger if exists sync_promo_code_to_drop on public.promo_codes;
  create trigger sync_promo_code_to_drop
    after insert or update on public.promo_codes
    for each row
    execute function public.sync_promo_row();

  if to_regclass('public.drop_codes') is not null
     and exists (select 1 from information_schema.columns c
                  where c.table_schema = 'public' and c.table_name = 'drop_codes'
                    and c.column_name = 'used') then
    drop trigger if exists sync_drop_code_to_promo on public.drop_codes;
    create trigger sync_drop_code_to_promo
      after update on public.drop_codes
      for each row
      when (old.used is distinct from new.used)
      execute function public.sync_drop_row();
  end if;
end $$;

-- The browser validates against promo_codes through PostgREST, exactly as it
-- already reads drop_codes: read-only access to the four validation columns.
do $$
declare
  v_cols text;
  v_rls boolean;
begin
  if to_regclass('public.promo_codes') is null then
    return;
  end if;

  select c.relrowsecurity into v_rls
    from pg_class c
   where c.oid = to_regclass('public.promo_codes');
  if v_rls then
    drop policy if exists "Public can view promo codes" on public.promo_codes;
    create policy "Public can view promo codes" on public.promo_codes
      for select to anon, authenticated using (true);
  end if;

  select string_agg(format('%I', c.column_name), ', ') into v_cols
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = 'promo_codes'
     and c.column_name in ('code', 'is_active', 'expires_at', 'used');
  if v_cols is not null then
    execute format('grant select (%s) on public.promo_codes to anon, authenticated', v_cols);
  end if;
end $$;

-- Helpers stay internal: they are reached through the triggers, not PostgREST.
revoke all on function public.drop_flag(text) from public, anon, authenticated;
revoke all on function public.sync_promo_code(text) from public, anon, authenticated;
revoke all on function public.sync_drop_to_promo(text) from public, anon, authenticated;
revoke all on function public.sync_promo_row() from public, anon, authenticated;
revoke all on function public.sync_drop_row() from public, anon, authenticated;
revoke all on function public.sync_promo_backfill() from public, anon, authenticated;
grant execute on function public.drop_flag(text) to service_role;
grant execute on function public.sync_promo_code(text) to service_role;
grant execute on function public.sync_drop_to_promo(text) to service_role;
grant execute on function public.sync_promo_backfill() to service_role;

commit;
