'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useBase, useRecords, AirtableBoundary, FieldType } from '@/lib/airtable/hooks';
import { Shell } from '@/lib/components/Shell';
import { useIsNarrow } from '@/lib/useIsNarrow';
import { modalOverlayStyle, modalCardStyle } from '@/lib/components/modalStyle';
import { HelpButton } from '@/lib/components/InfoModal';
import { LiveField } from '@/lib/components/LiveField';
type Field = any;
import { LinkIcon, XIcon, MagnifyingGlassIcon, ArrowUpRightIcon, ArrowRightIcon, ArrowLeftIcon, CaretRightIcon, SquaresFourIcon, PlusIcon } from '@phosphor-icons/react';

const ACCENT      = '#F5C13D'; // amber primary
const ACCENT_DEEP = '#E3A81B'; // darker amber (tags / icons on tint)
const ACCENT_TEXT = '#2c2510'; // dark text on amber
const INK         = '#23262e'; // charcoal (line-art ink / titles / pills)
const TEAL        = INK;       // secondary accent is charcoal to match the devwork theme

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const monoLabel: React.CSSProperties = { fontFamily: MONO, fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' };

// ── Brutalist primitives ──────────────────────────────────────────────────────
function CornerBrackets({ inset = 8, size = 11, color = 'var(--ink-line)' }: { inset?: number; size?: number; color?: string }) {
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

// A black "// LABEL" header bar (ORBIT / Manual spec-table style)
function BlackLabel({ text }: { text: string }) {
    return <div style={{ ...monoLabel, padding: '7px 12px', color: '#fff', background: INK }}>{text}</div>;
}

// Bordered mono tag (square)
function Tag({ text, accent }: { text: string; accent?: boolean }) {
    return <span style={{ ...monoLabel, padding: '3px 8px', borderRadius: '3px', whiteSpace: 'nowrap', color: accent ? ACCENT_DEEP : 'var(--text-muted)', background: accent ? 'var(--accent-soft)' : 'transparent', border: `1.2px solid ${accent ? 'transparent' : 'var(--ink-line)'}` }}>{text}</span>;
}

// ── Field helpers ───────────────────────────────────────────────────────────────
function getFaviconUrl(record: any, faviconField: any): string | null {
    if (!faviconField) return null;
    const v = record.getCellValue(faviconField);
    if (!Array.isArray(v) || v.length === 0) return null;
    const att = v[0];
    return att?.thumbnails?.small?.url ?? att?.url ?? null;
}

function getCreatedTime(record: any, createdField: any): number {
    if (!createdField) return 0;
    const raw = record.getCellValue(createdField);
    if (typeof raw === 'number') return raw;
    if (raw instanceof Date) return raw.getTime();
    if (typeof raw === 'string') { const t = Date.parse(raw); if (!Number.isNaN(t)) return t; }
    // Fallback: the formatted string (handles cases where getCellValue returns an object/null)
    const s = record.getCellValueAsString(createdField);
    const t = Date.parse(s);
    return Number.isNaN(t) ? 0 : t;
}

// Favicon image with LinkIcon fallback (used in cards and the detail header)
function FaviconIcon({ url, iconSize }: { url: string | null; iconSize: number }) {
    const [failed, setFailed] = useState(false);
    if (url && !failed) {
        return (
            <img src={url} alt="" onError={() => setFailed(true)}
                style={{ width: `${iconSize}px`, height: `${iconSize}px`, borderRadius: '7px', objectFit: 'cover', display: 'block' }} />
        );
    }
    return <LinkIcon size={iconSize} color={TEAL} weight="bold" />;
}

// ── Markdown ──────────────────────────────────────────────────────────────────
function renderInline(line: string): React.ReactNode[] {
    line = line.replace(/^\*{2,3}|\*{2,3}$/g, '').trim();
    const parts: React.ReactNode[] = [];
    const re = /(\*{3}(.+?)\*{3}|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
    let last = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        if (m.index > last) parts.push(line.slice(last, m.index).replace(/\*+/g, ''));
        if (m[2])      parts.push(<strong key={m.index}><em>{m[2]}</em></strong>);
        else if (m[3]) parts.push(<strong key={m.index}>{m[3]}</strong>);
        else if (m[4]) parts.push(<em key={m.index}>{m[4]}</em>);
        else if (m[5]) parts.push(<code key={m.index} style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>{m[5]}</code>);
        else if (m[6]) parts.push(<a key={m.index} href={m[7]} target="_blank" rel="noopener noreferrer" style={{ color: TEAL, textDecoration: 'underline' }}>{m[6]}</a>);
        last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last).replace(/\*+/g, ''));
    return parts;
}

function MarkdownText({ text }: { text: string }): React.ReactElement {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i] ?? '';
        const hm = line.match(/^(#{1,3})\s+(.*)/);
        if (hm) {
            const sizes = ['16px', '15px', '14px'];
            elements.push(<div key={i} style={{ margin: '12px 0 4px', fontSize: sizes[(hm[1]?.length ?? 1) - 1], fontWeight: 700, color: 'var(--text-primary)' }}>{renderInline(hm[2] ?? '')}</div>);
        } else if (/^[-*]\s+/.test(line)) {
            const items: React.ReactNode[] = [];
            while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? '')) { items.push(<li key={i} style={{ marginBottom: '3px' }}>{renderInline((lines[i] ?? '').replace(/^[-*]\s+/, ''))}</li>); i++; }
            elements.push(<ul key={`ul-${i}`} style={{ margin: '6px 0', paddingLeft: '18px', listStyleType: 'disc' }}>{items}</ul>);
            continue;
        } else if (/^\d+\.\s+/.test(line)) {
            const items: React.ReactNode[] = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) { items.push(<li key={i} style={{ marginBottom: '3px' }}>{renderInline((lines[i] ?? '').replace(/^\d+\.\s+/, ''))}</li>); i++; }
            elements.push(<ol key={`ol-${i}`} style={{ margin: '6px 0', paddingLeft: '18px' }}>{items}</ol>);
            continue;
        } else if (line.trim() === '' || /^-{3,}$/.test(line.trim())) {
            elements.push(<div key={i} style={{ height: '8px' }} />);
        } else {
            const r = renderInline(line);
            if (r.some(x => x !== '')) elements.push(<p key={i} style={{ margin: '0 0 6px' }}>{r}</p>);
        }
        i++;
    }
    return <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-primary)' }}>{elements}</div>;
}

