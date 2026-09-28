-- Public clients may inspect active codes and mark an unused code as used.
-- Only the used column is writable; the app still uses redeem_code to assign
-- and persist the actual prize atomically.
begin;

alter table public.drop_codes enable row level security;
drop policy if exists "Public can view active drop codes" on public.drop_codes;
drop policy if exists "Public can consume active drop codes" on public.drop_codes;

create policy "Public can view active drop codes" on public.drop_codes
  for select to anon, authenticated using (is_active is true);
create policy "Public can consume active drop codes" on public.drop_codes
  for update to anon, authenticated
  using (is_active is true and used is false)
  with check (is_active is true and used is true);

revoke all on public.drop_codes from public, anon, authenticated;
grant select (code, is_active, used) on public.drop_codes to anon, authenticated;
grant update (used) on public.drop_codes to anon, authenticated;

commit;
