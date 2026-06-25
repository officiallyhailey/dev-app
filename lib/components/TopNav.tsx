'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ListIcon, XIcon } from '@phosphor-icons/react';
import { useIsNarrow } from '@/lib/useIsNarrow';

export const NAV_HEIGHT = 56;

const LINKS = [
    { href: '/', label: 'Home' },
    { href: '/cheatsheet', label: 'Cheat Sheets' },
    { href: '/devwork', label: 'Dev Work' },
    { href: '/events', label: 'Events' },
    { href: '/jobs', label: 'Jobs' },
    { href: '/tools', label: 'Tools' },
    { href: '/about', label: 'About' },
];

const DISPLAY = 'var(--font-display)';

const navLabel: React.CSSProperties = {
    fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
};

function isActive(pathname: string, href: string): boolean {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function TopNav() {
    const pathname = usePathname() ?? '/';
    const isNarrow = useIsNarrow();
    const [open, setOpen] = useState(false);

    // Close the mobile menu whenever the route changes.
    React.useEffect(() => { setOpen(false); }, [pathname]);

    const wordmark = (
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
            <span style={{ width: '28px', height: '28px', background: 'var(--accent)', border: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontSize: '17px', lineHeight: 1, color: 'var(--accent-text)', flexShrink: 0 }}>D</span>
            <span style={{ fontFamily: DISPLAY, fontSize: '22px', letterSpacing: '0.02em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>DevDeck</span>
        </Link>
    );

    return (
        <header style={{
            height: `${NAV_HEIGHT}px`, flexShrink: 0, position: 'relative', zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: isNarrow ? '0 14px' : '0 22px',
            background: 'var(--surface)', borderBottom: '2px solid var(--text-primary)',
        }}>
            {wordmark}

            {!isNarrow ? (
                <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {LINKS.map(link => {
                        const active = isActive(pathname, link.href);
                        return (
                            <Link key={link.href} href={link.href}
                                style={{
                                    ...navLabel, textDecoration: 'none', padding: '8px 13px',
                                    border: '2px solid', borderColor: active ? 'var(--text-primary)' : 'transparent',
                                    background: active ? 'var(--accent)' : 'transparent',
                                    color: active ? 'var(--accent-text)' : 'var(--text-primary)',
                                    transition: 'background 0.1s, color 0.1s, border-color 0.1s',
                                }}
                                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--text-primary)'; e.currentTarget.style.color = 'var(--surface)'; } }}
                                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; } }}>
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>
            ) : (
                <button aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(o => !o)}
                    style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: open ? 'var(--accent)' : 'var(--surface)', border: '2px solid var(--text-primary)', color: open ? 'var(--accent-text)' : 'var(--text-primary)', cursor: 'pointer' }}>
                    {open ? <XIcon size={20} weight="bold" /> : <ListIcon size={20} weight="bold" />}
                </button>
            )}

            {/* Mobile slide-down menu */}
            {isNarrow && open && (
                <nav style={{
                    position: 'absolute', top: `${NAV_HEIGHT}px`, left: 0, right: 0, zIndex: 1200,
                    background: 'var(--surface)', borderBottom: '2px solid var(--text-primary)',
                    display: 'flex', flexDirection: 'column', padding: '8px',
                    boxShadow: '0 14px 24px rgba(0,0,0,0.18)',
                }}>
                    {LINKS.map(link => {
                        const active = isActive(pathname, link.href);
                        return (
                            <Link key={link.href} href={link.href}
                                style={{
                                    fontFamily: 'var(--font-body)', fontSize: '17px', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.02em', textDecoration: 'none',
                                    padding: '15px 14px', margin: '3px 0', border: '2px solid var(--text-primary)',
                                    background: active ? 'var(--accent)' : 'var(--surface)',
                                    color: active ? 'var(--accent-text)' : 'var(--text-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                {link.label}
                                {active && <span style={{ fontFamily: DISPLAY, fontSize: '14px' }}>●</span>}
                            </Link>
                        );
                    })}
                </nav>
            )}
        </header>
    );
}
