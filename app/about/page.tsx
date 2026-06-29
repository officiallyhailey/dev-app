'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react';
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
    { label: 'Browser', sub: 'React UI · SWR · PWA', detail: 'Your phone or laptop runs the React app. It never holds the Airtable token — it only ever calls this app’s own /api routes.' },
    { label: 'API Proxy', sub: 'serverless · holds token', detail: 'A serverless function attaches the secret token and forwards the request to Airtable. This is the one and only place that token exists.' },
    { label: 'Airtable + Mapbox', sub: 'REST · geocoding', detail: 'Airtable returns the records; Mapbox geocodes addresses for the Jobs map. The response travels back through the proxy to the browser.' },
];

const STATS: { to: number; suffix: string; label: string }[] = [
    { to: 6, suffix: '', label: 'Interfaces, one codebase' },
    { to: 0, suffix: '', label: 'Secrets in the browser' },
    { to: 100, suffix: '%', label: 'TypeScript' },
    { to: 1, suffix: '', label: 'Password, fully gated' },
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
    { name: 'Component architecture', info: 'Shared building blocks — one nav, one modal size, one help popup, one loading state, plus common design tokens, brutalist primitives, a markdown renderer and cell-value helpers — keep every page consistent and make new sections quick to add.' },
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
    { name: 'Courses', what: 'Course tracker with progress', ex: 'Create (link → AI) · status · certificate upload' },
];

const CHIPS: { name: string; info: string }[] = [
    { name: 'Next.js', info: 'The React framework that powers both the pages and the server-side API routes — one codebase, one deploy, no separate backend.' },
    { name: 'React', info: 'The UI library. Components describe what the screen should look like for a given state, and React keeps the actual page in sync.' },
    { name: 'TypeScript', info: 'JavaScript with a type system. The compiler catches whole classes of bugs before the code ever runs, and the types double as documentation.' },
    { name: 'SWR', info: 'A data-fetching library that caches responses, dedupes identical requests, and revalidates after writes — so the screen always shows fresh data.' },
    { name: 'Airtable API', info: 'The REST API behind the spreadsheet-database that stores everything. Every read and write goes through it — but only via the server proxy.' },
    { name: 'Mapbox', info: 'Maps and geocoding. It turns a job’s address into map coordinates and renders the interactive map on the Jobs page.' },
    { name: 'Web Crypto', info: 'The runtime’s built-in cryptography. It signs the login cookie with HMAC-SHA256, so no third-party auth library is needed.' },
    { name: 'Vercel', info: 'The host. It serves the static pages and runs the serverless functions that hold the secret Airtable token.' },
    { name: 'PWA', info: 'Progressive Web App — a manifest plus icons let the site install to a phone’s home screen and launch full-screen, like a native app.' },
];

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

// One shared "which tooltip is open" value, so only a single popup shows at a time
// and a tap anywhere else (or Escape) dismisses it.
const TipContext = React.createContext<{ openId: string | null; setOpenId: React.Dispatch<React.SetStateAction<string | null>> }>({ openId: null, setOpenId: () => {} });

function TipProvider({ children }: { children: React.ReactNode }) {
    const [openId, setOpenId] = useState<string | null>(null);
    useEffect(() => {
        if (openId === null) return;
        const close = () => setOpenId(null);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenId(null); };
        // Chips stop propagation on their own clicks, so this only fires for taps elsewhere.
        document.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', onKey); };
    }, [openId]);
    return <TipContext.Provider value={{ openId, setOpenId }}>{children}</TipContext.Provider>;
}

