'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBase, useRecords, AirtableBoundary } from '@/lib/airtable/hooks';
import { Shell } from '@/lib/components/Shell';
import { useIsNarrow } from '@/lib/useIsNarrow';
import { modalOverlayStyle, modalCardStyle } from '@/lib/components/modalStyle';
import { HelpButton } from '@/lib/components/InfoModal';
import { BookOpenIcon, XIcon, MagnifyingGlassIcon, ArrowUpRightIcon, ArrowLeftIcon, ArrowRightIcon, CaretRightIcon, PaperclipIcon, FileIcon, LinkIcon, ListBulletsIcon, PlusIcon } from '@phosphor-icons/react';

const ACCENT      = '#F5C13D'; // amber primary
const ACCENT_DEEP = '#E3A81B'; // darker amber (tags / icons on tint)
const ACCENT_TEXT = '#2c2510'; // dark text on amber
const INK         = '#23262e'; // charcoal (line-art ink / titles / pills)
const TEAL        = INK;       // secondary accent is charcoal to match the devwork theme

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const monoLabel: React.CSSProperties = { fontFamily: MONO, fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' };

// ── Brutalist primitives ──────────────────────────────────────────────────────
function CornerBrackets({ inset = 10, size = 12, color = 'var(--ink-line)' }: { inset?: number; size?: number; color?: string }) {
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

// Black "// LABEL" header bar
function BlackLabel({ text }: { text: string }) {
    return <div style={{ ...monoLabel, padding: '7px 12px', color: '#fff', background: INK }}>{text}</div>;
}

// Bordered mono tag (square)
function Tag({ text, accent }: { text: string; accent?: boolean }) {
    return <span style={{ ...monoLabel, padding: '3px 8px', borderRadius: '3px', whiteSpace: 'nowrap', color: accent ? ACCENT_DEEP : 'var(--text-muted)', background: accent ? 'var(--accent-soft)' : 'transparent', border: `1.2px solid ${accent ? 'transparent' : 'var(--ink-line)'}` }}>{text}</span>;
}

// Link-sourced fields
const LINK_SUMMARY_ID   = 'fldPnjhzheunNLEfJ';  // Link Summary (aiText)
const LINK_TITLE_ID     = 'fldTOIrH31vN5msAQ';  // Link Title (aiText)
const DISPLAY_ID        = 'fldNmVCq9ebpzSizH';  // Title (formula)
const LINK_LANGUAGE_ID  = 'fldSO2JgX19EW8g8M';  // Link Language (multipleSelects)
const NOTES_ID          = 'fld614HEtTeGT6yvl';  // Notes (richText)
const LINK_ID           = 'fldyC5ZOrpMjrYJdy';  // Link (url)
const LINK_SOURCE_ID    = 'fldSnhKbelBk5SHq6';  // Link Source (aiText)
// Attachment-sourced fields
const ATTACHMENT_ID      = 'fldFd0a8pfDGNWRmR';  // Attachment (multipleAttachments)
const ATT_SUMMARY_ID     = 'fldsbCfsapqHa3ieE';  // Attachment Summary (aiText)
const ATT_TITLE_ID       = 'fld6TTr5Ze1yDzPzJ';  // Attachment Title (aiText)
const ATT_SOURCE_ID      = 'fldwuitvhSAqYbqWy';  // Attachment Source (aiText)
const ATT_LANGUAGE_ID    = 'fldnDzazt5K4iJMFJ';  // Attachment Language (multipleSelects)
const FINAL_LANGUAGE_ID  = 'fldoiTd8rTBt9fkkb';  // Final Language (formula)
const CREATED_DATE_ID    = 'fld9eZUMcHeXSFWHj';  // Created Date (createdTime)
const NOTE_TITLE_ID      = 'fldUE9rtv5uPfd0J6';  // Note Title (singleLineText)

// ── Field helpers ───────────────────────────────────────────────────────────────
function getCreatedTime(record: any, createdField: any): number {
    if (!createdField) return 0;
    let v: any = record.getCellValue(createdField);
    if (v == null) v = record.getCellValueAsString(createdField);
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v;
    if (typeof v === 'string') { const t = Date.parse(v); return Number.isNaN(t) ? 0 : t; }
    return 0;
}

function getFinalLangs(record: any, finalLangField: any): string[] {
    if (!finalLangField) return [];
    const raw = record.getCellValue(finalLangField);
    if (Array.isArray(raw)) return (raw as { name: string }[]).map(l => l.name);
    if (typeof raw === 'string' && raw.trim()) return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
    return [];
}

// Resolve the card/detail display name: Title formula > Link Title > Attachment Title
function getName(record: any, table: any): string {
    const df  = table.getFieldIfExists(DISPLAY_ID);
    const tf  = table.getFieldIfExists(LINK_TITLE_ID);
    const atf = table.getFieldIfExists(ATT_TITLE_ID);
    const displayName = df  ? record.getCellValueAsString(df)  : '';
    const linkTitle   = tf  ? record.getCellValueAsString(tf)  : '';
    const attTitle    = atf ? record.getCellValueAsString(atf) : '';
    return displayName || linkTitle || attTitle || record.name;
}

// Image thumbnail from the first image attachment (used as the card's left icon)
function getThumbUrl(record: any, table: any): string | null {
    const attachField = table.getFieldIfExists(ATTACHMENT_ID);
    const atts = attachField ? ((record.getCellValue(attachField) as any[] | null) ?? []) : [];
    const img = atts.find((a: any) => a?.type?.startsWith('image/'));
    return img?.thumbnails?.small?.url ?? null;
}

// Thumbnail image with a contextual fallback icon (link / file / book)
function CardThumb({ url, fallback, iconSize }: { url: string | null; fallback: React.ReactNode; iconSize: number }) {
    const [failed, setFailed] = useState(false);
    if (url && !failed) {
        return <img src={url} alt="" onError={() => setFailed(true)} style={{ width: `${iconSize}px`, height: `${iconSize}px`, borderRadius: '7px', objectFit: 'cover', display: 'block' }} />;
    }
    return <>{fallback}</>;
}

// ── Markdown ──────────────────────────────────────────────────────────────────
// Render inline markdown (bold, italic, code, strikethrough, links) into React nodes.
// Walks the string once, matching the earliest-starting token at each step so syntax
// is always consumed (never left visible as raw characters).
function renderInline(line: string, keyPrefix = ''): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    // Order matters: longer / more-specific markers first so e.g. *** wins over **.
    const re = /(\*\*\*(.+?)\*\*\*|___(.+?)___|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\*(.+?)\*|(?<![A-Za-z0-9])_(.+?)_(?![A-Za-z0-9])|`([^`]+?)`|\[(.+?)\]\(([^)]+?)\))/g;
    let last = 0; let m: RegExpExecArray | null; let k = 0;
    while ((m = re.exec(line)) !== null) {
        if (m.index > last) parts.push(line.slice(last, m.index));
        const key = `${keyPrefix}i${k++}`;
        if (m[2] ?? m[3])               parts.push(<strong key={key}><em>{m[2] ?? m[3]}</em></strong>);
        else if (m[4] ?? m[5])          parts.push(<strong key={key}>{m[4] ?? m[5]}</strong>);
        else if (m[6])                  parts.push(<span key={key} style={{ textDecoration: 'line-through', opacity: 0.7 }}>{m[6]}</span>);
        else if (m[7] ?? m[8])          parts.push(<em key={key}>{m[7] ?? m[8]}</em>);
        else if (m[9])                  parts.push(<code key={key} style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>{m[9]}</code>);
        else if (m[10] && m[11])        parts.push(<a key={key} href={m[11]} target="_blank" rel="noopener noreferrer" style={{ color: TEAL, textDecoration: 'underline' }}>{m[10]}</a>);
        last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
}

function MarkdownText({ text }: { text: string }): React.ReactElement {
    const lines = (text ?? '').split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i] ?? '';

        // Fenced code block: ``` … ```
        const fence = line.match(/^\s*```/);
        if (fence) {
            const body: string[] = [];
            i++;
            while (i < lines.length && !/^\s*```/.test(lines[i] ?? '')) { body.push(lines[i] ?? ''); i++; }
            i++; // consume closing fence (if present)
            elements.push(
                <pre key={`pre-${i}`} style={{ margin: '8px 0', padding: '12px 14px', background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', borderRadius: '5px', overflowX: 'auto', fontSize: '12px', lineHeight: 1.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: 'var(--text-primary)' }}>
                    {body.join('\n')}
                </pre>
            );
            continue;
        }

        // Headings: # … ###### (size clamps after level 3)
        const hm = line.match(/^(#{1,6})\s+(.*)/);
        if (hm) {
            const sizes = ['18px', '16px', '15px', '14px', '13px', '13px'];
            const lvl = (hm[1]?.length ?? 1) - 1;
            elements.push(<div key={i} style={{ margin: '12px 0 4px', fontSize: sizes[lvl], fontWeight: 700, color: 'var(--text-primary)' }}>{renderInline(hm[2] ?? '', `h${i}`)}</div>);
            i++; continue;
        }

        // Blockquote: > …  (consecutive lines collapse into one quote)
        if (/^\s*>\s?/.test(line)) {
            const quote: React.ReactNode[] = [];
            let qi = 0;
            while (i < lines.length && /^\s*>\s?/.test(lines[i] ?? '')) {
                quote.push(<div key={qi}>{renderInline((lines[i] ?? '').replace(/^\s*>\s?/, ''), `q${i}_${qi}`)}</div>);
                qi++; i++;
            }
            elements.push(
                <blockquote key={`bq-${i}`} style={{ margin: '8px 0', padding: '4px 0 4px 14px', borderLeft: '3px solid var(--ink-line)', color: 'var(--text-muted)' }}>
                    {quote}
                </blockquote>
            );
            continue;
        }

        // Bullet list: -, *, or + markers
        if (/^\s*[-*+]\s+/.test(line)) {
            const items: React.ReactNode[] = [];
            while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i] ?? '')) {
                items.push(<li key={i} style={{ marginBottom: '3px' }}>{renderInline((lines[i] ?? '').replace(/^\s*[-*+]\s+/, ''), `li${i}`)}</li>);
                i++;
            }
            elements.push(<ul key={`ul-${i}`} style={{ margin: '6px 0', paddingLeft: '18px', listStyleType: 'disc' }}>{items}</ul>);
            continue;
        }

        // Numbered list: 1. 2. …
        if (/^\s*\d+\.\s+/.test(line)) {
            const items: React.ReactNode[] = [];
            while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? '')) {
                items.push(<li key={i} style={{ marginBottom: '3px' }}>{renderInline((lines[i] ?? '').replace(/^\s*\d+\.\s+/, ''), `oli${i}`)}</li>);
                i++;
            }
            elements.push(<ol key={`ol-${i}`} style={{ margin: '6px 0', paddingLeft: '18px' }}>{items}</ol>);
            continue;
        }

        // Horizontal rule
        if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
            elements.push(<div key={i} style={{ height: '1.5px', background: 'var(--ink-line)', margin: '12px 0' }} />);
            i++; continue;
        }

        // Blank line → spacing
        if (line.trim() === '') {
            elements.push(<div key={i} style={{ height: '8px' }} />);
            i++; continue;
        }

        // Paragraph
        elements.push(<p key={i} style={{ margin: '0 0 6px' }}>{renderInline(line, `p${i}`)}</p>);
        i++;
    }
    return <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-primary)' }}>{elements}</div>;
}

function SectionLabel({ text }: { text: string }) {
    return <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: '10px' }}>{text}</div>;
}

// ── Cheat sheet card ──────────────────────────────────────────────────────────
function CheatSheetCard({ record, table, index, onClick }: { record: any; table: any; index?: number; onClick: () => void }) {
    const linkField       = table.getFieldIfExists(LINK_ID);
    const attachField     = table.getFieldIfExists(ATTACHMENT_ID);
    const linkSummField   = table.getFieldIfExists(LINK_SUMMARY_ID);
    const attSummField    = table.getFieldIfExists(ATT_SUMMARY_ID);
    const linkSrcField    = table.getFieldIfExists(LINK_SOURCE_ID);
    const attSrcField     = table.getFieldIfExists(ATT_SOURCE_ID);
    const finalLangField  = table.getFieldIfExists(FINAL_LANGUAGE_ID);

    const name  = getName(record, table);
    const langs = getFinalLangs(record, finalLangField);

    const link        = linkField  ? record.getCellValueAsString(linkField) : '';
    const attachments = attachField ? ((record.getCellValue(attachField) as any[] | null) ?? []) : [];
    const hasLink     = !!link;

    // Source (parallels "organization" on the tools card): prefer link source, then attachment
    const linkSrc = linkSrcField ? record.getCellValueAsString(linkSrcField).trim() : '';
    const attSrc  = attSrcField  ? record.getCellValueAsString(attSrcField).trim()  : '';
    const source  = linkSrc || attSrc;

    // Preview summary: prefer link summary, then attachment summary
    const linkSumm = linkSummField ? record.getCellValueAsString(linkSummField) : '';
    const attSumm  = attSummField  ? record.getCellValueAsString(attSummField)  : '';
    const rawSummary = (linkSumm || attSumm).trim();
    const preview    = rawSummary.length > 150 ? rawSummary.slice(0, 150).trimEnd().replace(/[*_~`]+$/, '') + '…' : rawSummary;

    const thumb      = getThumbUrl(record, table);
    const clickTarget = link || attachments[0]?.url || '';
    const fallbackIcon = hasLink
        ? <LinkIcon size={22} color={TEAL} weight="bold" />
        : attachments.length
            ? <PaperclipIcon size={22} color={TEAL} weight="bold" />
            : <BookOpenIcon size={22} color={TEAL} weight="bold" />;

    const iconBoxStyle: React.CSSProperties = { width: '42px', height: '42px', borderRadius: '8px', flexShrink: 0, background: 'var(--surface-2)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', textDecoration: 'none' };

    return (
        <div onClick={onClick}
            style={{ position: 'relative', borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '13px', cursor: 'pointer', transition: 'border-color 0.16s, transform 0.16s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = ACCENT; el.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--ink-line)'; el.style.transform = 'translateY(0)'; }}>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                {/* Thumbnail / icon → opens the link (or first attachment) */}
                {clickTarget ? (
                    <a href={clickTarget} target="_blank" rel="noopener noreferrer" title="Open source"
                        onClick={e => e.stopPropagation()}
                        style={{ ...iconBoxStyle, cursor: 'pointer' }}>
                        <CardThumb url={thumb} fallback={fallbackIcon} iconSize={22} />
                    </a>
                ) : (
                    <div style={iconBoxStyle}>
                        <CardThumb url={thumb} fallback={fallbackIcon} iconSize={22} />
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

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, letterSpacing: '-0.02em' }}>{name || 'Untitled'}</div>
                {(source || langs.length > 0) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', minWidth: 0 }}>
                        {source && <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{source}</span>}
                        {langs.map(l => <Tag key={l} text={l} accent />)}
                    </div>
                )}
                {preview && <div style={{ marginTop: '9px', fontSize: '11px' }}><MarkdownText text={preview} /></div>}
            </div>
        </div>
    );
}

