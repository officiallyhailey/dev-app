'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, ArrowLeftIcon } from '@phosphor-icons/react';
import { TopNav } from '@/lib/components/TopNav';
import { ScrollProgress } from '@/lib/components/ScrollProgress';
import { useIsNarrow } from '@/lib/useIsNarrow';

const DISPLAY = 'var(--font-display)';

const mono: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
};

// ── Content data ──────────────────────────────────────────────────────────────
const FLOW = [
    { label: 'Browser', sub: 'React UI · SWR · PWA' },
    { label: 'API Proxy', sub: 'serverless · holds token' },
    { label: 'Airtable + Mapbox', sub: 'REST · geocoding' },
];

const STACK: { k: string; v: string }[] = [
    { k: 'Framework', v: 'Next.js 16 (App Router)' },
    { k: 'UI', v: 'React 19 · TypeScript' },
    { k: 'Data fetching', v: 'SWR (suspense mode)' },
    { k: 'Maps', v: 'Mapbox GL · react-map-gl' },
    { k: 'Icons / Fonts', v: 'Phosphor · next/font' },
    { k: 'Tooling', v: 'TypeScript strict · npm' },
];

const HOSTING: { k: string; v: string }[] = [
    { k: 'Platform', v: 'Vercel — static pages + serverless route handlers' },
    { k: 'Install', v: 'PWA: web manifest, themed icons, Add to Home Screen' },
    { k: 'Config', v: 'Environment variables (no secrets in the repo)' },
    { k: 'Rendering', v: 'Static interfaces, client-fetched data via SWR' },
];

const SECURITY: { t: string; d: string }[] = [
    { t: 'Token never reaches the browser', d: 'The Airtable token lives only in server-side route handlers. Every Airtable call is proxied; the client only ever talks to /api/*.' },
    { t: 'Signed session cookie', d: 'A single password issues an HMAC-SHA256 signed, httpOnly cookie via the Web Crypto API — no token or password stored client-side.' },
    { t: 'Middleware gate', d: 'proxy.ts (Next.js middleware) guards every route: unauthenticated page loads redirect to /login, API calls get a 401.' },
    { t: 'Public vs private keys', d: 'Only the public Mapbox token is exposed (NEXT_PUBLIC_*). Secrets are git-ignored and set in the host dashboard.' },
];

