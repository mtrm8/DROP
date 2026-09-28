-- Apply to the live project if anonymous reads of active drop_codes fail with 42501.
-- RLS limits visible rows; column grants allow the REST filter and selection.
begin;

alter table public.drop_codes enable row level security;
drop policy if exists "Public can view active drop codes" on public.drop_codes;
create policy "Public can view active drop codes" on public.drop_codes
  for select to anon, authenticated using (is_active is true);

grant usage on schema public to anon, authenticated;
grant select (code, is_active) on public.drop_codes to anon, authenticated;

commit;
