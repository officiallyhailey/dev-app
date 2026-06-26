'use client';

import { useEffect, useState } from 'react';
import { QuestionIcon, XIcon } from '@phosphor-icons/react';
import { useIsNarrow } from '@/lib/useIsNarrow';
import { modalOverlayStyle, modalCardStyle } from './modalStyle';
import { HELP, type HelpContent, type HelpPage } from '@/lib/help';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const DISPLAY = 'var(--font-display)';

/** A "?" button (drop into any interface header) that opens the page's help popup. */
export function HelpButton({ page, label }: { page: HelpPage; label?: string }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                aria-label="How to use this page"
                title="How to use this page"
                style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    width: label ? undefined : '36px', height: '36px', padding: label ? '0 12px' : 0,
                    border: '2px solid var(--text-primary)', background: 'var(--surface)', color: 'var(--text-primary)',
                    cursor: 'pointer', fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', flexShrink: 0,
                }}
            >
                <QuestionIcon size={16} weight="bold" />{label}
            </button>
            {open && <HelpModal content={HELP[page]} onClose={() => setOpen(false)} />}
        </>
    );
}

function HelpModal({ content, onClose }: { content: HelpContent; onClose: () => void }) {
    const isNarrow = useIsNarrow();

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    return (
        <div onClick={onClose} style={{ ...modalOverlayStyle(isNarrow), background: 'rgba(35,38,46,0.45)', backdropFilter: 'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()}
                style={{ ...modalCardStyle(isNarrow), borderRadius: isNarrow ? 0 : '8px', background: 'var(--surface)', border: '2px solid var(--text-primary)', boxShadow: '12px 12px 0 rgba(35,38,46,0.18)' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 18px', borderBottom: '2px solid var(--text-primary)', flexShrink: 0 }}>
                    <span style={{ fontFamily: DISPLAY, fontSize: '20px', textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.01em' }}>{content.title} · Guide</span>
                    <div onClick={onClose} title="Close"
                        style={{ width: '30px', height: '30px', border: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', flexShrink: 0 }}>
                        <XIcon size={15} weight="bold" />
                    </div>
                </div>

                {/* Body (readable column centered inside the standard modal outline) */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: isNarrow ? '20px 16px 28px' : '26px 24px 32px' }}>
                    <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {content.sections.map((s, i) => (
                            <div key={s.heading}>
                                <div style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '7px' }}>
                                    {String(i + 1).padStart(2, '0')} · {s.heading}
                                </div>
                                <div style={{ fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: 'var(--text-primary)' }}>{s.body}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
