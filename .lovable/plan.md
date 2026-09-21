# Nijer Supabase-e Purno Transfer

Frontend React-ei thakbe. Backend (database + login + file storage + server function) Lovable Cloud theke apnar nijer Supabase account-e sorano hobe — kono data loss chhara.

## Keno Supabase-i shothik

Ekhon jeta ache: Postgres database, 26 ta table, 9 ta database function, 15 ta trigger, row-level access rules, 21 jon login user, 2093 ta upload kora file, ar 4 ta server function. Nijer Supabase project niley ei sob kichu hubohu kaj korbe — kono code notun kore likhte hobe na. Neon/Railway niley login, file upload ar server function pura notun kore banate hoto, ja boro risk.

## Ja transfer hobe

- Sob table + data: companies (194), company_steps (4124), documents record (2091), installments (385), expenses, employees, salary, packages, services, agreements, roles, profiles — sob.
- Database function, trigger, index, access rules (RLS) — hubohu.
- 21 jon user-er login account, purono password soho (password change korte hobe na).
- Storage-er 2093 ta file (company documents) — original folder structure soho.
- 4 ta server function: admin-create-user, admin-delete-user, admin-update-password, company-detail-api.

## Apnar ja korte hobe (2 ta step)

1. supabase.com-e notun project khulun — region `Middle East (Bahrain)` ba apnar kache kachakachi ta nin, ar database password ta shomvhale rakhun.
2. Lovable-er Supabase connect button-e click kore apnar account authorize korun. Ei connect-ei ami schema, data, storage ar functions transfer kore dite parbo.

Notun project-er Project URL, anon key, service role key ar database connection string lagbe — connect korar por ba ami cheye nile secure form-e diben.

## Transfer-er dhap

1. **Backup** — bortoman database-er purno dump (schema + data + auth users) neowa hobe age.
2. **Schema** — 61 ta migration file notun project-e cholbe, tarpor mile kina milie dekha hobe.
3. **Data** — sob table-er row copy, foreign key order maintain kore; sheshe protiti table-er row count purono/notun miliye dekhano hobe.
4. **Login user** — auth user gulo password hash soho copy, jate keu re-register korte na hoy.
5. **File** — company-documents bucket notun project-e toiri kore 2093 ta file same path-e copy, ar count milie verify.
6. **Server function** — 4 tai notun project-e deploy, ar tader secret (LOVABLE_API_KEY soho) set kora.
7. **App switch** — app-er connection setting notun project-e ghurano, tarpor login, company list, document download, invoice PDF, office account — pura flow ek ek kore test.
8. **Purono ta 7-14 din chalu rakha** — sob thik ache nishchit howar por-i purono backend off kora hobe.

## Prযুক্তিগত bishesh dik

- Migration copy noy — `pg_dump` diye purno schema + data + `auth.users`/`auth.identities` dump kore notun project-e restore kora hobe, jate sequence, default, enum type ar password hash ohoto thake.
- `storage.objects` row restore korar age file gulo Storage API diye copy hobe, na hole path mismatch hobe.
- Edge function-er `verify_jwt` setting (`company-detail-api` = false) `config.toml` theke hubohu jabe.
- `.env` (VITE_SUPABASE_URL / PUBLISHABLE_KEY / PROJECT_ID) ar generated client file notun project-er value-te update hobe.
- Email/password login notun project-e enable korte hobe, ar Site URL / Redirect URL apnar preview + published domain-e set korte hobe — na hole login redirect fail korbe.
- Agreement template gulo (public/agreements) frontend-e ache, transfer-er sathe kono somporko nei.

## Jei jinis mathay rakha dorkar

- Transfer chalakalin 30-60 minute app-e notun data add na kora bhalo — na hole shesh muhurter row miss hote pare.
- Supabase free tier 500MB database + 1GB storage; apnar 2093 ta file er size dekhe proyojone Pro ($25/mo) lagte pare — transfer-er age ami size ta jana bo.
- Transfer-er por Lovable theke database-er kaj korte holeo apnar project-ei hobe, kintu bill apnar Supabase account-e jabe.