function SectionLabel({ text }: { text: string }) {
    return <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: '10px' }}>{text}</div>;
}

// ── Tool card (grid) ──────────────────────────────────────────────────────────
function ToolCard({ record, nameField, descSummaryField, faviconField, linkField, orgField, categoryField, index, onClick }: {
    record: any; nameField: any; descSummaryField: any; faviconField: any; linkField: any; orgField: any; categoryField: any; index?: number; onClick: () => void;
}) {
    const isNarrow   = useIsNarrow();
    const name       = nameField        ? record.getCellValueAsString(nameField)        : record.name;
    const org        = orgField         ? record.getCellValueAsString(orgField)         : '';
    const rawSummary = descSummaryField ? record.getCellValueAsString(descSummaryField) : '';
    const preview    = rawSummary.length > 600 ? rawSummary.slice(0, 600).trimEnd() + '…' : rawSummary;
    const favicon    = getFaviconUrl(record, faviconField);
    const link       = linkField ? record.getCellValueAsString(linkField) : '';
    const catValue   = categoryField ? record.getCellValue(categoryField) : null;
    const category   = catValue && typeof catValue === 'object' && 'name' in catValue ? (catValue as { name: string }).name : '';

    // Desktop only: hovering the card reveals the Description Summary in a popup that
    // stays clamped inside the viewport (and flips above the card when there's no room below).
    const [hovered, setHovered] = useState(false);
    const popupRef = React.useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState<{ shiftX: number; flip: boolean }>({ shiftX: 0, flip: false });
    const showPopup = !isNarrow && hovered && preview.trim().length > 0;

    React.useLayoutEffect(() => {
        if (!showPopup) { setPos({ shiftX: 0, flip: false }); return; }
        const el = popupRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const gutter = 8;
        let shiftX = 0;
        if (r.left < gutter) shiftX = gutter - r.left;
        else if (r.right > window.innerWidth - gutter) shiftX = (window.innerWidth - gutter) - r.right;
        const flip = r.bottom > window.innerHeight - gutter;
        setPos({ shiftX, flip });
    }, [showPopup]);

    const iconBoxStyle: React.CSSProperties = { width: '56px', height: '56px', borderRadius: '10px', flexShrink: 0, background: 'var(--surface-2)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', textDecoration: 'none' };

    return (
        <div onClick={onClick}
            style={{ position: 'relative', borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '13px', cursor: 'pointer', transition: 'border-color 0.16s, transform 0.16s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = ACCENT; el.style.transform = 'translateY(-3px)'; el.style.zIndex = '100'; setHovered(true); }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--ink-line)'; el.style.transform = 'translateY(0)'; el.style.zIndex = ''; setHovered(false); }}>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                {/* Favicon → opens the Link */}
                {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" title="Open link"
                        onClick={e => e.stopPropagation()}
                        style={{ ...iconBoxStyle, cursor: 'pointer' }}>
                        <FaviconIcon url={favicon} iconSize={30} />
                    </a>
                ) : (
                    <div style={iconBoxStyle}>
                        <FaviconIcon url={favicon} iconSize={30} />
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {index !== undefined && <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>{String(index + 1).padStart(3, '0')}</span>}
                    <div title="View details"
                        style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--surface-2)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-primary)' }}>
                        <ArrowRightIcon size={14} weight="bold" />
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{org || name || 'Untitled'}</div>
                {category && <Tag text={category} accent />}
            </div>

            {/* Description Summary popup (desktop hover) */}
            {showPopup && (
                <div ref={popupRef} role="tooltip"
                    style={{
                        position: 'absolute', left: 0, [pos.flip ? 'bottom' : 'top']: 'calc(100% + 8px)',
                        transform: `translateX(${pos.shiftX}px)`, zIndex: 50, width: 'min(320px, 80vw)',
                        padding: '14px 16px', borderRadius: '6px', background: 'var(--surface)',
                        border: '2px solid var(--text-primary)', boxShadow: '5px 5px 0 var(--text-primary)',
                        pointerEvents: 'none',
                    }}>
                    <MarkdownText text={preview} />
                </div>
            )}

        </div>
    );
}


