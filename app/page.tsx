'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpenIcon, CodeIcon, CalendarBlankIcon, BriefcaseIcon, WrenchIcon, ArrowRightIcon } from '@phosphor-icons/react';
import { TopNav } from '@/lib/components/TopNav';
import { useIsNarrow } from '@/lib/useIsNarrow';

const DISPLAY = 'var(--font-display)';

const SECTIONS = [
    { href: '/cheatsheet', label: 'Cheat Sheets', desc: 'AI generated summaries, notes & language references.', Icon: BookOpenIcon, n: '01' },
    { href: '/devwork', label: 'Dev Work', desc: 'Snippets, links and attachments from your projects.', Icon: CodeIcon, n: '02' },
    { href: '/events', label: 'Events', desc: 'Agendas, deadlines and conferences on a timeline.', Icon: CalendarBlankIcon, n: '03' },
    { href: '/jobs', label: 'Jobs', desc: 'Opportunities plotted on an interactive map.', Icon: BriefcaseIcon, n: '04' },
    { href: '/tools', label: 'Tools', desc: 'Platforms and resources, organised by category.', Icon: WrenchIcon, n: '05' },
];

const mono: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
};

function FeatureCard({ href, label, desc, Icon, n }: typeof SECTIONS[number]) {
    const [hover, setHover] = React.useState(false);
    return (
        <Link href={href}
            onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            style={{
                position: 'relative', textDecoration: 'none', display: 'flex', flexDirection: 'column',
                gap: '14px', padding: '22px', minHeight: '188px',
                background: hover ? 'var(--accent)' : 'var(--surface)',
                color: hover ? 'var(--accent-text)' : 'var(--text-primary)',
                border: '2px solid var(--text-primary)',
                boxShadow: hover ? '8px 8px 0 var(--text-primary)' : '0 0 0 var(--text-primary)',
                transform: hover ? 'translate(-2px,-2px)' : 'none',
                transition: 'background 0.12s, box-shadow 0.12s, transform 0.12s, color 0.12s',
            }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Icon size={34} weight="bold" />
                <span style={{ ...mono, opacity: 0.6 }}>{n}</span>
            </div>
            <div style={{ marginTop: 'auto' }}>
                <div style={{ fontFamily: DISPLAY, fontSize: '26px', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.01em' }}>{label}</div>
                <div style={{ fontSize: '13.5px', lineHeight: 1.5, marginTop: '8px', fontWeight: 500, opacity: hover ? 0.85 : 0.7 }}>{desc}</div>
            </div>
            <div style={{ ...mono, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Open <ArrowRightIcon size={13} weight="bold" />
            </div>
        </Link>
    );
}

// Featured hero visual: the user's retro-computer image, with a brutalist
// line-art computer as a fallback until /public/hero-computer.png is added.
function HeroComputer({ isNarrow }: { isNarrow: boolean }) {
    // Show the brutalist SVG by default; swap in /hero-computer.png only once it
    // actually loads, so a missing file never shows a broken-image icon.
    const [imgOk, setImgOk] = React.useState(false);
    React.useEffect(() => {
        const img = new window.Image();
        img.onload = () => setImgOk(true);
        img.onerror = () => setImgOk(false);
        img.src = '/hero-computer.png';
    }, []);
    const size = isNarrow ? 220 : 340;
    const box: React.CSSProperties = {
        flexShrink: 0, width: size, height: size, order: isNarrow ? -1 : 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    };
    if (imgOk) {
        return (
            <div style={box} aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/hero-computer.png" alt="Retro computer"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
        );
    }
    return (
        <div style={box} aria-hidden>
            <svg viewBox="0 0 320 300" width="100%" height="100%" fill="none">
                <rect x="56" y="22" width="208" height="156" rx="8" fill="var(--surface)" stroke="var(--text-primary)" strokeWidth="3" />
                <rect x="76" y="42" width="168" height="104" fill="var(--accent)" stroke="var(--text-primary)" strokeWidth="2" />
                <g stroke="var(--accent-text)" strokeWidth="4" strokeLinecap="round">
                    <line x1="92" y1="66" x2="216" y2="66" />
                    <line x1="92" y1="86" x2="186" y2="86" />
                    <line x1="92" y1="106" x2="208" y2="106" />
                    <line x1="92" y1="126" x2="158" y2="126" />
                </g>
                <circle cx="232" cy="162" r="5" fill="var(--text-primary)" />
                <rect x="142" y="178" width="36" height="18" fill="var(--surface)" stroke="var(--text-primary)" strokeWidth="3" />
                <rect x="34" y="208" width="252" height="58" rx="8" fill="var(--surface)" stroke="var(--text-primary)" strokeWidth="3" />
                <g stroke="var(--text-primary)" strokeWidth="3" strokeLinecap="round">
                    <line x1="56" y1="226" x2="78" y2="226" /><line x1="90" y1="226" x2="112" y2="226" /><line x1="124" y1="226" x2="146" y2="226" /><line x1="158" y1="226" x2="180" y2="226" /><line x1="192" y1="226" x2="214" y2="226" /><line x1="226" y1="226" x2="262" y2="226" />
                    <line x1="56" y1="246" x2="92" y2="246" /><line x1="104" y1="246" x2="180" y2="246" /><line x1="192" y1="246" x2="262" y2="246" />
                </g>
            </svg>
        </div>
    );
}


export default function Landing() {
    const isNarrow = useIsNarrow();
    const marqueeItems = ['Cheat Sheets', 'Dev Work', 'Events', 'Jobs', 'Tools'];

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--page)', display: 'flex', flexDirection: 'column' }}>
            <style>{`
                @keyframes ddMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                @media (prefers-reduced-motion: reduce) { .dd-marquee-track { animation: none !important; } }
                .dd-cta:hover { background: var(--accent) !important; color: var(--accent-text) !important; }
            `}</style>

            <div style={{ position: 'sticky', top: 0, zIndex: 1200 }}><TopNav /></div>

            {/* ── Hero ───────────────────────────────────────────────────────── */}
            <section style={{
                position: 'relative', padding: isNarrow ? '36px 16px 28px' : '64px 32px 48px',
                backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
                backgroundSize: '40px 40px', overflow: 'hidden',
            }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: isNarrow ? 'column' : 'row', gap: isNarrow ? '28px' : '40px', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0, textAlign: isNarrow ? 'center' : 'left' }}>
                        <div style={{ ...mono, color: 'var(--text-muted)', marginBottom: '18px' }}>// Personal resource hub</div>
                        <h1 style={{
                            margin: 0, fontFamily: DISPLAY, textTransform: 'uppercase',
                            fontSize: 'clamp(46px, 11vw, 104px)', lineHeight: 0.98, letterSpacing: '0.005em',
                            color: 'var(--text-primary)',
                        }}>
                            <span style={{ display: 'block' }}>Everything</span>
                            <span style={{ display: 'block' }}>you save,</span>
                            <span style={{ display: 'inline-block', marginTop: '0.1em', background: 'var(--accent)', color: 'var(--accent-text)', padding: '0.04em 0.16em 0.1em' }}>one&nbsp;deck.</span>
                        </h1>
                        <p style={{ fontSize: isNarrow ? '15px' : '17px', lineHeight: 1.6, fontWeight: 500, color: 'var(--text-muted)', margin: isNarrow ? '22px auto 26px' : '22px 0 26px', maxWidth: '46ch' }}>
                           AI powered tool to help you organize your dev resources, notes, and references in one place. Save time and stay productive with DevDeck. API integration coming from airtable agents, Mapbox, and more. Stay tuned for updates and new features!
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: isNarrow ? 'center' : 'flex-start' }}>
                            <Link href="/cheatsheet" style={{
                                ...mono, fontSize: '12px', textDecoration: 'none', padding: '14px 22px',
                                background: 'var(--accent)', color: 'var(--accent-text)', border: '2px solid var(--text-primary)',
                                boxShadow: '5px 5px 0 var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '8px',
                            }}>
                                Start exploring <ArrowRightIcon size={14} weight="bold" />
                            </Link>
                            <a href="#sections" className="dd-cta" style={{
                                ...mono, fontSize: '12px', textDecoration: 'none', padding: '14px 22px',
                                background: 'var(--surface)', color: 'var(--text-primary)', border: '2px solid var(--text-primary)',
                                transition: 'background 0.12s, color 0.12s',
                            }}>
                                Browse sections
                            </a>
                        </div>
                    </div>

                    {/* Featured retro-computer hero visual (desktop + mobile) */}
                    <HeroComputer isNarrow={isNarrow} />
                </div>
            </section>

            {/* ── "How it's built" teaser → dedicated /about page ────────────── */}
            <Link href="/about" style={{ textDecoration: 'none', display: 'block', borderTop: '2px solid var(--text-primary)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isNarrow ? '22px 16px' : '28px 32px', display: 'flex', flexDirection: isNarrow ? 'column' : 'row', alignItems: isNarrow ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '14px' }}>
                    <div>
                        <div style={{ ...mono, color: 'var(--text-muted)', marginBottom: '8px' }}>// Under the hood</div>
                        <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(22px, 5vw, 34px)', textTransform: 'uppercase', lineHeight: 1, color: 'var(--text-primary)' }}>
                            See how it&apos;s built
                        </div>
                        <div style={{ fontSize: isNarrow ? '13.5px' : '15px', fontWeight: 500, color: 'var(--text-muted)', marginTop: '8px', maxWidth: '60ch' }}>
                            Architecture, tech stack, hosting, security and the engineering &amp; design decisions behind DevDeck.
                        </div>
                    </div>
                    <span style={{ ...mono, fontSize: '12px', flexShrink: 0, padding: '14px 22px', background: 'var(--accent)', color: 'var(--accent-text)', border: '2px solid var(--text-primary)', boxShadow: '5px 5px 0 var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        Read the write-up <ArrowRightIcon size={14} weight="bold" />
                    </span>
                </div>
            </Link>

            {/* ── Kinetic marquee ────────────────────────────────────────────── */}
            <div style={{ borderTop: '2px solid var(--text-primary)', borderBottom: '2px solid var(--text-primary)', background: 'var(--accent)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div className="dd-marquee-track" style={{ display: 'inline-flex', animation: 'ddMarquee 26s linear infinite' }}>
                    {/* Two identical sequences, each wide enough to fill any screen, so
                        translateX(-50%) loops with no visible gap. */}
                    {[0, 1].map(seq => (
                        <div key={seq} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                            {Array.from({ length: 4 }).flatMap((_, k) =>
                                marqueeItems.map((item, i) => (
                                    <span key={`${k}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', fontFamily: DISPLAY, fontSize: '26px', textTransform: 'uppercase', color: 'var(--accent-text)', padding: '10px 0' }}>
                                        <span style={{ padding: '0 22px' }}>{item}</span>
                                        <span style={{ fontSize: '16px' }}>✦</span>
                                    </span>
                                )),
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Sections ───────────────────────────────────────────────────── */}
            <section id="sections" style={{ flex: 1, padding: isNarrow ? '28px 16px 48px' : '48px 32px 72px' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', marginBottom: '22px', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 'clamp(28px, 6vw, 44px)', textTransform: 'uppercase', lineHeight: 1, color: 'var(--text-primary)' }}>Pick a section</h2>
                        <span style={{ ...mono, color: 'var(--text-muted)' }}>05 modules</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: isNarrow ? '14px' : '18px' }}>
                        {SECTIONS.map(s => <FeatureCard key={s.href} {...s} />)}
                    </div>
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <footer style={{ borderTop: '2px solid var(--text-primary)', padding: isNarrow ? '20px 16px' : '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: DISPLAY, fontSize: '20px', textTransform: 'uppercase', color: 'var(--text-primary)' }}>DevDeck</span>
                <span style={{ ...mono, color: 'var(--text-muted)' }}>// built for the go</span>
            </footer>
        </div>
    );
}
