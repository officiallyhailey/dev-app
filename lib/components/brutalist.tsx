import React from 'react';

// ── Brutalist design tokens & primitives ──────────────────────────────────────
// A JS mirror of the brutalist palette in theme.css, plus the small framed-panel
// building blocks shared across the interface pages. Colours that need to react to
// light/dark are referenced as CSS variables (var(--…)); the fixed brand inks live
// here as constants so they can be used in inline styles.

export const ACCENT      = '#F5C13D'; // amber primary
export const ACCENT_DEEP = '#E3A81B'; // darker amber (tags / icons on tint)
export const ACCENT_TEXT = '#2c2510'; // dark text on amber
export const INK         = '#23262e'; // charcoal (line-art ink / titles / pills)

export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
export const monoLabel: React.CSSProperties = { fontFamily: MONO, fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' };

// Decorative corner ticks on a framed (position: relative) panel.
export function CornerBrackets({ inset = 8, size = 11, color = 'var(--ink-line)' }: { inset?: number; size?: number; color?: string }) {
    const b = `1.5px solid ${color}`;
    const base: React.CSSProperties = { position: 'absolute', width: `${size}px`, height: `${size}px`, pointerEvents: 'none', zIndex: 3 };
    return (
        <>
            <div style={{ ...base, top: inset, left: inset, borderTop: b, borderLeft: b }} />
            <div style={{ ...base, top: inset, right: inset, borderTop: b, borderRight: b }} />
            <div style={{ ...base, bottom: inset, left: inset, borderBottom: b, borderLeft: b }} />
            <div style={{ ...base, bottom: inset, right: inset, borderBottom: b, borderRight: b }} />
        </>
    );
}

// A black "// LABEL" header bar (spec-table style).
export function BlackLabel({ text }: { text: string }) {
    return <div style={{ ...monoLabel, padding: '7px 12px', color: '#fff', background: INK }}>{text}</div>;
}

// Bordered mono tag (square). `accent` tints it amber.
export function Tag({ text, accent }: { text: string; accent?: boolean }) {
    return <span style={{ ...monoLabel, padding: '3px 8px', borderRadius: '3px', whiteSpace: 'nowrap', color: accent ? ACCENT_DEEP : 'var(--text-muted)', background: accent ? 'var(--accent-soft)' : 'transparent', border: `1.2px solid ${accent ? 'transparent' : 'var(--ink-line)'}` }}>{text}</span>;
}

// Mono "// section" label that sits above a block of content.
export function SectionLabel({ text }: { text: string }) {
    return <div style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: '10px' }}>{text}</div>;
}
