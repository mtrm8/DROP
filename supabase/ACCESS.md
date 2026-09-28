# Reusable drop codes

## Installation and upgrades

- New projects: run `schema.sql` in the Supabase SQL editor.
- Existing projects with the prize/content RPCs installed: run
  `migrations/20261005_reusable_drop_codes.sql` **after all earlier migrations and
  before deploying the updated frontend**. It replaces the single-use RPCs and
  restores anonymous SELECT access to active codes. Re-running it is safe.
- Earlier migrations describe historical single-use behavior. Do not reapply them
  after the reusable-code migration without running the reusable migration again.

The migration does not reset or delete existing codes. Previously used codes are
immediately eligible again if `is_active = true`; `used` and `used_at` are legacy
metadata and no longer restrict verification, redemption, collection, or resume.
Codes that administrators disabled remain disabled.

## Verification

The frontend trims and uppercases input with `.trim().toUpperCase()`, then makes
one read-only request equivalent to:

```sql
select code from public.drop_codes where is_active = true;
```

It compares normalized codes directly in JavaScript. Verification never calls a
redemption RPC, changes a row, or accepts a hard-coded fallback code. Missing
matches are invalid; network/database failures are reported as connection errors.
The compatibility `verify_drop_code` RPC uses the same active-only eligibility.

RLS allows `anon` and `authenticated` to read active rows. The migration grants
SELECT on `code` and `is_active`, and removes the old public consume policy and
direct `used` update grant. Public clients cannot consume or delete a code.

## Prize preparation and collection

`redeem_code` checks that the code is active and prepares its prize atomically.
It may set `prize_id` and `prize_rolled_at` when no valid prize is assigned. It
never changes `used`, `used_at`, or `is_active`, and never deletes the code.
The assigned prize is **per code**: repeat redemptions and concurrent users
receive the same stored prize. This preserves retry behavior and prize validation.

`complete_drop` is read-only. It verifies that the code is still active and that
the selected winning card matches its stored prize, then returns that prize and
content. Repeated collection leaves every code field unchanged. `get_drop`,
`get_prize`, and the legacy `roll_prize` endpoint also accept active codes
regardless of old usage flags.

An active code can be verified, opened, and collected indefinitely. Administrators
can retire it by explicitly setting `is_active = false`. The frontend rejects an
explicit inactive/missing response at activation; a transport failure after
successful verification may still show a clearly provisional, device-local prize.

Optional `drop_content` fields are `title`, `description`, and `analysis`.
The historical promo sync migration is optional; the frontend reads only
`drop_codes`. Collection no longer changes `used`, so it does not trigger the
old reverse used-flag sync to `promo_codes`. Administrative promo edits may still
mirror fields into `drop_codes` if that integration is installed.

## Supabase configuration

Provide `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at build
time; `.github/workflows/bunker.yml` reads them from repository secrets. Both
values must belong to the same live project. After changing them, rebuild and
deploy the static site. Missing configuration prevents verification.

To check public access, run the active-code SELECT as `anon` or request
`/rest/v1/drop_codes?select=code&is_active=eq.true` with the project's public key.
A `42501` permission error requires both the column grants and RLS policy from
the reusable-code migration.

## Regression checks

Run `npm run drop:test` for frontend verification/redemption request checks.

Run `tests/reusable_drop_codes.sql` in a test database after installing the schema
or applying the migration. It exercises repeated redemption/collection, historical
used codes, invalid and inactive codes, prize mismatches, anonymous visibility,
and unchanged code state. Fixtures are rolled back at the end.
