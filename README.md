# DevDeck

A personal, mobile-first **resource hub** that surfaces data from an Airtable base
outside of Airtable. Airtable's own Interface Extensions only run on desktop inside
the Airtable runtime; DevDeck re-implements that data layer on top of the Airtable
**REST API** so the same interfaces work on a phone, installable as a PWA.

It ships five sections — **Cheat Sheets, Dev Work, Events, Jobs** (Mapbox map) and
**Tools** — behind a single-password gate, in a neutral-gray + acid-yellow brutalist theme.

---

## Tech stack

| Concern        | Choice                                                            |
| -------------- | ---------------------------------------------------------------- |
| Framework      | **Next.js 16** (App Router) + **React 19**, TypeScript           |
| Data fetching  | **SWR** (suspense mode) over a server-side API proxy             |
| Data source    | **Airtable REST API** (`api.airtable.com`)                       |
| Maps           | **Mapbox** via `react-map-gl` + `mapbox-gl` (Jobs only)          |
| Icons          | `@phosphor-icons/react`                                          |
| Fonts          | `next/font` — **Anton** (display) + **Montserrat** (body)        |
| Hosting        | **Vercel** (static pages + serverless route handlers)            |

---

## Architecture at a glance

The one rule that shapes everything: **the Airtable token must never reach the browser.**
It grants full read/write access to the base, so all Airtable calls go through a thin
server-side proxy that holds the token in an environment variable.

```
Browser (client components)
  │  useBase() / useRecords()  ── SWR ──►  /api/airtable/*  (route handlers, server-only)
  │                                              │  attaches `Authorization: Bearer <token>`
  │                                              ▼
  │                                        api.airtable.com  +  content.airtable.com
  │
  └─ Mapbox calls use a PUBLIC token (NEXT_PUBLIC_*) directly from the browser — safe by design.

proxy.ts (Next.js "proxy" = middleware) guards every route: no valid session cookie → redirect to /login.
```

Three layers do the heavy lifting:

1. **The proxy** (`app/api/airtable/*`) — server route handlers that forward to Airtable
   with the secret token. Handles pagination, create/update/delete, schema, and base64
   attachment uploads.
2. **The SDK-compatibility adapter** (`lib/airtable/`) — the interfaces were ported from
   Airtable Blocks Extensions, which expose `useBase()`, `useRecords()`, and record/table
   objects with methods like `getCellValue()`. This layer re-creates that exact surface on
   top of the REST API, so the ported UI code barely changed. `normalize.ts` translates
   between REST value shapes and the shapes the Blocks SDK returned.
3. **The auth gate** (`proxy.ts` + `lib/auth.ts` + `/login`) — one shared password →
   an HMAC-signed, httpOnly session cookie.

---

## File structure

```
webapp/
├── app/                            # Next.js App Router: routes, pages, API
│   ├── layout.tsx                  # Root layout: loads fonts, global CSS, metadata/PWA
│   ├── globals.css                 # Base CSS reset only
│   ├── theme.css                   # ★ Design tokens — colours, light/dark palette, nav height
│   ├── fonts.ts                    # next/font: Anton (display) + Montserrat (body)
│   ├── page.tsx                    # Landing page (hero, marquee, section cards)
│   ├── login/page.tsx              # Password gate UI
│   │
│   ├── cheatsheet/page.tsx         # ┐
│   ├── devwork/page.tsx            # │ The five interfaces. Each is a self-contained
│   ├── events/page.tsx             # ├─ client component ported from an Airtable
│   ├── jobs/page.tsx               # │ Interface Extension (see ../*-interface.tsx).
│   ├── tools/page.tsx              # ┘ Wrapped in <Shell> for the shared nav.
│   │
│   └── api/                        # Server-only route handlers (hold the Airtable token)
│       ├── login/route.ts          # POST password → set signed session cookie
│       └── airtable/
│           ├── schema/route.ts             # GET base tables + fields (metadata API)
│           ├── records/[table]/route.ts    # GET (paginated list) + POST (create)
│           ├── records/[table]/[id]/route.ts # PATCH (update) + DELETE
│           └── upload/[id]/[field]/route.ts  # POST base64 attachment (content API)
│
├── lib/
│   ├── auth.ts                     # HMAC sign/verify for the session cookie (Web Crypto)
│   ├── useIsNarrow.ts              # matchMedia hook for responsive inline styles (<768px)
│   ├── components/
│   │   ├── TopNav.tsx              # Shared nav: desktop bar + mobile hamburger
│   │   └── Shell.tsx               # TopNav + scrollable <main> wrapper for interfaces
│   └── airtable/                   # ★ The SDK-compatibility data layer
│       ├── server.ts               # Server helper: token + fetch wrapper + error JSON
│       ├── hooks.tsx               # useBase() / useRecords() (SWR) + <AirtableBoundary>
│       ├── models.ts               # Base / Table / Field / Record classes + write methods
│       ├── normalize.ts            # Translate REST value shapes ↔ Blocks SDK shapes
│       ├── fieldTypes.ts           # FieldType enum (Airtable field-type string constants)
│       ├── types.ts                # Raw REST response types
│       └── keys.ts                 # SWR cache keys (shared by hooks + mutations)
│
├── proxy.ts                        # Auth middleware (Next 16 names middleware "proxy")
├── public/
│   ├── icon.svg                    # App / PWA icon
│   └── manifest.webmanifest        # PWA manifest (Add to Home Screen)
├── .env.local.example              # Template for required env vars (copy to .env.local)
└── next.config.ts / tsconfig.json / package.json
```

