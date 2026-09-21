# Notun file R2-te, purono file age-r jaygay

## Ki hobe

- **Purono document** (jegulo age upload kora) — age-r moto-i Lovable-er storage theke download hobe. Kono poriborton nei.
- **Notun upload** — sob notun file apnar R2 bucket-e jabe (S3 API diye).
- **Download button** — app nije bujhe nebe file-ta kothay ache (R2 / notun storage / purono Lovable storage) ar shothik jaygatheke khulbe.
- **Delete** — file jekhane ache sekhan thekei muche jabe.

Bhabishyot-e chaile purono file gulo-o R2-te copy kora jabe — ekhon dorkar nei.

## Apnar kach theke ja lagbe

R2 bucket-er jonno (Cloudflare R2, S3-compatible):

1. Account ID (othoba puro S3 API endpoint URL)
2. Access Key ID
3. Secret Access Key
4. Bucket name

Egulo secure form-e chaoa hobe — chat-e paste korar dorkar nei.

Ekta jinis apnake nije korte hobe: R2 bucket-er **CORS** setting-e app-er address allow korte hobe, na hole browser theke upload block hoye jabe. Ami exact value likhe debo, apni bucket settings-e paste korben.

## Prostut korar dhap

1. R2 credentials secret hisebe save kora.
2. Document talikay ekta chinho rakha hobe — kon file kon jaygay ache.
3. Ekta server function toiri hobe ja upload-er jonno ar download-er jonno R2-er temporary link banabe (link 2-5 minute valid thake).
4. Company page-er upload/download/delete oi function-er sathe juktho kora.
5. Test: notun file upload → talikay dekha → download → delete; ar purono ekta file download kore nishchit kora je seta ekhono kaj korche.

## Technical details

- New column `public.company_documents.storage_provider text not null default 'r2'` (existing rows backfilled to `'legacy'`). Download resolver: `r2` → R2 signed GET; otherwise current target-Supabase signed URL with existing `legacy-document-url` fallback.
- New edge function `r2-object-url` (verify_jwt = true, role-checked same as current doc policies):
  - `POST { mode: "upload", path, contentType }` → SigV4 presigned `PUT` URL (5 min).
  - `POST { mode: "download", path }` → presigned `GET` URL (2 min).
  - `POST { mode: "delete", path }` → server-side `DELETE` to R2.
  - Secrets: `R2_ACCOUNT_ID` (or `R2_S3_ENDPOINT`), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. SigV4 signed with `aws4fetch` (npm: specifier), region `auto`, service `s3`.
- `CompanyDetail.tsx`: `uploadDocuments()` gets a presigned PUT and `fetch(url, { method: "PUT", body: file })` instead of `supabase.storage.upload`, then inserts the row with `storage_provider: 'r2'`. `downloadDocument()` / `deleteDocument()` / `deleteFolder()` branch on `storage_provider`.
- Same object key scheme kept: `{companyId}/{category}/{folder}/{ts}_{rand}_{safeName}`.
- R2 bucket CORS must allow `PUT`, `GET`, headers `*`, origin = preview + published app URLs.