// Each tag carries a plain-English explanation shown on hover/tap — written to teach,
// not to impress. Keep these accurate to what the code actually does.
const ENG_SKILLS: { name: string; info: string }[] = [
    { name: 'REST API integration', info: 'The app talks to Airtable over plain HTTP — listing, creating, updating and deleting records — instead of using its desktop-only SDK. That decoupling is exactly what lets the same screens run on a phone.' },
    { name: 'Serverless functions', info: 'Next.js route handlers run on demand on the server. They hold the secret API token and forward every Airtable request, so the credential never ships to the browser.' },
    { name: 'Auth & cryptography', info: 'One shared password mints an HMAC-SHA256 signed cookie using the Web Crypto API. The signature proves the cookie is genuine on every request, with nothing sensitive stored on the client.' },
    { name: 'Data normalization', info: "Airtable's REST values — multi-selects, AI text, attachments, formulas — come back shaped differently than its SDK returned them. A small layer reshapes each one so the ported UI reads it unchanged." },
    { name: 'Client-side caching', info: 'SWR keeps fetched records in memory, dedupes identical requests, and revalidates right after a write — so the screen always reflects the latest data without manual refetching.' },
    { name: 'Server-side caching', info: 'The base structure rarely changes, so the schema is cached on the server between requests. That collapses the schema-then-records waterfall and makes every page open noticeably faster.' },
    { name: 'Payload optimization', info: 'Each table requests only the fields it actually shows, through a per-table allowlist. Smaller responses mean less to download and parse — a real win on a mobile connection.' },
    { name: 'TypeScript', info: 'The codebase is typed end to end. The compiler catches mistakes before they ship, and the types double as live documentation of every data shape.' },
    { name: 'Responsive & PWA', info: "Mobile-first layouts plus a web manifest and themed icons let the app install to a phone's home screen and launch full-screen, like a native app." },
    { name: 'Maps & geocoding', info: "Mapbox turns each job's address into coordinates (geocoding) and plots it on an interactive map. That token is public by design and meant to be restricted to the app's domain." },
    { name: 'State management', info: 'React state — with a little help from SWR — drives the live parts: search, filters, the map camera, staged edits, and AI fields that stream in a few seconds after you save.' },
];
const DESIGN_SKILLS: { name: string; info: string }[] = [
    { name: 'Design tokens', info: 'Every colour, both fonts, and the nav height live as CSS variables in one file. Components reference the tokens, so re-skinning the entire app is a single-file change.' },
    { name: 'Brutalist design system', info: "A deliberate visual language: hard 2px borders, flat blocks, offset drop-shadows and oversized condensed type. Bold and legible, with no decoration that doesn't earn its place." },
    { name: 'Typography & font pairing', info: 'Anton — a heavy condensed display face — carries the headlines, while Montserrat handles body text. The strong contrast between the two is what creates the hierarchy.' },
    { name: 'Light / dark theming', info: 'Two complete palettes that follow the device’s system setting via prefers-color-scheme, each tuned on its own so contrast holds up in either mode.' },
    { name: 'Mobile-first layout', info: 'Screens are designed for a phone first and then scale up — full-width search, stacked panels, a hamburger menu — so the small-screen experience is never an afterthought.' },
    { name: 'Component architecture', info: 'Shared building blocks — one nav, one modal size, one help popup, one loading state — keep every page consistent and make new sections quick to add.' },
    { name: 'Interaction & motion', info: 'Purposeful movement: a scroll-progress bar, a 3D image coverflow, shimmer-to-fill AI fields, and a marquee loading screen — all of which back off when the user prefers reduced motion.' },
    { name: 'UX states', info: 'Every moment is designed for: helpful empty states, live loading, inline guidance in forms, and a confirm step before anything destructive.' },
    { name: 'Accessibility-minded', info: 'Semantic, focusable controls; aria labels on icon-only buttons; modals that close on Escape; and motion that honours reduced-motion preferences.' },
];

const MODULES: { name: string; what: string; ex: string }[] = [
    { name: 'Cheat Sheets', what: 'Searchable reference library', ex: 'Create · search · live AI fields' },
    { name: 'Dev Work', what: 'Project log with image showcase', ex: 'Create · edit · attachment banner' },
    { name: 'Agenda', what: 'Tasks, events & reminders', ex: 'Full create / update / delete' },
    { name: 'Jobs', what: 'Opportunities on a map', ex: 'Create (link → AI) · map · geocoding' },
    { name: 'Tools', what: 'Categorised resource directory', ex: 'Create (link → AI) · grouping' },
];

const CHIPS = ['Next.js', 'React', 'TypeScript', 'SWR', 'Airtable API', 'Mapbox', 'Web Crypto', 'Vercel', 'PWA'];

// ── Reusable bits ─────────────────────────────────────────────────────────────
function Eyebrow({ n, text }: { n: string; text: string }) {
    return (
        <div style={{ ...mono, color: 'var(--text-muted)', marginBottom: '10px' }}>
            {n} · {text}
        </div>
    );
}

function Heading({ children }: { children: React.ReactNode }) {
    return (
        <h2 style={{ margin: '0 0 16px', fontFamily: DISPLAY, fontSize: 'clamp(26px, 5vw, 40px)', textTransform: 'uppercase', lineHeight: 1, color: 'var(--text-primary)' }}>
            {children}
        </h2>
    );
}

function Card({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
    return (
        <div style={{ border: '2px solid var(--text-primary)', background: accent ? 'var(--accent)' : 'var(--page)', color: accent ? 'var(--accent-text)' : 'var(--text-primary)', padding: '18px' }}>
            {children}
        </div>
    );
}

function KV({ k, v }: { k: string; v: string }) {
    return (
        <div>
            <div style={{ ...mono, color: 'var(--accent-deep, var(--text-primary))', marginBottom: '3px' }}>{k}</div>
            <div style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.45, color: 'var(--text-primary)' }}>{v}</div>
        </div>
    );
}

