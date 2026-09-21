# Notun user create hocche na — fix plan

## Ki hoyeche

"Add User" korle "Failed to send a request to the Edge Function" ashe. Ami server side check korechi:
notun database-e je 4 ta server function copy kora hoyechilo, tader moddhe request pathale server
`503 BOOT_ERROR` ferot dey — mane function gulo chalu-i hocche na (code upload thik moto hoy ni,
entry file chinte parche na). Tai user create, user delete, password change — ei teen tai ekhon kaj korbe na.

## Ki kora hobe

1. Char ta function notun kore, thik poddhoti-te, apnar nijer database-e abar upload kora hobe.
2. Protita function er jonno chalu howa test kora hobe (request pathiye boot error ache kina dekha).
3. Admin hisebe login kore bastob vabe ekta test user create kora hobe, tarpor sheta delete kore deya hobe.
4. Password change ar company-detail link duitao ek-bar jachai kora hobe.

Kono database data ba UI change hobe na — shudhu server function gulo thik kora hobe.

## Technical details

- Root cause: functions were pushed via the legacy `POST /v1/projects/{ref}/functions` JSON body endpoint;
  each reports `status: ACTIVE, version: 1` but the gateway returns `sb-error-code: BOOT_ERROR` (503),
  including on OPTIONS — the bundle has no resolvable entrypoint.
- Fix: redeploy each function with the multipart endpoint
  `POST /v1/projects/{ref}/functions/deploy?slug=<slug>` using
  `metadata` (`{ entrypoint_path: "index.ts", name, verify_jwt }`) plus the `file` part from
  `supabase/functions/<slug>/index.ts`.
- Preserve flags: `verify_jwt=true` for admin-create-user, admin-delete-user, admin-update-password;
  `verify_jwt=false` for company-detail-api.
- Runtime env on the target already provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`; the functions fall back to `SUPABASE_ANON_KEY`, so no new secrets needed.
- Verification: `OPTIONS` + `POST` curl per function expecting CORS 200 / 401 (not 503), then a
  Playwright run signed in as an admin to create and delete a throwaway user through the Users page.