// ── Attachment preview ────────────────────────────────────────────────────────
function AttachmentPreview({ attachments }: { attachments: any[] }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const att = attachments[Math.min(activeIdx, attachments.length - 1)];
    if (!att) return null;

    const isImage = att.type?.startsWith('image/');
    const isPDF   = att.type === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf');
    const previewUrl = att.thumbnails?.large?.url ?? att.url;

    return (
        <div style={{ borderRadius: '18px', background: 'var(--surface-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>

            {/* Tab bar — only shown when more than one attachment */}
            {attachments.length > 1 && (
                <div style={{ display: 'flex', gap: '4px', padding: '10px 12px 0', overflowX: 'auto' }}>
                    {attachments.map((a: any, i: number) => (
                        <button key={a.id} onClick={() => setActiveIdx(i)}
                            style={{ padding: '6px 12px', borderRadius: '10px 10px 0 0', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s', background: i === activeIdx ? 'var(--surface)' : 'transparent', boxShadow: i === activeIdx ? 'var(--shadow-sm)' : 'none', color: i === activeIdx ? ACCENT_DEEP : 'var(--text-muted)' }}>
                            {a.filename.length > 22 ? a.filename.slice(0, 20) + '…' : a.filename}
                        </button>
                    ))}
                </div>
            )}

            {/* Preview area */}
            <div style={{ padding: attachments.length > 1 ? '0 16px 16px' : '16px' }}>
                {isImage ? (
                    <div style={{ borderRadius: '14px', overflow: 'hidden', background: 'var(--surface)', textAlign: 'center' as const }}>
                        <img
                            src={previewUrl}
                            alt={att.filename}
                            style={{ maxWidth: '100%', height: 'calc(100vh - 220px)', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                        />
                    </div>
                ) : isPDF ? (
                    <div style={{ borderRadius: '14px', overflow: 'hidden', background: 'var(--surface)' }}>
                        <iframe
                            src={att.url}
                            title={att.filename}
                            style={{ width: '100%', height: 'calc(100vh - 220px)', border: 'none', display: 'block' }}
                        />
                    </div>
                ) : (
                    /* Fallback: large file card for unsupported preview types */
                    <div style={{ borderRadius: '14px', background: 'var(--surface)', border: '1px solid var(--border)', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' as const }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileIcon size={24} color={TEAL} weight="duotone" />
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{att.filename}</div>
                            {att.size && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{(att.size / 1024).toFixed(1)} KB</div>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Preview not available for this file type</div>
                    </div>
                )}

                {/* File meta + open link */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', padding: '0 4px' }}>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>{att.filename}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {att.type ?? 'File'}{att.size ? ` · ${(att.size / 1024).toFixed(1)} KB` : ''}
                        </div>
                    </div>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" title="Open file" aria-label="Open file"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '8px', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', color: ACCENT_DEEP, textDecoration: 'none', flexShrink: 0, transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-2)'}
                        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface)'}>
                        <ArrowUpRightIcon size={13} weight="bold" />
                    </a>
                </div>
            </div>
        </div>
    );
}

// ── View toggle (segmented pill) ──────────────────────────────────────────────
function ViewToggle({ viewMode, onChange }: { viewMode: 'link' | 'attachment'; onChange: (v: 'link' | 'attachment') => void }) {
    const options: { key: 'link' | 'attachment'; label: string; icon: React.ReactNode }[] = [
        { key: 'link',       label: 'Link',       icon: <LinkIcon size={11} weight="bold" /> },
        { key: 'attachment', label: 'Attachment',  icon: <PaperclipIcon size={11} weight="bold" /> },
    ];
    return (
        <div style={{ display: 'flex', gap: '8px' }}>
            {options.map(opt => {
                const active = viewMode === opt.key;
                return (
                    <button key={opt.key} onClick={() => onChange(opt.key)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '5px', cursor: 'pointer', fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', border: '1.5px solid var(--ink-line)', background: active ? INK : 'var(--surface)', color: active ? '#fff' : 'var(--text-muted)' }}>
                        {opt.icon}{opt.label}
                    </button>
                );
            })}
        </div>
    );
}

// ── Detail view ───────────────────────────────────────────────────────────────
function CheatSheetDetail({ record, table, onClose, query = '' }: { record: any; table: any; onClose: () => void; query?: string }) {
    const isNarrow = useIsNarrow();
    const contentRef = useRef<HTMLDivElement>(null);

    // When opened from a search result, jump to the first place the search term
    // appears in the detail and flash it, so the user doesn't have to hunt for it.
    useEffect(() => {
        const q = query.trim().toLowerCase();
        if (!q) return;
        const timer = setTimeout(() => {
            const root = contentRef.current;
            if (!root) return;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            let node: Node | null;
            while ((node = walker.nextNode())) {
                if (node.textContent && node.textContent.toLowerCase().includes(q)) {
                    const el = node.parentElement;
                    if (!el) continue;
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const prev = el.style.backgroundColor;
                    el.style.transition = 'background-color 0.3s';
                    el.style.backgroundColor = 'var(--accent-soft)';
                    setTimeout(() => { el.style.backgroundColor = prev; }, 1800);
                    break;
                }
            }
        }, 420); // let the modal mount / slide settle first
        return () => clearTimeout(timer);
    }, [query, record.id]);
    const [viewMode, setViewMode] = useState<'link' | 'attachment'>('link');

    const langField     = table.getFieldIfExists(LINK_LANGUAGE_ID);
    const attLangField  = table.getFieldIfExists(ATT_LANGUAGE_ID);
    const linkField     = table.getFieldIfExists(LINK_ID);
    const guideField    = table.getFieldIfExists(LINK_SUMMARY_ID);
    const sourceField   = table.getFieldIfExists(LINK_SOURCE_ID);
    const notesField    = table.getFieldIfExists(NOTES_ID);
    const attachField   = table.getFieldIfExists(ATTACHMENT_ID);
    const attSummField  = table.getFieldIfExists(ATT_SUMMARY_ID);
    const attSrcField   = table.getFieldIfExists(ATT_SOURCE_ID);

    const name = getName(record, table);

    // Merge language pills
    const langs: string[] = [
        ...((langField    ? (record.getCellValue(langField)    as { name: string }[] | null) ?? [] : []).map((l: { name: string }) => l.name)),
        ...((attLangField ? (record.getCellValue(attLangField) as { name: string }[] | null) ?? [] : []).map((l: { name: string }) => l.name)),
    ].filter((v, i, a) => a.indexOf(v) === i);

    // Link-sourced content
    const link       = linkField   ? (record.getCellValue(linkField) as string | null) ?? '' : '';
    const guideText  = guideField  ? record.getCellValueAsString(guideField)  : '';
    const sourceText = sourceField ? record.getCellValueAsString(sourceField) : '';
    const hasLink    = !!(link || guideText.trim() || sourceText.trim());

    // Attachment-sourced content
    const attachments = attachField  ? ((record.getCellValue(attachField) as any[] | null) ?? []) : [];
    const attSummText = attSummField ? record.getCellValueAsString(attSummField) : '';
    const attSrcText  = attSrcField  ? record.getCellValueAsString(attSrcField)  : '';
    const hasAttachment = !!(attachments.length || attSummText.trim() || attSrcText.trim());

    // Toggle only appears when both sources are present
    const showToggle = hasLink && hasAttachment;

    // ── Editable fields (Notes + Link Source) ────────────────────────────────
    // A field is editable only if it actually accepts writes. Notes (richText)
    // does; Link Source is an aiText field, which Airtable marks computed/
    // read-only — so it stays read-only unless the base makes it writable.
    const notesText        = notesField  ? record.getCellValueAsString(notesField)  : '';
    const notesIsEditable  = !!(notesField  && !notesField.isComputed);
    const sourceIsEditable = !!(sourceField && !sourceField.isComputed);

    const [notesVal,  setNotesVal]  = useState(notesText);
    const [sourceVal, setSourceVal] = useState(sourceText);
    const [saving,    setSaving]    = useState(false);
    const [saved,     setSaved]     = useState(false);
    const [saveError, setSaveError] = useState('');

    // Reset to the appropriate panel + editable buffers when switching records
    useEffect(() => {
        setViewMode(hasLink ? 'link' : 'attachment');
        setNotesVal(notesText);
        setSourceVal(sourceText);
        setSaved(false);
        setSaveError('');
    }, [record.id]);

    const isDirty = (notesIsEditable && notesVal !== notesText) || (sourceIsEditable && sourceVal !== sourceText);

    async function handleSave() {
        setSaving(true); setSaveError('');
        const updates: Record<string, any> = {};
        if (notesIsEditable)  updates[notesField.id]  = notesVal  || null;
        if (sourceIsEditable) updates[sourceField.id] = sourceVal || null;
        try {
            await table.updateRecordAsync(record, updates);
            setSaved(true); setTimeout(() => setSaved(false), 2500);
        } catch (e: any) {
            setSaveError(e?.message ?? 'Save failed — check field permissions.');
        }
        setSaving(false);
    }
    const discardEdits = () => { setNotesVal(notesText); setSourceVal(sourceText); setSaveError(''); };

    const cardBox: React.CSSProperties = { borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', padding: '20px' };
    const editAreaStyle: React.CSSProperties = {
        width: '100%', minHeight: '120px', padding: '16px 18px', fontSize: '13px', lineHeight: 1.7,
        color: 'var(--text-primary)', background: 'var(--surface)', border: '1.5px solid var(--ink-line)',
        borderRadius: '5px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' as const,
        transition: 'border-color 0.15s',
    };

    // Reusable Notes block — editable textarea when writable, else read-only
    const notesBlock = (notesField && (notesIsEditable || record.getCellValue(notesField))) ? (
        <div>
            <SectionLabel text="Notes" />
            {notesIsEditable ? (
                <textarea value={notesVal} onChange={e => setNotesVal(e.target.value)} placeholder="Add notes…"
                    style={editAreaStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = ACCENT)}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-line)')} />
            ) : (
                <div style={{ ...cardBox, fontSize: '13px', lineHeight: 1.75, color: 'var(--text-primary)' }}>
                    <MarkdownText text={record.getCellValueAsString(notesField)} />
                </div>
            )}
        </div>
    ) : null;

    // Shared header block
    const header = (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '8px', flexShrink: 0, background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpenIcon size={26} color={TEAL} weight="bold" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                        <div style={{ fontFamily: MONO, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{name || 'Untitled'}</div>
                        {langs.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                                {langs.map(l => <Tag key={l} text={l} accent />)}
                            </div>
                        )}
                    </div>
                    {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" title="Open link" aria-label="Open link"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '5px', flexShrink: 0, background: ACCENT, color: ACCENT_TEXT, textDecoration: 'none', border: `1.5px solid ${INK}`, transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = ACCENT_DEEP}
                            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ACCENT}>
                            <ArrowUpRightIcon size={14} weight="bold" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );

    // ── Link content block
    const linkPanel = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {header}
            {guideText.trim().length > 0 && (
                <div>
                    <SectionLabel text="Link Summary" />
                    <div style={cardBox}><MarkdownText text={guideText} /></div>
                </div>
            )}
            {(sourceIsEditable || sourceText.trim().length > 0) && (
                <div>
                    <SectionLabel text="Link Source" />
                    {sourceIsEditable ? (
                        <textarea value={sourceVal} onChange={e => setSourceVal(e.target.value)} placeholder="Add link source…"
                            style={editAreaStyle}
                            onFocus={e => (e.currentTarget.style.borderColor = ACCENT)}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-line)')} />
                    ) : (
                        <div style={cardBox}><MarkdownText text={sourceText} /></div>
                    )}
                </div>
            )}
            {notesBlock}
        </div>
    );

    // ── Attachment sub-toggle state
    const [attView, setAttView] = useState<'file' | 'summary'>('file');
    useEffect(() => { setAttView('file'); }, [record.id]);

    const showAttToggle = attachments.length > 0 && attSummText.trim().length > 0;

    // ── Attachment content block
    const attachmentPanel = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {header}

            {/* Attachment file / summary sub-toggle */}
            {showAttToggle && (
                <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                    {([['file', <PaperclipIcon size={11} weight="bold" />, 'File'] , ['summary', <ListBulletsIcon size={11} weight="bold" />, 'Summary']] as const).map(([key, icon, label]) => {
                        const active = attView === key;
                        return (
                            <button key={key} onClick={() => setAttView(key)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '5px', cursor: 'pointer', fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', border: '1.5px solid var(--ink-line)', background: active ? INK : 'var(--surface)', color: active ? '#fff' : 'var(--text-muted)' }}>
                                {icon}{label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* File preview */}
            {attachments.length > 0 && (!showAttToggle || attView === 'file') && (
                <div>
                    <SectionLabel text={`Attachment${attachments.length > 1 ? `s (${attachments.length})` : ''}`} />
                    <AttachmentPreview attachments={attachments} />
                </div>
            )}

            {/* Summary */}
            {attSummText.trim().length > 0 && (!showAttToggle || attView === 'summary') && (
                <div>
                    <SectionLabel text="Attachment Summary" />
                    <div style={cardBox}><MarkdownText text={attSummText} /></div>
                </div>
            )}

            {attSrcText.trim().length > 0 && (
                <div>
                    <SectionLabel text="Attachment Source" />
                    <div style={cardBox}><MarkdownText text={attSrcText} /></div>
                </div>
            )}
            {!hasLink && notesBlock}
        </div>
    );

    // Close on Escape
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    return (
        <div onClick={onClose} style={{ ...modalOverlayStyle(isNarrow), background: 'rgba(35,38,46,0.45)', backdropFilter: 'blur(4px)' }}>
            <div ref={contentRef} onClick={e => e.stopPropagation()}
                style={{ ...modalCardStyle(isNarrow), ...(!isNarrow && showToggle ? { height: '88vh', maxHeight: '88vh' } : {}), borderRadius: isNarrow ? 0 : '8px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', boxShadow: '12px 12px 0 rgba(35,38,46,0.18)' }}>
                <CornerBrackets inset={10} size={12} />

                {/* Top rule */}
                <div style={{ padding: '10px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1.5px solid var(--ink-line)' }}>
                    <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>// CHEAT SHEET · DETAIL</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {showToggle && <ViewToggle viewMode={viewMode} onChange={setViewMode} />}
                        <div onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                            <XIcon size={14} weight="bold" />
                        </div>
                    </div>
                </div>

                {/* Content — single panel when one source, sliding when both */}
                {!showToggle ? (
                    // The scroll container IS the flex child — no height:100% dependency,
                    // so it scrolls reliably even when the modal is sized by maxHeight.
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: isNarrow ? '16px 12px 28px' : '20px 28px 32px' }}>
                        {hasLink ? linkPanel : attachmentPanel}
                    </div>
                ) : (
                    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        <div style={{
                            display: 'flex',
                            width: '200%',
                            height: '100%',
                            transform: viewMode === 'link' ? 'translateX(0)' : 'translateX(-50%)',
                            transition: 'transform 0.42s cubic-bezier(0.4, 0, 0.2, 1)',
                            willChange: 'transform',
                        }}>
                            <div style={{ width: '50%', height: '100%', overflowY: 'auto', padding: isNarrow ? '16px 12px 28px' : '20px 28px 32px' }}>
                                {linkPanel}
                            </div>
                            <div style={{ width: '50%', height: '100%', overflowY: 'auto', padding: isNarrow ? '16px 12px 28px' : '20px 28px 32px' }}>
                                {attachmentPanel}
                            </div>
                        </div>
                    </div>
                )}

                {/* Save footer — appears when there are unsaved edits */}
                {(isDirty || saved || saveError) && (
                    <div style={{ padding: '14px 20px', borderTop: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
                        {saveError && <span style={{ flex: 1, fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>⚠ {saveError}</span>}
                        {saved && <span style={{ fontFamily: MONO, fontSize: '11px', color: ACCENT_DEEP, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Saved ✓</span>}
                        {isDirty && (
                            <>
                                <div onClick={discardEdits} style={{ padding: '9px 16px', borderRadius: '5px', cursor: 'pointer', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', color: 'var(--text-muted)', fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', userSelect: 'none', transition: 'background 0.12s' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'}>
                                    Discard
                                </div>
                                <div onClick={() => { if (!saving) handleSave(); }} style={{ padding: '9px 20px', borderRadius: '5px', cursor: saving ? 'wait' : 'pointer', background: ACCENT, color: ACCENT_TEXT, border: `1.5px solid ${INK}`, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', userSelect: 'none', opacity: saving ? 0.7 : 1, transition: 'background 0.12s' }}
                                    onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLDivElement).style.background = ACCENT_DEEP; }}
                                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ACCENT}>
                                    {saving ? 'Saving…' : 'Save changes'}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Browse tiles ──────────────────────────────────────────────────────────────
function LanguageTile({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
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

// Strip markdown syntax to plain prose, so search snippets read as final text
// (not raw "**bold**", "# heading", "[label](url)" etc.).
function stripMarkdown(src: string): string {
    return (src ?? '')
        .replace(/```[\s\S]*?```/g, ' ')           // fenced code blocks
        .replace(/`([^`]+)`/g, '$1')                // inline code
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')      // images
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')     // links → label
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')          // headings
        .replace(/^\s{0,3}>\s?/gm, '')               // blockquotes
        .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')     // list markers
        .replace(/^\s*([-*_])\1{2,}\s*$/gm, ' ')     // horizontal rules
        .replace(/(\*\*\*|___)(.+?)\1/g, '$2')       // bold italic
        .replace(/(\*\*|__)(.+?)\1/g, '$2')          // bold
        .replace(/(\*|_)(.+?)\1/g, '$2')             // italic
        .replace(/~~(.+?)~~/g, '$1')                 // strikethrough
        .replace(/\s*\n\s*/g, ' ')                    // flatten to one line
        .replace(/[ \t]{2,}/g, ' ')                   // collapse spaces
        .trim();
}

// ── Search: snippet highlighting ────────────────────────────────────────────
// Build context snippets around every occurrence of `query` in `text`.
function buildSnippets(text: string, query: string, windowSize = 70, max = 8): { nodes: React.ReactNode[]; count: number } {
    const nodes: React.ReactNode[] = [];
    if (!text || !query) return { nodes, count: 0 };
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    let from = 0; let count = 0; const positions: number[] = [];
    while (true) {
        const idx = lower.indexOf(q, from);
        if (idx === -1) break;
        positions.push(idx);
        count++;
        from = idx + q.length;
    }
    positions.slice(0, max).forEach((idx, i) => {
        const start = Math.max(0, idx - windowSize);
        const end   = Math.min(text.length, idx + q.length + windowSize);
        const pre   = (start > 0 ? '…' : '') + text.slice(start, idx);
        const match = text.slice(idx, idx + q.length);
        const post  = text.slice(idx + q.length, end) + (end < text.length ? '…' : '');
        nodes.push(
            <div key={i} style={{ fontSize: '13px', lineHeight: 1.65, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {pre}
                <mark style={{ background: 'var(--accent-soft)', color: ACCENT_DEEP, fontWeight: 700, padding: '0 2px', borderRadius: '3px' }}>{match}</mark>
                {post}
            </div>
        );
    });
    return { nodes, count };
}

// ── Combined Home (centered search + recent + browse, transitions to results) ──
function HomeView({ records, table, query, setQuery, recentRecords, allLangs, langMap, browseRecords, browseTitle, onOpen, onSelectLang, onViewAll, onClearBrowse, onAddNew }: {
    records: readonly any[]; table: any; query: string; setQuery: (q: string) => void;
    recentRecords: any[]; allLangs: string[]; langMap: Record<string, number>;
    browseRecords: any[] | null; browseTitle: string | null;
    onOpen: (r: any) => void; onSelectLang: (l: string) => void; onViewAll: () => void; onClearBrowse: () => void; onAddNew: () => void;
}) {
    const isNarrow = useIsNarrow();
    const q = query.trim();
    const linkSummF = table.getFieldIfExists(LINK_SUMMARY_ID);
    const attSummF  = table.getFieldIfExists(ATT_SUMMARY_ID);
    const notesF    = table.getFieldIfExists(NOTES_ID);
    const finalLangField = table.getFieldIfExists(FINAL_LANGUAGE_ID);

    const results = useMemo(() => {
        if (!q) return [] as { record: any; groups: { label: string; nodes: React.ReactNode[]; count: number }[]; total: number }[];
        const out: { record: any; groups: { label: string; nodes: React.ReactNode[]; count: number }[]; total: number }[] = [];
        records.forEach(r => {
            const sources: { label: string; text: string }[] = [
                { label: 'Link Summary',       text: stripMarkdown(linkSummF ? r.getCellValueAsString(linkSummF) : '') },
                { label: 'Attachment Summary', text: stripMarkdown(attSummF  ? r.getCellValueAsString(attSummF)  : '') },
                { label: 'Notes',              text: stripMarkdown(notesF    ? r.getCellValueAsString(notesF)    : '') },
            ];
            const groups: { label: string; nodes: React.ReactNode[]; count: number }[] = [];
            let total = 0;
            sources.forEach(s => {
                const { nodes, count } = buildSnippets(s.text, q);
                if (count > 0) { groups.push({ label: s.label, nodes, count }); total += count; }
            });
            if (total > 0) out.push({ record: r, groups, total });
        });
        out.sort((a, b) => b.total - a.total);
        return out;
    }, [records, q, linkSummF, attSummF, notesF]);

    const totalMatches = results.reduce((n, r) => n + r.total, 0);
    const showBrowse = !q && browseRecords;          // a language / all view is active
    const showHome   = !q && !browseRecords;         // default: recent + browse-by-language

    return (
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isNarrow ? '8px 12px 48px' : '8px 28px 48px' }}>
            {/* Centered search hero */}
            <div style={{ width: '100%', maxWidth: '720px', marginTop: '6vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 8px' }}>
                    <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>CS · 001 / Search OS</span>
                    <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>{records.length} sheets · {allLangs.length} langs</span>
                </div>
                <h2 style={{ margin: '0 0 22px', fontFamily: MONO, fontSize: 'clamp(34px, 7vw, 64px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', textAlign: 'center', textTransform: 'uppercase', lineHeight: 0.92 }}>
                    What are you<br />looking<span style={{ color: ACCENT_DEEP }}>_for?</span>
                </h2>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '6px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)' }}>
                    <MagnifyingGlassIcon size={20} color={ACCENT_DEEP} weight="bold" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="SEARCH SUMMARIES, NOTES, LANGUAGES…" autoFocus
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: MONO, fontSize: '14px', letterSpacing: '0.02em', color: 'var(--text-primary)' }} />
                    {query && (
                        <div onClick={() => setQuery('')} style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'var(--surface-2)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                            <XIcon size={11} weight="bold" />
                        </div>
                    )}
                </div>
                {showHome && (
                    <div onClick={onAddNew} style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '5px', cursor: 'pointer', background: ACCENT, color: ACCENT_TEXT, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', userSelect: 'none', border: `1.5px solid ${INK}` }}>
                        <PlusIcon size={14} weight="bold" /> Add a new sheet
                    </div>
                )}
            </div>

            {/* Search results */}
            {q && (
                <div style={{ width: '100%', maxWidth: '780px', marginTop: '30px' }}>
                    <div style={{ ...monoLabel, color: 'var(--text-muted)', marginBottom: '14px' }}>
                        {results.length === 0 ? '// No matches found' : `// ${results.length} sheet${results.length !== 1 ? 's' : ''} · ${totalMatches} match${totalMatches !== 1 ? 'es' : ''}`}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {results.map(({ record, groups, total }) => {
                            const title = getName(record, table);
                            const langs = getFinalLangs(record, finalLangField);
                            const linkF = table.getFieldIfExists(LINK_ID);
                            const link  = linkF ? record.getCellValueAsString(linkF) : '';
                            return (
                                <div key={record.id} onClick={() => onOpen(record)}
                                    style={{ borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', padding: '20px 22px', cursor: 'pointer', transition: 'border-color 0.16s' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = ACCENT}
                                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--ink-line)'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                        <span style={{ fontFamily: MONO, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{title || 'Untitled'}</span>
                                        {langs.map(l => <Tag key={l} text={l} accent />)}
                                        <span style={{ marginLeft: 'auto', ...monoLabel, color: 'var(--text-muted)' }}>{total} match{total !== 1 ? 'es' : ''}</span>
                                        {link && (
                                            <a href={link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                                style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--surface-2)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', textDecoration: 'none', flexShrink: 0 }}>
                                                <ArrowUpRightIcon size={13} weight="bold" />
                                            </a>
                                        )}
                                    </div>
                                    {groups.map((g, gi) => (
                                        <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? '12px' : 0 }}>
                                            <div style={{ ...monoLabel, color: 'var(--text-muted)', marginBottom: '6px' }}>{g.label} · {g.count}</div>
                                            {g.nodes}
                                            {g.count > g.nodes.length && (
                                                <div style={{ ...monoLabel, color: 'var(--text-muted)' }}>+{g.count - g.nodes.length} more</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Browse: a selected language or All Sheets */}
            {showBrowse && (
                <div style={{ width: '100%', maxWidth: '1080px', marginTop: '34px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1.5px solid var(--ink-line)' }}>
                        <span style={{ fontFamily: MONO, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{browseTitle}</span>
                        <span style={{ ...monoLabel, color: ACCENT_DEEP }}>[{String(browseRecords!.length).padStart(2, '0')}]</span>
                        <span onClick={onClearBrowse} style={{ marginLeft: 'auto', ...monoLabel, color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', userSelect: 'none' }}>
                            <ArrowLeftIcon size={11} weight="bold" /> Back
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '14px' }}>
                        {browseRecords!.map((r, i) => (
                            <CheatSheetCard key={r.id} record={r} index={i} table={table} onClick={() => onOpen(r)} />
                        ))}
                    </div>
                </div>
            )}

            {/* Default home: stat bar + last three + browse by language */}
            {showHome && (
                <div style={{ width: '100%', maxWidth: '1080px', marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
                    {/* Stat bar */}
                    <div style={{ border: '1.5px solid var(--ink-line)', borderRadius: '6px', overflow: 'hidden' }}>
                        <BlackLabel text="// Overview" />
                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                            {([['Sheets', String(records.length)], ['Languages', String(allLangs.length)], ['Recent', String(recentRecords.length)]] as [string, string][]).map(([label, value], i) => (
                                <div key={label} style={{ flex: '1 1 110px', minWidth: 0, padding: '14px 16px', borderLeft: i === 0 ? 'none' : '1.5px solid var(--ink-line)' }}>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
                                    <div style={{ ...monoLabel, color: 'var(--text-muted)', marginTop: '6px' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {recentRecords.length > 0 && (
                        <div>
                            <SectionLabel text="// Recently Added" />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '14px' }}>
                                {recentRecords.map((r, i) => (
                                    <CheatSheetCard key={r.id} record={r} index={i} table={table} onClick={() => onOpen(r)} />
                                ))}
                            </div>
                        </div>
                    )}
                    {allLangs.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <SectionLabel text="// Browse by Language" />
                                <span onClick={onViewAll} style={{ ...monoLabel, color: ACCENT_DEEP, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', userSelect: 'none' }}>
                                    View all <CaretRightIcon size={11} weight="bold" />
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                                {allLangs.map(lang => (
                                    <LanguageTile key={lang} label={lang} count={langMap[lang] ?? 0} onClick={() => onSelectLang(lang)} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── New: full-page capture form (live-populating) ─────────────────────────────
function getChoices(field: any): Array<{ id: string; name: string }> {
    return (field?.config as any)?.options?.choices ?? [];
}

// Populating field: shimmer placeholder while empty, fade in when filled.
function LiveField({ label, value }: { label: string; value: string }) {
    const filled = value.trim().length > 0;
    return (
        <div>
            <SectionLabel text={label} />
            {filled ? (
                <div className="cs-fade-in" style={{ borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', padding: '14px 16px', fontSize: '13px', lineHeight: 1.65, color: 'var(--text-primary)' }}>
                    <MarkdownText text={value} />
                </div>
            ) : (
                <div style={{ borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[88, 64].map((w, i) => (<div key={i} className="cs-shimmer" style={{ height: '10px', width: `${w}%`, borderRadius: '3px' }} />))}
                </div>
            )}
        </div>
    );
}

function NewView({ table, records }: { table: any; records: readonly any[] }) {
    const isNarrow = useIsNarrow();
    const linkField      = table.getFieldIfExists(LINK_ID);
    const attachField    = table.getFieldIfExists(ATTACHMENT_ID);
    const notesField     = table.getFieldIfExists(NOTES_ID);
    const noteTitleField = table.getFieldIfExists(NOTE_TITLE_ID);
    const titleField     = table.getFieldIfExists(LINK_TITLE_ID);
    const summField      = table.getFieldIfExists(LINK_SUMMARY_ID);
    const linkLangField  = table.getFieldIfExists(LINK_LANGUAGE_ID);
    const langChoices    = getChoices(linkLangField).map(c => c.name);

    const [url, setUrl]             = useState('');
    const [files, setFiles]         = useState<File[]>([]);
    const [notes, setNotes]         = useState('');
    const [noteTitle, setNoteTitle] = useState('');
    const [langs, setLangs]         = useState<string[]>([]);
    const [newId, setNewId]         = useState<string | null>(null);
    const [createdWithLink, setCreatedWithLink] = useState(false);
    const [creating, setCreating]   = useState(false);
    const [saving, setSaving]       = useState(false);
    const [saved, setSaved]         = useState(false);
    const [error, setError]         = useState('');
    const [seeded, setSeeded]       = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // The reactive record once created (re-renders as AI fields fill)
    const rec = newId ? records.find(r => r.id === newId) ?? null : null;
    const linkTitle = rec && titleField ? rec.getCellValueAsString(titleField) : '';
    const linkSumm  = rec && summField  ? rec.getCellValueAsString(summField)  : '';
    const autoLangs: string[] = rec && linkLangField ? ((rec.getCellValue(linkLangField) as { name: string }[] | null) ?? []).map(l => l.name) : [];

    // Seed the editable Link Language selection once the AI auto-fills it
    useEffect(() => { if (!seeded && autoLangs.length > 0) { setLangs(autoLangs); setSeeded(true); } }, [autoLangs, seeded]);

    const hasNotes   = notes.trim().length > 0;
    const hasContent = url.trim().length > 0 || files.length > 0 || hasNotes;

    const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = Array.from(e.target.files ?? []);
        if (f.length) setFiles(prev => [...prev, ...f]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));
    const toggleLang = (l: string) => setLangs(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

    async function handleCreate() {
        if (!hasContent) { setError('Add a link, attachment, or note first.'); return; }
        setCreating(true); setError('');
        const fields: Record<string, any> = {};
        if (linkField && url.trim())     fields[linkField.id]   = url.trim();
        if (attachField && files.length) fields[attachField.id] = files.map(file => ({ file }));
        if (notesField && hasNotes)      fields[notesField.id]  = notes;
        try {
            const id = await table.createRecordAsync(fields);
            setNewId(id); setCreatedWithLink(!!url.trim());
        } catch (e: any) {
            setError(e?.message ?? 'Could not create record.');
        }
        setCreating(false);
    }

    async function handleSave() {
        if (!rec) return;
        if (createdWithLink && langs.length === 0) { setError('Pick a Link Language (category) before saving.'); return; }
        if (hasNotes && !noteTitle.trim()) { setError('Add a Note Title for your note.'); return; }
        setSaving(true); setError('');
        const updates: Record<string, any> = {};
        if (noteTitleField && noteTitle.trim()) updates[noteTitleField.id] = noteTitle.trim();
        if (notesField)                         updates[notesField.id]     = notes || null;
        if (linkLangField && langs.length)      updates[linkLangField.id]  = langs.map(name => ({ name }));
        try {
            await table.updateRecordAsync(rec, updates);
            setSaved(true); setTimeout(() => setSaved(false), 2500);
        } catch (e: any) {
            setError(e?.message ?? 'Save failed — check field permissions.');
        }
        setSaving(false);
    }

    function reset() {
        setUrl(''); setFiles([]); setNotes(''); setNoteTitle(''); setLangs([]);
        setNewId(null); setCreatedWithLink(false); setSeeded(false); setSaved(false); setError('');
    }

    const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', borderRadius: '5px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
    const langOptions = langChoices.length ? langChoices : autoLangs;

    return (
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', justifyContent: 'center', padding: isNarrow ? '8px 12px 40px' : '8px 28px 40px' }}>
            <div style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1.5px solid var(--ink-line)' }}>
                    <div style={{ fontFamily: MONO, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', textTransform: 'uppercase' }}>New<span style={{ color: ACCENT_DEEP }}>_</span>note</div>
                    {newId && (
                        <span onClick={reset} style={{ ...monoLabel, color: ACCENT_DEEP, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', userSelect: 'none' }}>
                            <PlusIcon size={12} weight="bold" /> Start another
                        </span>
                    )}
                </div>

                {/* Link */}
                <div>
                    <SectionLabel text="Link" />
                    <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a URL…" disabled={!!newId}
                        style={{ ...inputStyle, opacity: newId ? 0.6 : 1 }} />
                </div>

                {/* Attachment */}
                <div>
                    <SectionLabel text="Attachment" />
                    {!newId && (
                        <>
                            <input ref={fileInputRef} type="file" multiple onChange={onFiles} style={{ display: 'none' }} />
                            <div onClick={() => fileInputRef.current?.click()}
                                style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <PaperclipIcon size={15} weight="bold" /> {files.length ? 'Add more files…' : 'Upload files…'}
                            </div>
                        </>
                    )}
                    {files.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: newId ? 0 : '10px' }}>
                            {files.map((f, i) => (
                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 10px 6px 12px', borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '220px' }}>
                                    <FileIcon size={13} weight="bold" color={TEAL} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                    {!newId && <span onClick={e => { e.stopPropagation(); removeFile(i); }} style={{ display: 'flex', cursor: 'pointer', color: 'var(--text-muted)' }}><XIcon size={11} weight="bold" /></span>}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Live AI fields (after a link entry is created) */}
                {rec && createdWithLink && (
                    <>
                        <LiveField label="Link Title" value={linkTitle} />
                        <LiveField label="Link Summary" value={linkSumm} />
                    </>
                )}

                {/* Link Language / category — required after creation */}
                {rec && (
                    <div>
                        <SectionLabel text="Link Language *" />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                            {langOptions.length === 0 ? (
                                <div className="cs-shimmer" style={{ height: '30px', width: '130px', borderRadius: '5px' }} />
                            ) : (
                                langOptions.map(l => {
                                    const active = langs.includes(l);
                                    return (
                                        <span key={l} onClick={() => toggleLang(l)}
                                            style={{ cursor: 'pointer', userSelect: 'none', fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '7px 13px', borderRadius: '5px', border: `1.5px solid ${active ? INK : 'var(--ink-line)'}`, background: active ? ACCENT : 'var(--surface)', color: active ? ACCENT_TEXT : 'var(--text-muted)' }}>
                                            {l}
                                        </span>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div>
                    <SectionLabel text="Notes" />
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6} placeholder="Write your notes…"
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                </div>

                {/* Note Title — appears once Notes has content */}
                {hasNotes && (
                    <div className="cs-fade-in">
                        <SectionLabel text="Note Title *" />
                        <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Give this note a title…" style={inputStyle} />
                    </div>
                )}

                {error && <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>{error}</div>}

                {/* Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!newId ? (
                        <div onClick={() => { if (!creating) handleCreate(); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 24px', borderRadius: '5px', cursor: creating ? 'default' : 'pointer', background: ACCENT, color: ACCENT_TEXT, fontFamily: MONO, fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', userSelect: 'none', opacity: creating ? 0.7 : 1, border: `1.5px solid ${INK}` }}>
                            {creating ? 'Creating…' : 'Create'}
                        </div>
                    ) : (
                        <div onClick={() => { if (!saving) handleSave(); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 24px', borderRadius: '5px', cursor: saving ? 'default' : 'pointer', background: ACCENT, color: ACCENT_TEXT, fontFamily: MONO, fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', userSelect: 'none', opacity: saving ? 0.7 : 1, border: `1.5px solid ${INK}` }}>
                            {saving ? 'Saving…' : 'Save'}
                        </div>
                    )}
                    {saved && <span style={{ ...monoLabel, color: '#16a34a' }}>Saved ✓</span>}
                </div>
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function CheatSheetsApp(): React.ReactElement {
    const isNarrow = useIsNarrow();
    const base  = useBase();
    const table = base.tables.find(t => t.getFieldIfExists(LINK_SUMMARY_ID) !== null) ?? base.tables[0];
    const records = useRecords(table);

    const [mode,           setMode]           = useState<'home' | 'new'>('home');
    const [view,           setView]           = useState<'home' | 'language' | 'all'>('home');
    const [activeLang,     setActiveLang]     = useState<string | null>(null);
    const [search,         setSearch]         = useState('');
    const [selectedRecord, setSelectedRecord] = useState<any>(null);

    const finalLangField = table?.getFieldIfExists(FINAL_LANGUAGE_ID);
    const createdField   = table?.getFieldIfExists(CREATED_DATE_ID)
        ?? table?.fields.find((f: any) => f.name.toLowerCase().includes('created'))
        ?? null;

    const langMap = useMemo(() => {
        const map: Record<string, number> = {};
        records.forEach(r => {
            getFinalLangs(r, finalLangField).forEach(n => { map[n] = (map[n] ?? 0) + 1; });
        });
        return map;
    }, [records, finalLangField]);

    const allLangs = useMemo(() => Object.keys(langMap).sort(), [langMap]);

    useEffect(() => { setSelectedRecord(null); }, [view, activeLang, search]);

    const isSearching = search.trim().length > 0;

    // Newest first — by Created Date descending; when Created can't separate records
    // (equal/unreadable), fall back to reverse table order (later-added = newer).
    const recordsByNewest = useMemo(() => {
        const withIdx = records.map((r, i) => ({ r, i, t: getCreatedTime(r, createdField) }));
        withIdx.sort((a, b) => (b.t - a.t) || (b.i - a.i));
        return withIdx.map(x => x.r);
    }, [records, createdField]);
    const recentRecords = useMemo(() => recordsByNewest.slice(0, 3), [recordsByNewest]);

    // Records shown when a language tile or "View all" is active (null = default home)
    const browseRecords = useMemo(() => {
        if (isSearching) return null;
        if (view === 'all') return recordsByNewest;
        if (view === 'language' && activeLang && finalLangField) return records.filter(r => getFinalLangs(r, finalLangField).includes(activeLang));
        return null;
    }, [isSearching, view, activeLang, records, recordsByNewest, finalLangField]);
    const browseTitle = view === 'all' ? 'All Sheets' : view === 'language' ? activeLang : null;

    if (!table) return <div style={{ padding: '24px' }}>No table found.</div>;

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
                    --text-primary: #23262e;
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
                .cs-shimmer {
                    background: linear-gradient(90deg, var(--surface-2) 25%, var(--accent-soft) 50%, var(--surface-2) 75%);
                    background-size: 200% 100%;
                    animation: cs-shimmer 1.3s ease-in-out infinite;
                }
                @keyframes cs-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
                .cs-fade-in { animation: cs-fade-in 0.5s ease-out; }
                @keyframes cs-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            <div style={{ position: 'relative', height: '100%', background: 'var(--page)', backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)', backgroundSize: '38px 38px', fontFamily: 'var(--font-body), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CornerBrackets inset={10} size={12} />

                {/* Top utility bar */}
                <div style={{ padding: isNarrow ? '10px 12px' : '12px 28px', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, borderBottom: '1.5px solid var(--ink-line)' }}>
                    <div onClick={() => { setMode('home'); setView('home'); setActiveLang(null); setSearch(''); }} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, cursor: 'pointer' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '5px', background: ACCENT, border: `1.5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <BookOpenIcon size={13} weight="bold" color={ACCENT_TEXT} />
                        </div>
                        <span style={{ ...monoLabel, fontSize: '11px', color: 'var(--text-primary)' }}>Cheat_Sheets / Search</span>
                    </div>

                    {/* Home / New toggle + Help (far right) */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {(['home', 'new'] as const).map(m => {
                            const active = mode === m;
                            return (
                                <button key={m} onClick={() => { setMode(m); setSelectedRecord(null); }}
                                    title={m === 'home' ? 'Search' : 'New sheet'} aria-label={m === 'home' ? 'Search' : 'New sheet'}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '36px', cursor: 'pointer', borderRadius: '5px', border: '1.5px solid var(--ink-line)', background: active ? INK : 'var(--surface)', color: active ? '#fff' : 'var(--text-muted)' }}>
                                    {m === 'home' ? <MagnifyingGlassIcon size={15} weight="bold" /> : <PlusIcon size={15} weight="bold" />}
                                </button>
                            );
                        })}
                        <HelpButton page="cheatsheet" />
                    </div>
                </div>

                {/* Body: main content (full width) */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {mode === 'new' ? (
                            <NewView table={table} records={records} />
                        ) : (
                            <HomeView
                                records={records}
                                table={table}
                                query={search}
                                setQuery={setSearch}
                                recentRecords={recentRecords}
                                allLangs={allLangs}
                                langMap={langMap}
                                browseRecords={browseRecords}
                                browseTitle={browseTitle}
                                onOpen={r => setSelectedRecord(r)}
                                onSelectLang={lang => { setView('language'); setActiveLang(lang); setSearch(''); }}
                                onViewAll={() => { setView('all'); setSearch(''); }}
                                onClearBrowse={() => { setView('home'); setActiveLang(null); }}
                                onAddNew={() => { setMode('new'); setSelectedRecord(null); }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Detail popout */}
            {selectedRecord && (
                <CheatSheetDetail record={selectedRecord} table={table} query={search} onClose={() => setSelectedRecord(null)} />
            )}

        </>
    );
}

export default function CheatsheetPage() {
    // Data is fetched client-side via SWR Suspense, so skip SSR for this subtree.
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    return (
        <Shell>
            {mounted ? (
                <AirtableBoundary>
                    <CheatSheetsApp />
                </AirtableBoundary>
            ) : (
                <div style={{ flex: 1, background: 'var(--page)' }} />
            )}
        </Shell>
    );
}