// A skill tag that reveals a plain-English explanation on hover (desktop) or tap (mobile).
function SkillChip({ name, info, accent, isNarrow }: { name: string; info: string; accent?: boolean; isNarrow: boolean }) {
    const [open, setOpen] = useState(false);
    const hover = isNarrow ? {} : { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false) };
    return (
        <span style={{ position: 'relative', display: 'inline-block' }} {...hover}>
            <button
                onClick={() => setOpen(o => !o)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                aria-expanded={open}
                style={{
                    ...mono, padding: '7px 11px', border: '2px solid var(--text-primary)',
                    background: accent ? 'var(--accent)' : 'var(--page)',
                    color: accent ? 'var(--accent-text)' : 'var(--text-primary)',
                    cursor: isNarrow ? 'pointer' : 'help', lineHeight: 1,
                }}
            >
                {name}
            </button>
            {open && (
                <span role="tooltip" style={{
                    position: 'absolute', bottom: 'calc(100% + 9px)', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 60, width: 'min(300px, 78vw)', padding: '12px 14px',
                    border: '2px solid var(--text-primary)', background: 'var(--surface)', color: 'var(--text-primary)',
                    boxShadow: '5px 5px 0 var(--text-primary)',
                    fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.55, fontWeight: 500,
                    letterSpacing: 'normal', textTransform: 'none',
                }}>
                    {info}
                </span>
            )}
        </span>
    );
}

