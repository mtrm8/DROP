# Drop code enforcement

Apply `migrations/20260926_require_existing_drop_code.sql` to the Supabase project before relying on server-side one-time codes. The migration removes anonymous table writes and prevents `redeem_code` from creating arbitrary codes. Provision legitimate codes through a privileged administrative connection; the browser only needs permission to execute the RPCs.

The static GitHub Pages build can require a code in the UI and consume a one-navigation handoff, but its HTML, bundled data and JavaScript remain publicly downloadable. Confidential Bunker data requires an authenticated server endpoint (or a private hosting platform), not a client-side route guard. If Supabase public URL/anon key are not configured at build time, only the explicitly bundled community-code demo flow is available and it is not server authentication.
