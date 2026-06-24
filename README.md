# Cheat Sheets — standalone webapp

A mobile-friendly web version of the Airtable **Cheat Sheets** interface extension.
The UI is ported almost verbatim from `../cheatsheet-interface.tsx`; only the data
layer changed — instead of the Airtable Blocks SDK it talks to the Airtable REST API
through a small server-side proxy (so the token never reaches the browser).

This is the proof-of-concept for migrating the rest of the interfaces.

## How it works

```
Browser ──► Next.js (Vercel)
            ├─ proxy.ts           password gate on every route
            ├─ /login             enter the shared password → signed cookie
            ├─ /cheatsheet        the ported UI (client-rendered)
            └─ /api/airtable/*    proxy that holds the Airtable token
                                  → api.airtable.com
```

Key pieces:

- **`lib/airtable/`** — drop-in replacements for the Blocks SDK: `useBase`,
  `useRecords`, and `Record`/`Table`/`Field` models exposing `getCellValue`,
  `getCellValueAsString`, `createRecordAsync`, `updateRecordAsync`, etc.
  `normalize.ts` translates REST values ↔ the shapes the SDK returned.
- **`app/api/airtable/`** — list / create / update / delete / schema / attachment-upload
  proxy routes. The Airtable token lives here only.
- **`proxy.ts`** — single-password auth (Next 16's renamed middleware).

## Local setup

1. `cp .env.local.example .env.local` and fill in:
   - `APP_PASSWORD` — the password to enter the app
   - `SESSION_SECRET` — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `AIRTABLE_TOKEN` — a Personal Access Token with scopes
     `data.records:read`, `data.records:write`, `schema.bases:read`
     (create at <https://airtable.com/create/tokens>)
   - `AIRTABLE_BASE_ID` — the base holding the Cheat Sheets table (starts with `app`)
2. `npm run dev` → <http://localhost:3000>

## Deploy (Vercel)

1. Push this `webapp/` folder to a Git repo and import it in Vercel.
2. Add the four env vars above in **Project → Settings → Environment Variables**.
3. Deploy. On your phone, open the URL and **Add to Home Screen** to install it.

## Notes

- Records poll every 6s so AI/formula fields fill in live (tune `RECORDS_REFRESH_MS`
  in `lib/airtable/hooks.tsx`).
- Attachment uploads go through `app/api/airtable/upload/...` (REST needs base64;
  the SDK accepted `File` objects directly). 5 MB per-file limit.
- The Cheat Sheets table is auto-detected by a known field ID, so no table id config
  is needed; field IDs are already embedded in `app/cheatsheet/page.tsx`.