export default function About() {
    const isNarrow = useIsNarrow();
    const body: React.CSSProperties = { fontSize: isNarrow ? '15px' : '16px', lineHeight: 1.7, fontWeight: 500, color: 'var(--text-muted)', maxWidth: '70ch' };
    const section: React.CSSProperties = { padding: isNarrow ? '36px 16px' : '56px 32px', borderTop: '2px solid var(--text-primary)' };
    const wrap: React.CSSProperties = { maxWidth: '1040px', margin: '0 auto' };

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--page)', display: 'flex', flexDirection: 'column' }}>
            <ScrollProgress />
            <div style={{ position: 'sticky', top: 0, zIndex: 1200 }}><TopNav /></div>

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <header style={{
                padding: isNarrow ? '40px 16px 32px' : '64px 32px 48px',
                backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
            }}>
                <div style={wrap}>
                    <div style={{ ...mono, color: 'var(--text-muted)', marginBottom: '16px' }}>// Engineering write-up</div>
                    <h1 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 'clamp(40px, 9vw, 88px)', textTransform: 'uppercase', lineHeight: 0.92, color: 'var(--text-primary)' }}>
                        How it&apos;s built
                    </h1>
                    <p style={{ ...body, margin: '20px 0 24px' }}>
                        DevDeck is a standalone, mobile-first web app that surfaces an Airtable base
                        <em> outside </em> of Airtable. Airtable&apos;s own Interface Extensions only run on
                        desktop inside its runtime — this project re-implements that data layer on the
                        Airtable REST API so the same tools work on a phone, installable as a PWA, with the
                        secret token kept safely server-side.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {CHIPS.map(c => (
                            <span key={c} style={{ ...mono, padding: '6px 11px', border: '2px solid var(--text-primary)', background: 'var(--surface)', color: 'var(--text-primary)' }}>{c}</span>
                        ))}
                    </div>
                </div>
            </header>

            {/* ── 01 · Request flow ───────────────────────────────────────────── */}
            <section style={section}>
                <div style={wrap}>
                    <Eyebrow n="01" text="Request flow" />
                    <Heading>One secure path</Heading>
                    <p style={{ ...body, marginTop: 0, marginBottom: '26px' }}>
                        The rule that shapes everything: the Airtable token must never reach the browser.
                        The client calls a thin serverless proxy that attaches the token and forwards to
                        Airtable. Mapbox uses a separate, public token and is safe to call directly.
                    </p>
                    <div style={{ display: 'flex', flexDirection: isNarrow ? 'column' : 'row', alignItems: 'stretch' }}>
                        {FLOW.map((step, i) => (
                            <React.Fragment key={step.label}>
                                <div style={{ flex: 1, border: '2px solid var(--text-primary)', padding: '18px', background: i === 1 ? 'var(--accent)' : 'var(--surface)', color: i === 1 ? 'var(--accent-text)' : 'var(--text-primary)' }}>
                                    <div style={{ fontFamily: DISPLAY, fontSize: '21px', textTransform: 'uppercase', lineHeight: 1 }}>{step.label}</div>
                                    <div style={{ ...mono, marginTop: '8px', opacity: 0.75 }}>{step.sub}</div>
                                </div>
                                {i < FLOW.length - 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isNarrow ? '4px 0' : '0 6px', fontFamily: DISPLAY, fontSize: '24px', color: 'var(--text-primary)' }}>
                                        {isNarrow ? '↓' : '→'}
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 02 · Tech stack ─────────────────────────────────────────────── */}
            <section style={section}>
                <div style={wrap}>
                    <Eyebrow n="02" text="Tech stack" />
                    <Heading>What it&apos;s made of</Heading>
                    <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(3, 1fr)', gap: isNarrow ? '14px' : '18px' }}>
                        {STACK.map(row => <Card key={row.k}><KV k={row.k} v={row.v} /></Card>)}
                    </div>
                </div>
            </section>

            {/* ── 03 · Hosting & delivery ─────────────────────────────────────── */}
            <section style={section}>
                <div style={wrap}>
                    <Eyebrow n="03" text="Hosting & delivery" />
                    <Heading>How it ships</Heading>
                    <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(2, 1fr)', gap: isNarrow ? '14px' : '18px' }}>
                        {HOSTING.map(row => <Card key={row.k}><KV k={row.k} v={row.v} /></Card>)}
                    </div>
                </div>
            </section>

            {/* ── 04 · Security ───────────────────────────────────────────────── */}
            <section style={{ ...section, background: 'var(--surface)' }}>
                <div style={wrap}>
                    <Eyebrow n="04" text="Security" />
                    <Heading>Keeping secrets secret</Heading>
                    <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(2, 1fr)', gap: isNarrow ? '14px' : '18px' }}>
                        {SECURITY.map(item => (
                            <div key={item.t} style={{ border: '2px solid var(--text-primary)', background: 'var(--page)', padding: '18px' }}>
                                <div style={{ fontFamily: DISPLAY, fontSize: '18px', textTransform: 'uppercase', lineHeight: 1.05, color: 'var(--text-primary)', marginBottom: '8px' }}>{item.t}</div>
                                <div style={{ fontSize: '13.5px', fontWeight: 500, lineHeight: 1.55, color: 'var(--text-muted)' }}>{item.d}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 05 · Architecture ───────────────────────────────────────────── */}
            <section style={section}>
                <div style={wrap}>
                    <Eyebrow n="05" text="Architecture" />
                    <Heading>The compatibility adapter</Heading>
                    <p style={{ ...body, marginTop: 0 }}>
                        The interfaces were ported from Airtable Blocks Extensions, which expose hooks like
                        <code style={{ fontFamily: 'ui-monospace, monospace', background: 'var(--surface-2)', padding: '1px 6px', margin: '0 2px' }}>useRecords()</code>
                        and records with <code style={{ fontFamily: 'ui-monospace, monospace', background: 'var(--surface-2)', padding: '1px 6px', margin: '0 2px' }}>getCellValue()</code>.
                        Rather than rewrite that UI, a small adapter re-creates the same surface on top of the
                        REST API — so the ported screens changed almost not at all.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(3, 1fr)', gap: isNarrow ? '14px' : '18px', marginTop: '24px' }}>
                        <Card><KV k="Hooks" v="useBase() / useRecords() fetch via SWR and wrap rows in record models" /></Card>
                        <Card><KV k="Normalize" v="Translates REST value shapes ↔ the shapes the SDK returned (selects, AI text, attachments, formulas)" /></Card>
                        <Card><KV k="Mutations" v="create / update / delete proxy to Airtable, then revalidate the SWR cache" /></Card>
                    </div>
                    <p style={{ ...body, marginTop: '20px' }}>
                        Two touches keep it quick: the base schema is cached on the server between requests, and
                        each table fetches only the fields it actually shows — so pages open fast and payloads stay small.
                    </p>
                </div>
            </section>

            {/* ── 06 · Skills ─────────────────────────────────────────────────── */}
            <section style={{ ...section, background: 'var(--surface)' }}>
                <div style={wrap}>
                    <Eyebrow n="06" text="Skills demonstrated" />
                    <Heading>Engineering &amp; design</Heading>
                    <p style={{ ...body, marginTop: 0, marginBottom: '24px', fontSize: isNarrow ? '14px' : '15px' }}>
                        Hover (or tap) any tag for what it means and where it shows up in the app.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(2, 1fr)', gap: isNarrow ? '20px' : '28px' }}>
                        <div>
                            <div style={{ ...mono, color: 'var(--text-muted)', marginBottom: '12px' }}>// Engineering</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {ENG_SKILLS.map(s => <SkillChip key={s.name} name={s.name} info={s.info} isNarrow={isNarrow} />)}
                            </div>
                        </div>
                        <div>
                            <div style={{ ...mono, color: 'var(--text-muted)', marginBottom: '12px' }}>// Design</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {DESIGN_SKILLS.map(s => <SkillChip key={s.name} name={s.name} info={s.info} accent isNarrow={isNarrow} />)}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 07 · Modules ────────────────────────────────────────────────── */}
            <section style={section}>
                <div style={wrap}>
                    <Eyebrow n="07" text="The modules" />
                    <Heading>Five interfaces</Heading>
                    <div style={{ border: '2px solid var(--text-primary)' }}>
                        {/* header row (desktop only) */}
                        {!isNarrow && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr', borderBottom: '2px solid var(--text-primary)', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                                {['Module', 'What it does', 'Airtable features'].map(h => (
                                    <div key={h} style={{ ...mono, padding: '12px 16px' }}>{h}</div>
                                ))}
                            </div>
                        )}
                        {MODULES.map((m, i) => (
                            <div key={m.name} style={{ display: isNarrow ? 'block' : 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr', borderTop: i === 0 && isNarrow ? 'none' : i === 0 ? 'none' : '1.5px solid var(--ink-line)', padding: isNarrow ? '14px 16px' : 0 }}>
                                <div style={{ padding: isNarrow ? '0' : '14px 16px', fontFamily: DISPLAY, fontSize: '18px', textTransform: 'uppercase', color: 'var(--text-primary)' }}>{m.name}</div>
                                <div style={{ padding: isNarrow ? '4px 0 0' : '14px 16px', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{m.what}</div>
                                <div style={{ padding: isNarrow ? '2px 0 0' : '14px 16px', ...mono, fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', alignSelf: 'center' }}>{m.ex}</div>
                            </div>
                        ))}
                    </div>

                    {/* Back to app CTA */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '32px' }}>
                        <Link href="/cheatsheet" style={{ ...mono, fontSize: '12px', textDecoration: 'none', padding: '14px 22px', background: 'var(--accent)', color: 'var(--accent-text)', border: '2px solid var(--text-primary)', boxShadow: '5px 5px 0 var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            Open the app <ArrowRightIcon size={14} weight="bold" />
                        </Link>
                        <Link href="/" style={{ ...mono, fontSize: '12px', textDecoration: 'none', padding: '14px 22px', background: 'var(--surface)', color: 'var(--text-primary)', border: '2px solid var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <ArrowLeftIcon size={14} weight="bold" /> Back to home
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────────────────────────── */}
            <footer style={{ borderTop: '2px solid var(--text-primary)', padding: isNarrow ? '20px 16px' : '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: DISPLAY, fontSize: '20px', textTransform: 'uppercase', color: 'var(--text-primary)' }}>DevDeck</span>
                <span style={{ ...mono, color: 'var(--text-muted)' }}>// built for the go</span>
            </footer>
        </div>
    );
}