// A skill tag that reveals a plain-English explanation on hover (desktop) or tap (mobile).
function SkillChip({ name, info, accent, isNarrow }: { name: string; info: string; accent?: boolean; isNarrow: boolean }) {
    const id = React.useId();
    const { openId, setOpenId } = React.useContext(TipContext);
    const open = openId === id;
    // Desktop hovers open/close directly; opening one always replaces any other.
    const hover = isNarrow ? {} : {
        onMouseEnter: () => setOpenId(id),
        onMouseLeave: () => setOpenId(prev => (prev === id ? null : prev)),
    };

    // Keep the tooltip inside the viewport: it's centered over the chip by default,
    // so chips near a screen edge would overflow. Measure once open and nudge it back.
    const tipRef = React.useRef<HTMLSpanElement | null>(null);
    const [shiftX, setShiftX] = useState(0);
    React.useLayoutEffect(() => {
        if (!open) { setShiftX(0); return; }
        const el = tipRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const gutter = 8;
        if (r.left < gutter) setShiftX(gutter - r.left);
        else if (r.right > window.innerWidth - gutter) setShiftX((window.innerWidth - gutter) - r.right);
        else setShiftX(0);
    }, [open]);

    return (
        <span style={{ position: 'relative', display: 'inline-block' }} {...hover} onClick={e => e.stopPropagation()}>
            <button
                onClick={() => setOpenId(prev => (prev === id ? null : id))}
                onFocus={() => setOpenId(id)}
                onBlur={() => setOpenId(prev => (prev === id ? null : prev))}
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
                <span ref={tipRef} role="tooltip" style={{
                    position: 'absolute', bottom: 'calc(100% + 9px)', left: '50%',
                    transform: `translateX(-50%) translateX(${shiftX}px)`,
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

function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Fades + lifts its children into view the first time they're scrolled to.
function Reveal({ children, style, delay = 0 }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number }) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (prefersReducedMotion()) { setShown(true); return; }
        const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return (
        <div ref={ref} style={{ ...style, opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(20px)', transition: `opacity 0.55s ease ${delay}ms, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms` }}>
            {children}
        </div>
    );
}

// Counts up from 0 to `to` the first time it scrolls into view.
function CountUp({ to, suffix = '', duration = 1100 }: { to: number; suffix?: string; duration?: number }) {
    const ref = useRef<HTMLSpanElement | null>(null);
    const [val, setVal] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (prefersReducedMotion()) { setVal(to); return; }
        let raf = 0; let start = 0;
        const io = new IntersectionObserver(es => {
            if (!es[0].isIntersecting) return;
            io.disconnect();
            const step = (t: number) => {
                if (!start) start = t;
                const p = Math.min(1, (t - start) / duration);
                setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
                if (p < 1) raf = requestAnimationFrame(step);
            };
            raf = requestAnimationFrame(step);
        }, { threshold: 0.5 });
        io.observe(el);
        return () => { io.disconnect(); cancelAnimationFrame(raf); };
    }, [to, duration]);
    return <span ref={ref}>{val}{suffix}</span>;
}

// The request path: the user selects a step to read what it does. No auto-rotation,
// so the description box never resizes on its own and the page stays put.
function FlowDiagram({ isNarrow }: { isNarrow: boolean }) {
    const [selected, setSelected] = useState(0);
    return (
        <div>
            <div style={{ display: 'flex', flexDirection: isNarrow ? 'column' : 'row', alignItems: 'stretch' }}>
                {FLOW.map((step, i) => {
                    const on = selected === i;
                    return (
                        <React.Fragment key={step.label}>
                            <div
                                onClick={() => setSelected(i)}
                                aria-pressed={on}
                                style={{ flex: 1, cursor: 'pointer', border: '2px solid var(--text-primary)', padding: '18px', transition: 'background 0.3s, color 0.3s, box-shadow 0.2s', background: on ? 'var(--accent)' : 'var(--surface)', color: on ? 'var(--accent-text)' : 'var(--text-primary)', boxShadow: on ? '5px 5px 0 var(--text-primary)' : 'none' }}>
                                <div style={{ fontFamily: DISPLAY, fontSize: '21px', textTransform: 'uppercase', lineHeight: 1 }}>{step.label}</div>
                                <div style={{ ...mono, marginTop: '8px', opacity: 0.75 }}>{step.sub}</div>
                            </div>
                            {i < FLOW.length - 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isNarrow ? '6px 0' : '0 8px', fontFamily: DISPLAY, fontSize: '24px', color: 'var(--text-primary)', transition: 'opacity 0.3s', opacity: selected === i || selected === i + 1 ? 1 : 0.35 }}>
                                    {isNarrow ? '↓' : '→'}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            {/* Reserved height for the longest detail so swapping steps never shifts the page. */}
            <div style={{ marginTop: '16px', border: '2px solid var(--text-primary)', background: 'var(--page)', padding: '14px 16px', minHeight: isNarrow ? '150px' : '96px', display: 'flex', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, fontWeight: 500, color: 'var(--text-primary)' }}>
                    <span style={{ ...mono, color: 'var(--accent-deep, var(--text-primary))', marginRight: '8px' }}>{FLOW[selected].label}</span>
                    {FLOW[selected].detail}
                </p>
            </div>
        </div>
    );
}

const NORM_EXAMPLES = [
    { field: 'Languages — multi-select', raw: '["SQL", "Python"]', out: '[{ name: "SQL" }, { name: "Python" }]', note: 'The REST API sends plain strings; the old SDK gave objects — so the adapter wraps each value back into { name }.' },
    { field: 'Summary — AI text', raw: '{ state: "generated", value: "A SQL cheat sheet…" }', out: '"A SQL cheat sheet…"', note: 'AI fields arrive as an object with a status. The UI just wants the text, so normalize pulls out value.' },
    { field: 'Final Language — formula', raw: '"SQL, Python"', out: '["SQL", "Python"]', note: 'A formula returns one comma-joined string, but the card renders a list — so it gets split back apart.' },
];

// "Show, don't tell": a live before/after of the normalization layer.
function NormalizeDemo() {
    const [i, setI] = useState(0);
    const ex = NORM_EXAMPLES[i];
    const codeBox: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12.5px', lineHeight: 1.5, background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', padding: '12px 14px', wordBreak: 'break-word', color: 'var(--text-primary)' };
    const tag: React.CSSProperties = { ...mono, fontSize: '9px', color: 'var(--text-muted)', marginBottom: '5px' };
    return (
        <div style={{ border: '2px solid var(--text-primary)', background: 'var(--page)', padding: '18px', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <div style={{ ...mono, color: 'var(--accent-deep, var(--text-primary))' }}>// Normalize · live example</div>
                <button onClick={() => setI(n => (n + 1) % NORM_EXAMPLES.length)}
                    style={{ ...mono, fontSize: '10px', cursor: 'pointer', padding: '9px 13px', border: '2px solid var(--text-primary)', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                    See another →
                </button>
            </div>
            <div style={{ ...mono, color: 'var(--text-muted)', marginBottom: '12px' }}>{ex.field}</div>
            <div>
                <div style={tag}>Airtable sends</div>
                <div style={codeBox}>{ex.raw}</div>
            </div>
            <div style={{ textAlign: 'center', fontFamily: DISPLAY, fontSize: '20px', color: 'var(--text-primary)', margin: '6px 0' }}>↓</div>
            <div>
                <div style={tag}>What the UI reads</div>
                <div style={{ ...codeBox, border: '2px solid var(--text-primary)' }}>{ex.out}</div>
            </div>
            <p style={{ margin: '14px 0 0', fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: 'var(--text-muted)' }}>{ex.note}</p>
        </div>
    );
}

export default function About() {
    const isNarrow = useIsNarrow();
    const body: React.CSSProperties = { fontSize: isNarrow ? '15px' : '16px', lineHeight: 1.7, fontWeight: 500, color: 'var(--text-muted)', maxWidth: '70ch' };
    const section: React.CSSProperties = { padding: isNarrow ? '36px 16px' : '56px 32px', borderTop: '2px solid var(--text-primary)' };
    const wrap: React.CSSProperties = { maxWidth: '1040px', margin: '0 auto' };

    return (
        <TipProvider>
        <div style={{ minHeight: '100dvh', background: 'var(--page)', display: 'flex', flexDirection: 'column' }}>
            <ScrollProgress />
            <div style={{ position: 'sticky', top: 0, zIndex: 1200 }}><TopNav /></div>

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <header style={{
                padding: isNarrow ? '40px 16px 32px' : '64px 32px 48px',
                backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
            }}>
                <Reveal style={wrap}>
                    <div style={{ ...mono, color: 'var(--text-muted)', marginBottom: '16px' }}>// Engineering write-up</div>
                    <h1 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 'clamp(40px, 9vw, 88px)', textTransform: 'uppercase', lineHeight: 0.92, color: 'var(--text-primary)' }}>
                        How it&apos;s built
                    </h1>
                    <p style={{ ...body, margin: '20px 0 24px' }}>
                        Curious how it works? Here&apos;s the whole thing, start to finish. DevDeck is a standalone,
                        mobile-first web app that surfaces an Airtable base <em>outside</em> of Airtable.
                        Airtable&apos;s own Interface Extensions only run on desktop inside its runtime, so this
                        project re-implements that data layer on the Airtable REST API — the same tools now work
                        on a phone, install as a PWA, and keep the secret token safely on the server.
                    </p>
                    <div style={{ ...mono, color: 'var(--text-muted)', fontSize: '9px', marginBottom: '10px' }}>// Hover or tap any tag for what it is</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {CHIPS.map(c => <SkillChip key={c.name} name={c.name} info={c.info} isNarrow={isNarrow} />)}
                    </div>
                </Reveal>
            </header>

            {/* ── By the numbers ──────────────────────────────────────────────── */}
            <section style={{ ...section, paddingTop: isNarrow ? '26px' : '34px', paddingBottom: isNarrow ? '26px' : '34px' }}>
                <Reveal style={{ maxWidth: '1040px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '2px', background: 'var(--text-primary)', border: '2px solid var(--text-primary)' }}>
                        {STATS.map(s => (
                            <div key={s.label} style={{ background: 'var(--page)', padding: isNarrow ? '18px 14px' : '24px 18px' }}>
                                <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(34px, 7vw, 54px)', lineHeight: 1, color: 'var(--text-primary)' }}>
                                    <CountUp to={s.to} suffix={s.suffix} />
                                </div>
                                <div style={{ ...mono, color: 'var(--text-muted)', marginTop: '8px' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </Reveal>
            </section>

            {/* ── 01 · Request flow ───────────────────────────────────────────── */}
            <section style={section}>
                <Reveal style={wrap}>
                    <Eyebrow n="01" text="Request flow" />
                    <Heading>One secure path</Heading>
                    <p style={{ ...body, marginTop: 0, marginBottom: '26px' }}>
                        The rule that shapes everything: the Airtable token must never reach the browser.
                        The client calls a thin serverless proxy that attaches the token and forwards to
                        Airtable. Mapbox uses a separate, public token and is safe to call directly.
                        <em> Select any step</em> to see what it does.
                    </p>
                    <FlowDiagram isNarrow={isNarrow} />
                </Reveal>
            </section>

            {/* ── 02 · Tech stack ─────────────────────────────────────────────── */}
            <section style={section}>
                <Reveal style={wrap}>
                    <Eyebrow n="02" text="Tech stack" />
                    <Heading>What it&apos;s made of</Heading>
                    <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(3, 1fr)', gap: isNarrow ? '14px' : '18px' }}>
                        {STACK.map(row => <Card key={row.k}><KV k={row.k} v={row.v} /></Card>)}
                    </div>
                </Reveal>
            </section>

            {/* ── 03 · Hosting & delivery ─────────────────────────────────────── */}
            <section style={section}>
                <Reveal style={wrap}>
                    <Eyebrow n="03" text="Hosting & delivery" />
                    <Heading>How it ships</Heading>
                    <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(2, 1fr)', gap: isNarrow ? '14px' : '18px' }}>
                        {HOSTING.map(row => <Card key={row.k}><KV k={row.k} v={row.v} /></Card>)}
                    </div>
                </Reveal>
            </section>

            {/* ── 04 · Security ───────────────────────────────────────────────── */}
            <section style={{ ...section, background: 'var(--surface)' }}>
                <Reveal style={wrap}>
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
                </Reveal>
            </section>

            {/* ── 05 · Architecture ───────────────────────────────────────────── */}
            <section style={section}>
                <Reveal style={wrap}>
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
                    <NormalizeDemo />
                </Reveal>
            </section>

            {/* ── 06 · Skills ─────────────────────────────────────────────────── */}
            <section style={{ ...section, background: 'var(--surface)' }}>
                <Reveal style={wrap}>
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
                </Reveal>
            </section>

            {/* ── 07 · Modules ────────────────────────────────────────────────── */}
            <section style={section}>
                <Reveal style={wrap}>
                    <Eyebrow n="07" text="The modules" />
                    <Heading>Six interfaces</Heading>
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

                    {/* Back to home */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '32px' }}>
                        <Link href="/" style={{ ...mono, fontSize: '12px', textDecoration: 'none', padding: '14px 22px', background: 'var(--surface)', color: 'var(--text-primary)', border: '2px solid var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <ArrowLeftIcon size={14} weight="bold" /> Back to home
                        </Link>
                    </div>
                </Reveal>
            </section>

            {/* ── Footer ──────────────────────────────────────────────────────── */}
            <footer style={{ borderTop: '2px solid var(--text-primary)', padding: isNarrow ? '20px 16px' : '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: DISPLAY, fontSize: '20px', textTransform: 'uppercase', color: 'var(--text-primary)' }}>DevDeck</span>
                <span style={{ ...mono, color: 'var(--text-muted)' }}>// built for the go</span>
            </footer>
        </div>
        </TipProvider>
    );
}