> The original Airtable Interface Extension sources live one level up
> (`../cheatsheet-interface.tsx`, etc.). They are **not** part of this app — they're kept
> only as the reference the ported `app/*/page.tsx` files were derived from.

---

## Environment variables

Copy `.env.local.example` to `.env.local` and fill these in. In production, set the same
keys in the Vercel dashboard (**Settings → Environment Variables**).

| Variable                   | Required | Used by              | Notes                                                                 |
| -------------------------- | :------: | -------------------- | --------------------------------------------------------------------- |
| `APP_PASSWORD`             |   yes    | `/api/login`         | The single password to enter the app.                                 |
| `SESSION_SECRET`           |   yes    | `proxy.ts`, `auth.ts`| Long random string that signs the session cookie.                     |
| `AIRTABLE_TOKEN`           |   yes    | `app/api/airtable/*` | Personal Access Token (`data.records:read/write`, `schema.bases:read`). **Server-only.** |
| `AIRTABLE_BASE_ID`         |   yes    | `app/api/airtable/*` | The base id (`app…`) holding the tables.                              |
| `NEXT_PUBLIC_MAPBOX_TOKEN` |  Jobs    | `app/jobs/page.tsx`  | Mapbox **public** token. Baked into the client bundle at build time.  |

> `NEXT_PUBLIC_*` values are embedded in the browser bundle, so only ever put a *public*
> Mapbox token there. The Airtable token is **not** `NEXT_PUBLIC` and stays on the server.

---

## Local development

Requires Node 20+.

```bash
cd webapp
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev                        # http://localhost:3000
```

Scripts: `npm run dev` (dev server), `npm run build` (production build), `npm start`
(serve the build).

---

## Deployment (Vercel)

1. Push this `webapp/` folder to a Git repo and import it in Vercel (framework: Next.js).
2. Add all env vars from the table above (set `NEXT_PUBLIC_MAPBOX_TOKEN` **before** the
   first build, since it's compiled in).
3. Deploy. Open the URL on a phone → **Share → Add to Home Screen** for an app-like launch.

---

## How the Airtable integration works

**Reading.** `useBase()` fetches the base schema once; `useRecords(table)` fetches a table's
records (all pages) and wraps each row in a `RecordModel`. Components call
`record.getCellValue(field)` / `getCellValueAsString(field)` exactly as they did under the
Blocks SDK — `normalize.ts` reshapes REST values (e.g. multi-selects, `aiText`, attachments,
formulas) into the shapes that code expects.

**Writing.** `table.createRecordAsync()`, `updateRecordAsync()` and `deleteRecordAsync()` on
`TableModel` (in `models.ts`) POST/PATCH/DELETE through the proxy, then revalidate the SWR
cache so the UI updates. File attachments are uploaded as base64 via the content-API route.

**Config that used to be Airtable UI.** Blocks Extensions let users pick fields and settings
in Airtable's builder (`useCustomProperties`). In a standalone app there's no builder, so
those are hardcoded near the top of each interface (field IDs as constants), and the target
table is pinned by id where a base has many tables.

### Adding / changing an interface

1. Create `app/<name>/page.tsx` as a client component.
2. Get data via `useBase()` / `useRecords()` from `@/lib/airtable/hooks`; reference fields by
   id (find ids via the `/api/airtable/schema` route or the Airtable API docs).
3. Wrap the export in `<Shell>` so it gets the shared nav, and use `height: 100%` on the root
   (the Shell owns the viewport height).
4. Add the route to the `LINKS` array in `lib/components/TopNav.tsx` and the landing page
   `SECTIONS` list in `app/page.tsx`.

---

## Theming

All colours and the light/dark palette live in **`app/theme.css`** as CSS custom properties
(`--page`, `--surface`, `--text-primary`, `--accent`, …). Light/dark follows the system
setting via `prefers-color-scheme`. Anton/Montserrat are exposed as `--font-display` /
`--font-body`. To re-skin the app, edit `theme.css` — components reference the tokens, not
raw hex values.
