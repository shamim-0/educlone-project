# Separate "status change date" from "last update date"

## Problem
Every service step keeps only one timestamp (`updated_at`). Saving a note later overwrites it, so the Applied/Done/Processing date moves forward and all countdowns (MISA 10 working days, CR, Saudi Embassy, etc.) become wrong.

## Solution
Add a second timestamp on each service step that changes **only** when the status changes.

- New column `status_changed_at` on the service-steps table.
- Backfill it with the existing `updated_at` value for all existing rows, so no historical date is lost (both dates identical for now, exactly as requested).
- A database trigger updates `status_changed_at` only when the status value actually changes; note/credential/subtask edits leave it untouched.

## What changes in the app
- All deadline/countdown logic (MISA two-phase 10 working days, CR, Saudi Embassy, Saudi Qiwa/Absher, Mother Company Formation, overdue detection) reads the status-change date instead of the last-update date.
- Each service card shows both:
  - Status line: "Applied on <status change date>"
  - Below: "Last updated by <user> • <last update date>" (unchanged behaviour)
- Overdue calculations on the dashboard and the overdue report use the status-change date too.

## Technical notes
- Migration: `ALTER TABLE public.company_steps ADD COLUMN status_changed_at timestamptz NOT NULL DEFAULT now();` then `UPDATE public.company_steps SET status_changed_at = updated_at;` plus a `BEFORE UPDATE` trigger `SET NEW.status_changed_at = CASE WHEN NEW.status IS DISTINCT FROM OLD.status THEN now() ELSE OLD.status_changed_at END`.
- `saveStep` in `src/pages/CompanyDetail.tsx` stops sending a manual timestamp for the status date; the trigger owns it. On insert the default `now()` applies.
- Replace `updated_at` reads in countdown blocks of `src/pages/CompanyDetail.tsx` and in `src/lib/overdue.ts` with `status_changed_at`.
