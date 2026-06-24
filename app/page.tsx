'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpenIcon, CodeIcon, CalendarBlankIcon, BriefcaseIcon, WrenchIcon, ArrowRightIcon } from '@phosphor-icons/react';

const ACCENT = '#F5C13D';
const ACCENT_TEXT = '#2c2510';
const INK = '#23262e';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const APPS = [
    { href: '/cheatsheet', label: 'Cheat Sheets', desc: 'Search summaries, notes & languages', Icon: BookOpenIcon },
    { href: '/devwork', label: 'Dev Work', desc: 'Snippets, links & attachments', Icon: CodeIcon },
    { href: '/events', label: 'Events', desc: 'Agenda, dates & conferences', Icon: CalendarBlankIcon },
    { href: '/jobs', label: 'Jobs', desc: 'Opportunities on the map', Icon: BriefcaseIcon },
    { href: '/tools', label: 'Tools', desc: 'Platforms & resources by category', Icon: WrenchIcon },
];

export default function Hub() {
    const monoLabel: React.CSSProperties = { fontFamily: MONO, fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' };
    return (
        <div style={{
            minHeight: '100vh', background: 'var(--page, #f4f4f5)',
            backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
            backgroundSize: '38px 38px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px 56px',
        }}>
            <div style={{ width: '100%', maxWidth: '720px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '7px', background: ACCENT, border: `1.5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: ACCENT_TEXT, fontFamily: MONO, fontSize: '14px' }}>Dev</div>
                    <div style={{ fontFamily: MONO, fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>Workspace</div>
                </div>
                <h1 style={{ margin: '18px 0 28px', fontFamily: MONO, fontSize: 'clamp(30px, 7vw, 52px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 0.95, textTransform: 'uppercase' }}>
                    Pick an<br /><span style={{ color: 'var(--text-primary)' }}>interface</span><span style={{ color: ACCENT }}>_</span>
                </h1>

                {/* Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                    {APPS.map(({ href, label, desc, Icon }) => (
                        <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                            <div
                                style={{ position: 'relative', borderRadius: '6px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', cursor: 'pointer', transition: 'border-color 0.16s, transform 0.16s' }}
                                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = ACCENT; el.style.transform = 'translateY(-3px)'; }}
                                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--ink-line)'; el.style.transform = 'translateY(0)'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '9px', background: 'var(--surface-2)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                                        <Icon size={22} weight="bold" color={ACCENT} />
                                    </div>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--surface-2)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                                        <ArrowRightIcon size={14} weight="bold" />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{label}</div>
                                    <div style={{ marginTop: '5px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.45 }}>{desc}</div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div style={{ ...monoLabel, color: 'var(--text-muted)', marginTop: '28px', textAlign: 'center' }}>// Dev Tool · {APPS.length} interfaces</div>
            </div>
        </div>
    );
}
