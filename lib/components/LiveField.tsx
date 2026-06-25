'use client';

import React from 'react';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/**
 * A field in a "New" form that fills itself in: shows a shimmer placeholder
 * while the AI value is empty, then fades the value in once it arrives. The
 * parent re-reads the freshly-created record (useRecords polls), so this just
 * reflects whatever `value` currently holds.
 */
export function LiveField({ label, value, render }: { label: string; value: string; render?: (v: string) => React.ReactNode }) {
    const filled = value.trim().length > 0;
    return (
        <div>
            <div style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</div>
            {filled ? (
                <div className="dd-fade-in" style={{ border: '2px solid var(--text-primary)', background: 'var(--surface)', padding: '12px 14px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                    {render ? render(value) : value}
                </div>
            ) : (
                <div style={{ border: '2px solid var(--text-primary)', background: 'var(--surface)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[88, 64].map((w, i) => (
                        <div key={i} className="dd-shimmer" style={{ height: '10px', width: `${w}%`, borderRadius: '2px' }} />
                    ))}
                </div>
            )}
        </div>
    );
}