// ── Tool detail — centered modal overlay ──────────────────────────────────────
function ToolModal({ record, nameField, summaryField, linkField, orgField, categoryField, faviconField, createdField, onClose }: {
    record: any; nameField: any; summaryField: any; linkField: any; orgField: any; categoryField: any; faviconField: any; createdField: any; onClose: () => void;
}) {
    const isNarrow = useIsNarrow();
    const name     = nameField     ? record.getCellValueAsString(nameField)    : record.name;
    const org      = orgField      ? record.getCellValueAsString(orgField)     : '';
    const link     = linkField     ? record.getCellValueAsString(linkField)    : '';
    const summary  = summaryField  ? record.getCellValueAsString(summaryField) : '';
    const favicon  = getFaviconUrl(record, faviconField);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    return (
        <div onClick={onClose} style={{ ...modalOverlayStyle(isNarrow), background: 'rgba(35,38,46,0.45)', backdropFilter: 'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()}
                style={{ ...modalCardStyle(isNarrow), borderRadius: isNarrow ? 0 : '8px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', boxShadow: '12px 12px 0 rgba(35,38,46,0.18)' }}>
                <CornerBrackets inset={10} size={12} />

                {/* Top rule */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1.5px solid var(--ink-line)', flexShrink: 0 }}>
                    <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>// TOOL · DETAIL</span>
                    <div onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                        <XIcon size={14} weight="bold" />
                    </div>
                </div>

                {/* Body */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ width: '54px', height: '54px', borderRadius: '8px', flexShrink: 0, background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <FaviconIcon url={favicon} iconSize={28} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: MONO, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{name || 'Untitled'}</div>
                            {org && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '5px', fontWeight: 500 }}>{org}</div>}
                        </div>
                        {link && (
                            <a href={link} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '6px', flexShrink: 0, background: ACCENT, color: ACCENT_TEXT, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', border: `1.5px solid ${INK}`, transition: 'background 0.1s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = ACCENT_DEEP}
                                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ACCENT}>
                                <ArrowUpRightIcon size={13} weight="bold" />
                            </a>
                        )}
                    </div>

                
                    {/* Summary */}
                    {summary.trim().length > 0 && (
                        <div>
                            <BlackLabel text="// Summary" />
                            <div style={{ border: '1.5px solid var(--ink-line)', borderTop: 'none', padding: '20px' }}>
                                <MarkdownText text={summary} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Home dashboard ────────────────────────────────────────────────────────────
function CategoryTile({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
    return (
        <div onClick={onClick}
            style={{ borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', cursor: 'pointer', transition: 'border-color 0.16s, transform 0.16s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = ACCENT; el.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--ink-line)'; el.style.transform = 'translateY(0)'; }}>
            <span style={{ fontFamily: MONO, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{label}</span>
            <span style={{ ...monoLabel, fontSize: '11px', color: ACCENT_DEEP, flexShrink: 0 }}>{String(count).padStart(2, '0')}</span>
        </div>
    );
}

function HomeView({ visibleRecords, recentRecords, allCategories, categoryMap, nameField, descSummaryField, faviconField, linkField, orgField, categoryField, createdField, onSelectRecord, onSelectCategory, onViewAll }: {
    visibleRecords: any[]; recentRecords: any[]; allCategories: string[]; categoryMap: Record<string, number>;
    nameField: any; descSummaryField: any; faviconField: any; linkField: any; orgField: any; categoryField: any; createdField: any;
    onSelectRecord: (r: any) => void; onSelectCategory: (c: string) => void; onViewAll: () => void;
}) {
    return (
        <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px clamp(16px, 3vw, 32px) 40px' }}>
          <div style={{ width: '100%', maxWidth: '1080px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
            {/* Masthead */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 0', borderBottom: '1.5px solid var(--ink-line)' }}>
                    <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>01 / Tools Directory</span>
                    <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>Sector · {new Date().getFullYear()}Q{Math.floor(new Date().getMonth() / 3) + 1}</span>
                </div>
                <h2 style={{ margin: '14px 0 4px', fontFamily: MONO, fontWeight: 800, fontSize: 'clamp(40px, 9vw, 92px)', lineHeight: 0.9, letterSpacing: '-0.03em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                    TOOLS<span style={{ color: ACCENT_DEEP }}>.</span>
                </h2>
                <div style={{ ...monoLabel, color: 'var(--text-muted)', marginTop: '8px' }}>A curated index of the tools that get the job done</div>
            </div>

            {/* Recently added (numbered) */}
            {recentRecords.length > 0 && (
                <div>
                    <SectionLabel text="// Recently Added" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                        {recentRecords.map((r, i) => (
                            <ToolCard key={r.id} record={r} index={i} nameField={nameField} descSummaryField={descSummaryField} faviconField={faviconField} linkField={linkField} orgField={orgField} categoryField={categoryField} onClick={() => onSelectRecord(r)} />
                        ))}
                    </div>
                </div>
            )}

            {/* Browse by category */}
            {allCategories.length > 0 && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <SectionLabel text="// Browse by Category" />
                        <span onClick={onViewAll} style={{ ...monoLabel, color: ACCENT_DEEP, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', userSelect: 'none' }}>
                            View all <CaretRightIcon size={11} weight="bold" />
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {allCategories.map(cat => (
                            <CategoryTile key={cat} label={cat} count={categoryMap[cat] ?? 0} onClick={() => onSelectCategory(cat)} />
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
// ── New tool form (add a link → AI fills name / org / summary) ────────────────
function NewToolForm({ table, records, onClose }: { table: any; records: readonly any[]; onClose: () => void }) {
    const isNarrow      = useIsNarrow();
    const linkField     = table.getFieldIfExists('fldyUeKzyDa9y84tL'); // Link (url)
    const nameField     = table.getFieldIfExists('fldCbE7GVcOcLssGE'); // Name (formula)
    const orgField      = table.getFieldIfExists('fld6jCbGrXbezIZ3z'); // Organization (aiText)
    const summaryField  = table.getFieldIfExists('fldbq0qCJ1p4wqfPj'); // Summary (aiText)

    const [link, setLink]         = useState('');
    const [newId, setNewId]       = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [error, setError]       = useState('');

    // Once created, the record reactively fills in as AI populates it (useRecords polls).
    const rec      = newId ? records.find(r => r.id === newId) ?? null : null;
    const liveName = rec && nameField    ? rec.getCellValueAsString(nameField)    : '';
    const liveOrg  = rec && orgField     ? rec.getCellValueAsString(orgField)     : '';
    const liveSumm = rec && summaryField ? rec.getCellValueAsString(summaryField) : '';

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    async function handleCreate() {
        if (!link.trim()) { setError('Add a link first.'); return; }
        setCreating(true); setError('');
        const fields: Record<string, any> = {};
        if (linkField) fields[linkField.id] = link.trim();
        try {
            const id = await table.createRecordAsync(fields);
            setNewId(id);
        } catch (e: any) {
            setError(e?.message ?? 'Could not add the tool.');
        }
        setCreating(false);
    }
    const reset = () => { setLink(''); setNewId(null); setError(''); };

    const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', background: 'var(--surface)', border: '2px solid var(--text-primary)', borderRadius: 0, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { ...monoLabel, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' };

    return (
        <div onClick={onClose} style={{ ...modalOverlayStyle(isNarrow), background: 'rgba(35,38,46,0.45)', backdropFilter: 'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ ...modalCardStyle(isNarrow), borderRadius: isNarrow ? 0 : '8px', background: 'var(--surface)', border: '2px solid var(--text-primary)', boxShadow: '12px 12px 0 rgba(35,38,46,0.18)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 18px', borderBottom: '2px solid var(--text-primary)', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', textTransform: 'uppercase', color: 'var(--text-primary)' }}>New Tool</span>
                    <div onClick={onClose} style={{ width: '30px', height: '30px', border: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}><XIcon size={15} weight="bold" /></div>
                </div>

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: isNarrow ? '18px 16px 24px' : '24px' }}>
                    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div>
                            <label style={labelStyle}>Link *</label>
                            <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" style={{ ...inputStyle, opacity: newId ? 0.6 : 1 }} disabled={!!newId} autoFocus />
                        </div>

                        {/* Live AI preview after creation */}
                        {rec && (
                            <>
                                <LiveField label="Name" value={liveName} />
                                <LiveField label="Organization" value={liveOrg} />
                                <LiveField label="Summary" value={liveSumm} />
                            </>
                        )}

                        {error && <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>{error}</div>}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', padding: '14px 18px', borderTop: '2px solid var(--text-primary)', flexShrink: 0 }}>
                    {!newId ? (
                        <>
                            <div onClick={onClose} style={{ padding: '10px 18px', border: '2px solid var(--text-primary)', background: 'var(--surface)', color: 'var(--text-muted)', ...monoLabel, cursor: 'pointer', userSelect: 'none' }}>Cancel</div>
                            <div onClick={() => { if (!creating) handleCreate(); }} style={{ padding: '10px 22px', border: '2px solid var(--text-primary)', background: ACCENT, color: ACCENT_TEXT, ...monoLabel, cursor: creating ? 'wait' : 'pointer', userSelect: 'none', opacity: creating ? 0.7 : 1 }}>{creating ? 'Adding…' : 'Add tool'}</div>
                        </>
                    ) : (
                        <>
                            <div onClick={reset} style={{ padding: '10px 18px', border: '2px solid var(--text-primary)', background: 'var(--surface)', color: 'var(--text-primary)', ...monoLabel, cursor: 'pointer', userSelect: 'none' }}>Add another</div>
                            <div onClick={onClose} style={{ padding: '10px 22px', border: '2px solid var(--text-primary)', background: ACCENT, color: ACCENT_TEXT, ...monoLabel, cursor: 'pointer', userSelect: 'none' }}>Done</div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function ToolsApp(): React.ReactElement {
    const isNarrow = useIsNarrow();
    const base    = useBase();
    const errorState = null;
    // Tools table (pinned; the standalone base has many tables).
    const table   = base.tables.find(t => t.id === 'tbl0FXLrhpxXfI9Uv') ?? base.tables[0];
    const records = useRecords(table);

    // Was a configurable custom property; hardcoded to the Category single-select.
    const categoryField    = table?.getFieldIfExists('fldCJurO2mwjpzbLB') as Field | undefined;
    const summaryField     = table?.getFieldIfExists('fldbq0qCJ1p4wqfPj'); // Summary (full, detail view)
    const descSummaryField = table?.getFieldIfExists('fldQXlNg9MgevFYs5'); // Description Summary (cards)
    const faviconField     = table?.getFieldIfExists('fldOWiKkEmTNeTu6r'); // Organization Favicon
    const createdField     = table?.getFieldIfExists('fldQJ7YA7TKGV7qt6')      // Created (by id)
        ?? table?.fields.find(f => (f.config as any)?.type === FieldType.CREATED_TIME)
        ?? table?.fields.find(f => f.name.toLowerCase().includes('created'))
        ?? null;
    const linkField        = table?.getFieldIfExists('fldyUeKzyDa9y84tL');
    const nameField        = table?.primaryField;
    const orgField         = table?.getFieldIfExists('fld6jCbGrXbezIZ3z') // Organization (text) — not the favicon field
        ?? table?.fields.find(f => { const n = f.name.toLowerCase(); return (n.includes('organization') || n.includes('org')) && !n.includes('favicon'); })
        ?? null;
    const statusField      = table?.fields.find(f => f.name.toLowerCase().includes('status')) ?? null;

    const [view,           setView]           = useState<'home' | 'category' | 'all'>('home');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [search,         setSearch]         = useState('');
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [showNew,        setShowNew]        = useState(false);

    const visibleRecords = records.filter(r => {
        if (!statusField) return true;
        const s = r.getCellValue(statusField);
        const name = s && typeof s === 'object' && 'name' in s ? (s as { name: string }).name : String(s ?? '');
        return name.toLowerCase() !== 'hidden';
    });

    const categoryMap = useMemo(() => {
        const map: Record<string, number> = {};
        visibleRecords.forEach(r => {
            if (!categoryField) return;
            const v = r.getCellValue(categoryField);
            const cat = v && typeof v === 'object' && 'name' in v ? (v as { name: string }).name : null;
            if (cat) map[cat] = (map[cat] ?? 0) + 1;
        });
        return map;
    }, [visibleRecords, categoryField]);

    const allCategories = useMemo(() => Object.keys(categoryMap).sort(), [categoryMap]);

    useEffect(() => { setSelectedRecord(null); }, [view, activeCategory, search]);

    const isSearching = search.trim().length > 0;

    // Newest first — by Created descending; when Created can't separate records
    // (equal/unreadable), fall back to reverse table order (later-added = newer).
    const recordsByNewest = useMemo(() => {
        const withIdx = visibleRecords.map((r, i) => ({ r, i, t: getCreatedTime(r, createdField) }));
        withIdx.sort((a, b) => (b.t - a.t) || (b.i - a.i));
        return withIdx.map(x => x.r);
    }, [visibleRecords, createdField]);
    const recentRecords = useMemo(() => recordsByNewest.slice(0, 3), [recordsByNewest]);

    const displayedRecords = useMemo(() => {
        if (isSearching) {
            const q = search.toLowerCase();
            return visibleRecords.filter(r => {
                const name    = nameField        ? r.getCellValueAsString(nameField)        : r.name;
                const org     = orgField         ? r.getCellValueAsString(orgField)         : '';
                const summary = summaryField     ? r.getCellValueAsString(summaryField)     : '';
                const desc    = descSummaryField ? r.getCellValueAsString(descSummaryField) : '';
                return name.toLowerCase().includes(q) || org.toLowerCase().includes(q) || summary.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
            });
        }
        if (view === 'all') return recordsByNewest;
        if (!activeCategory || !categoryField) return [];
        return visibleRecords.filter(r => {
            const v = r.getCellValue(categoryField);
            const cat = v && typeof v === 'object' && 'name' in v ? (v as { name: string }).name : '';
            return cat === activeCategory;
        });
    }, [isSearching, search, view, activeCategory, visibleRecords, recordsByNewest, categoryField, nameField, orgField, summaryField, descSummaryField]);

    if (errorState) return <div style={{ padding: '24px', color: '#c0392b' }}>Error loading properties.</div>;
    if (!table)     return <div style={{ padding: '24px' }}>No table found.</div>;

    const contentTitle = isSearching ? `Results for "${search}"` : view === 'all' ? 'All Tools' : activeCategory ?? '';

    return (
        <>
            <style>{`
                :root {
                    --page:         #eceae4;
                    --bg:           #eceae4;
                    --surface:      #ffffff;
                    --surface-2:    #f3f1ea;
                    --border:       rgba(35,38,46,0.20);
                    --ink-line:     rgba(35,38,46,0.20);
                    --grid-line:    rgba(35,38,46,0.05);
                    --shadow-sm:    0 1px 2px rgba(40,35,20,0.04);
                    --shadow:       0 2px 6px rgba(40,35,20,0.05);
                    --shadow-hover: 0 10px 26px rgba(40,35,20,0.10);
                    --text-primary: #323232;
                    --text-muted:   #8b8678;
                    --divider:      rgba(35,38,46,0.12);
                    --accent-soft:  #fbeecb;
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --page:         #15140f;
                        --bg:           #15140f;
                        --surface:      #211f1a;
                        --surface-2:    #2a2720;
                        --border:       rgba(255,255,255,0.20);
                        --ink-line:     rgba(255,255,255,0.20);
                        --grid-line:    rgba(255,255,255,0.05);
                        --shadow-sm:    0 1px 2px rgba(0,0,0,0.3);
                        --shadow:       0 2px 6px rgba(0,0,0,0.35);
                        --shadow-hover: 0 10px 26px rgba(0,0,0,0.5);
                        --text-primary: #efe9dd;
                        --text-muted:   #9d978b;
                        --divider:      rgba(255,255,255,0.10);
                        --accent-soft:  rgba(245,193,61,0.18);
                    }
                }
                * { box-sizing: border-box; } body { margin: 0; }
                ::placeholder { color: var(--text-muted); opacity: 1; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: var(--divider); border-radius: 6px; }
            `}</style>

            <div style={{ position: 'relative', height: '100%', background: 'var(--page)', backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)', backgroundSize: '38px 38px', fontFamily: 'var(--font-body), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Top utility bar */}
                <div style={{ padding: isNarrow ? '10px 12px' : '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap', flexShrink: 0, borderBottom: '1.5px solid var(--ink-line)' }}>
                    {/* Search — first, on the same line; grows to fill on mobile, fixed on desktop */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', width: isNarrow ? 'auto' : '260px', flex: isNarrow ? '1 1 140px' : '0 0 260px', minWidth: isNarrow ? '120px' : undefined }}>
                        <MagnifyingGlassIcon size={14} color="var(--text-muted)" weight="bold" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SEARCH…"
                            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', color: 'var(--text-primary)', fontFamily: MONO, letterSpacing: '0.04em' }} />
                        {search && (
                            <div onClick={() => setSearch('')} style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'var(--surface-2)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                                <XIcon size={9} weight="bold" />
                            </div>
                        )}
                    </div>
                    {(view !== 'home' || isSearching) && (
                        <div onClick={() => { setView('home'); setActiveCategory(null); setSearch(''); }} title="Back" aria-label="Back"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '5px', cursor: 'pointer', flexShrink: 0, border: '1.5px solid var(--ink-line)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'}>
                            <ArrowLeftIcon size={15} weight="bold" />
                        </div>
                    )}
                    <div onClick={() => { setView('all'); setSearch(''); }} title="View all" aria-label="View all"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '5px', cursor: 'pointer', flexShrink: 0, border: '1.5px solid var(--ink-line)', background: (view === 'all' && !isSearching) ? INK : 'var(--surface)', color: (view === 'all' && !isSearching) ? '#fff' : 'var(--text-primary)' }}
                        onMouseEnter={e => { if (!(view === 'all' && !isSearching)) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
                        onMouseLeave={e => { if (!(view === 'all' && !isSearching)) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'; }}>
                        <SquaresFourIcon size={15} weight="bold" />
                    </div>
                    <div onClick={() => setShowNew(true)} title="New tool" aria-label="New tool"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '5px', cursor: 'pointer', flexShrink: 0, background: ACCENT, color: ACCENT_TEXT, border: `2px solid ${INK}` }}>
                        <PlusIcon size={15} weight="bold" />
                    </div>
                    <HelpButton page="tools" />
                </div>

                {/* Body: main content (full width) */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {(view === 'home' && !isSearching) ? (
                        <HomeView
                            visibleRecords={visibleRecords}
                            recentRecords={recentRecords}
                            allCategories={allCategories}
                            categoryMap={categoryMap}
                            nameField={nameField}
                            descSummaryField={descSummaryField}
                            faviconField={faviconField}
                            linkField={linkField}
                            orgField={orgField}
                            categoryField={categoryField}
                            createdField={createdField}
                            onSelectRecord={r => setSelectedRecord(r)}
                            onSelectCategory={cat => { setView('category'); setActiveCategory(cat); setSearch(''); }}
                            onViewAll={() => { setView('all'); setSearch(''); }}
                        />
                    ) : (
                        <>
                            {/* Content header */}
                            <div style={{ flexShrink: 0, borderBottom: '1.5px solid var(--ink-line)' }}>
                                <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '14px clamp(16px, 3vw, 32px) 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontFamily: MONO, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{contentTitle}</span>
                                    <span style={{ ...monoLabel, color: ACCENT_DEEP }}>[{String(displayedRecords.length).padStart(2, '0')}]</span>
                                </div>
                            </div>

                            {/* Card grid */}
                            <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px clamp(16px, 3vw, 32px) 32px' }}>
                              <div style={{ width: '100%', maxWidth: '1080px' }}>
                                {displayedRecords.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', ...monoLabel, fontSize: '11px' }}>
                                        {isSearching ? 'No tools match your search.' : 'No tools in this category.'}
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                                        {displayedRecords.map((r, i) => (
                                            <ToolCard
                                                key={r.id}
                                                record={r}
                                                index={i}
                                                nameField={nameField}
                                                descSummaryField={descSummaryField}
                                                faviconField={faviconField}
                                                linkField={linkField}
                                                orgField={orgField}
                                                categoryField={categoryField}
                                                onClick={() => setSelectedRecord(r)}
                                            />
                                        ))}
                                    </div>
                                )}
                              </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {selectedRecord && (
                <ToolModal
                    record={selectedRecord}
                    nameField={nameField}
                    summaryField={summaryField}
                    linkField={linkField}
                    orgField={orgField}
                    categoryField={categoryField}
                    faviconField={faviconField}
                    createdField={createdField}
                    onClose={() => setSelectedRecord(null)}
                />
            )}
            {showNew && (
                <NewToolForm table={table} records={records} onClose={() => setShowNew(false)} />
            )}
        </>
    );
}

export default function ToolsPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    return (
        <Shell>
            {mounted ? (
                <AirtableBoundary>
                    <ToolsApp />
                </AirtableBoundary>
            ) : (
                <div style={{ flex: 1, background: 'var(--page)' }} />
            )}
        </Shell>
    );
}