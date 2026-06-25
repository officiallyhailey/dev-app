'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpenIcon, CodeIcon, CalendarBlankIcon, BriefcaseIcon, WrenchIcon, ArrowRightIcon } from '@phosphor-icons/react';
import { TopNav } from '@/lib/components/TopNav';
import { useIsNarrow } from '@/lib/useIsNarrow';

const DISPLAY = 'var(--font-display)';

const SECTIONS = [
    { href: '/cheatsheet', label: 'Cheat Sheets', desc: 'Searchable summaries, notes & language references.', Icon: BookOpenIcon, n: '01' },
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...mono, color: 'var(--text-muted)', marginBottom: '18px' }}>// Personal resource hub</div>
                        <h1 style={{
                            margin: 0, fontFamily: DISPLAY, textTransform: 'uppercase',
                            fontSize: 'clamp(46px, 11vw, 104px)', lineHeight: 0.9, letterSpacing: '0.005em',
                            color: 'var(--text-primary)',
                        }}>
                            Everything<br />you save,<br /><span style={{ background: 'var(--accent)', color: 'var(--accent-text)', padding: '0 0.12em', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>one&nbsp;deck.</span>
                        </h1>
                        <p style={{ fontSize: isNarrow ? '15px' : '17px', lineHeight: 1.6, fontWeight: 500, color: 'var(--text-muted)', margin: '22px 0 26px', maxWidth: '46ch' }}>
                            Cheat sheets, dev work, events, jobs and tools — pulled from your
                            Airtable base into one fast, brutalist workspace you can carry in your pocket.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
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

                    {/* Brutalist geometric graphic (hidden on the smallest screens) */}
                    {!isNarrow && (
                        <div style={{ flexShrink: 0, width: '320px', height: '320px' }} aria-hidden>
                            <svg viewBox="0 0 320 320" width="320" height="320" fill="none">
                                <rect x="22" y="22" width="276" height="276" stroke="var(--text-primary)" strokeWidth="2" />
                                <rect x="54" y="54" width="150" height="150" fill="var(--accent)" stroke="var(--text-primary)" strokeWidth="2" />
                                <rect x="128" y="128" width="150" height="150" fill="var(--surface)" stroke="var(--text-primary)" strokeWidth="2" />
                                <text x="143" y="210" fontFamily="Anton, Impact, sans-serif" fontSize="120" fill="var(--text-primary)">D</text>
                                <circle cx="78" cy="250" r="14" fill="var(--text-primary)" />
                                <line x1="232" y1="60" x2="288" y2="60" stroke="var(--text-primary)" strokeWidth="2" />
                                <line x1="260" y1="32" x2="260" y2="88" stroke="var(--text-primary)" strokeWidth="2" />
                            </svg>
                        </div>
                    )}
                </div>
            </section>

            {/* ── Kinetic marquee ────────────────────────────────────────────── */}
            <div style={{ borderTop: '2px solid var(--text-primary)', borderBottom: '2px solid var(--text-primary)', background: 'var(--accent)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div className="dd-marquee-track" style={{ display: 'inline-flex', animation: 'ddMarquee 18s linear infinite' }}>
                    {[0, 1].map(rep => (
                        <div key={rep} style={{ display: 'inline-flex', alignItems: 'center' }}>
                            {marqueeItems.map(item => (
                                <span key={item} style={{ display: 'inline-flex', alignItems: 'center', fontFamily: DISPLAY, fontSize: '26px', textTransform: 'uppercase', color: 'var(--accent-text)', padding: '10px 0' }}>
                                    <span style={{ padding: '0 22px' }}>{item}</span>
                                    <span style={{ fontSize: '16px' }}>✦</span>
                                </span>
                            ))}
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
