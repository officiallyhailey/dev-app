'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useBase, useRecords, AirtableBoundary } from '@/lib/airtable/hooks';
import { Shell } from '@/lib/components/Shell';
import { useIsNarrow } from '@/lib/useIsNarrow';
import { modalOverlayStyle, modalCardStyle } from '@/lib/components/modalStyle';
import { HelpButton } from '@/lib/components/InfoModal';
import { LiveField } from '@/lib/components/LiveField';
import {
    XIcon, MagnifyingGlassIcon, ArrowUpRightIcon, ArrowLeftIcon,
    CaretRightIcon, SquaresFourIcon, PlusIcon, PaperclipIcon, FileIcon,
    BookmarkSimpleIcon, CircleHalfIcon, CheckCircleIcon, GraduationCapIcon, TrophyIcon,
    BrainIcon, PlugIcon, GearIcon, TerminalWindowIcon, CloudIcon, CodeIcon, UsersIcon,
    DatabaseIcon, PaletteIcon, ShieldIcon, NotePencilIcon, KanbanIcon, BookOpenIcon, LightningIcon,
} from '@phosphor-icons/react';

type Field = any;

// ── Courses table (pinned by id; the base has many tables) ────────────────────
const COURSES_TABLE = 'tbl6MsSDOkKhgIEwe';
const NAME_ID     = 'fldIi9eSs71wMsXin'; // Name (formula, primary)
const COURSE_ID   = 'fldW4QUsGHtywFt4O'; // Course (aiText)
const ORG_ID      = 'fldcq7iSYSoyAIuFi'; // Organization (aiText)
const SUMMARY_ID  = 'fldhxvxOgWCoxqKr2'; // Summary (aiText)
const FAVICON_ID  = 'fldU3NRwbh67fTZIa'; // Organization Favicon (attachments)
const CATEGORY_ID = 'fldIQZy0zhJDqzGnk'; // Category (singleSelect)
const UPDATE_ID   = 'fldlakOgCo6M9VHPp'; // Update (singleSelect: Saved | In Progress | Completed)
const PROOF_ID    = 'fldEmoFMRpw1ABTnz'; // Proof of Completion (attachments)
const NOTES_ID    = 'fld4rTHccanhp8XPJ'; // Notes (multilineText)
const LINK_ID     = 'fldE1JRL5yntz8z5u'; // Link (url)
const CREATED_ID  = 'fldWQC5MEOX0W7V5P'; // Created (createdTime)

const ACCENT      = '#F5C13D'; // amber primary
const ACCENT_DEEP = '#E3A81B'; // darker amber (tags / icons on tint)
const ACCENT_TEXT = '#2c2510'; // dark text on amber
const INK         = '#23262e'; // charcoal (line-art ink / titles / pills)

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const monoLabel: React.CSSProperties = { fontFamily: MONO, fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' };

// ── The progress status model (the one Update single-select drives everything) ──
const STATUS_ORDER = ['Saved', 'In Progress', 'Completed'] as const;
type Status = typeof STATUS_ORDER[number];
const STATUS_META: Record<Status, { line: string; text: string; soft: string; Icon: React.ComponentType<any> }> = {
    'Saved':       { line: '#6b7280', text: '#5b6573', soft: 'rgba(107,114,128,0.13)', Icon: BookmarkSimpleIcon },
    'In Progress': { line: '#E3A81B', text: '#9a6f12', soft: 'rgba(227,168,27,0.16)', Icon: CircleHalfIcon },
    'Completed':   { line: '#16a34a', text: '#15803d', soft: 'rgba(22,163,74,0.14)', Icon: CheckCircleIcon },
};

function getStatus(record: any, updateField: any): Status | null {
    if (!updateField) return null;
    const v = record.getCellValue(updateField);
    const name = v && typeof v === 'object' && 'name' in v ? (v as { name: string }).name : (typeof v === 'string' ? v : null);
    return name && (STATUS_ORDER as readonly string[]).includes(name) ? (name as Status) : null;
}

// ── Category → icon (adds visual variety; falls back to a cap for the long tail) ─
const CATEGORY_ICON: Record<string, React.ComponentType<any>> = {
    'AI Tool': BrainIcon, 'API': PlugIcon, 'Automation': GearIcon, 'CLI Tool': TerminalWindowIcon,
    'Cloud Platform': CloudIcon, 'Code Editor': CodeIcon, 'Collaboration': UsersIcon, 'Community': UsersIcon,
    'Data': DatabaseIcon, 'Storage': DatabaseIcon, 'Design': PaletteIcon, 'Security': ShieldIcon,
    'Note Taking': NotePencilIcon, 'Writing': NotePencilIcon, 'Project Management': KanbanIcon,
    'Knowledge Base': BookOpenIcon, 'Research': BookOpenIcon, 'Learning': GraduationCapIcon,
    'Practice': GraduationCapIcon, 'Productivity': LightningIcon, 'Workflows': LightningIcon,
};
const categoryIcon = (cat: string): React.ComponentType<any> => CATEGORY_ICON[cat] ?? GraduationCapIcon;

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

function BlackLabel({ text }: { text: string }) {
    return <div style={{ ...monoLabel, padding: '7px 12px', color: '#fff', background: INK }}>{text}</div>;
}

function Tag({ text, accent }: { text: string; accent?: boolean }) {
    return <span style={{ ...monoLabel, padding: '3px 8px', borderRadius: '3px', whiteSpace: 'nowrap', color: accent ? ACCENT_DEEP : 'var(--text-muted)', background: accent ? 'var(--accent-soft)' : 'transparent', border: `1.2px solid ${accent ? 'transparent' : 'var(--ink-line)'}` }}>{text}</span>;
}

function SectionLabel({ text }: { text: string }) {
    return <div style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: '10px' }}>{text}</div>;
}

function StatusBadge({ status }: { status: Status }) {
    const m = STATUS_META[status];
    return (
        <span style={{ ...monoLabel, display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 9px', borderRadius: '4px', color: m.text, background: m.soft, border: `1.2px solid ${m.line}`, whiteSpace: 'nowrap' }}>
            <m.Icon size={11} weight="bold" /> {status}
        </span>
    );
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
    const s = record.getCellValueAsString(createdField);
    const t = Date.parse(s);
    return Number.isNaN(t) ? 0 : t;
}

function getCategory(record: any, categoryField: any): string {
    if (!categoryField) return '';
    const v = record.getCellValue(categoryField);
    return v && typeof v === 'object' && 'name' in v ? (v as { name: string }).name : '';
}

// Favicon image with a graduation-cap fallback (used in cards and the detail header)
function FaviconIcon({ url, iconSize }: { url: string | null; iconSize: number }) {
    const [failed, setFailed] = useState(false);
    if (url && !failed) {
        return (
            <img src={url} alt="" onError={() => setFailed(true)}
                style={{ width: `${iconSize}px`, height: `${iconSize}px`, borderRadius: '7px', objectFit: 'cover', display: 'block' }} />
        );
    }
    return <GraduationCapIcon size={iconSize} color={ACCENT_DEEP} weight="bold" />;
}

// ── Markdown (summary rendering) ──────────────────────────────────────────────
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
        else if (m[6]) parts.push(<a key={m.index} href={m[7]} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: 'underline' }}>{m[6]}</a>);
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

// ── Course card (grid) ──────────────────────────────────────────────────────────
function CourseCard({ record, table, nameField, summaryField, faviconField, linkField, orgField, categoryField, updateField, index, onClick }: {
    record: any; table: any; nameField: any; summaryField: any; faviconField: any; linkField: any; orgField: any; categoryField: any; updateField: any; index?: number; onClick: () => void;
}) {
    const [saving, setSaving] = useState(false);
    const name       = nameField    ? record.getCellValueAsString(nameField)    : record.name;
    const org        = orgField     ? record.getCellValueAsString(orgField)     : '';
    const rawSummary = summaryField ? record.getCellValueAsString(summaryField) : '';
    const preview    = rawSummary.length > 300 ? rawSummary.slice(0, 300).trimEnd() + '…' : rawSummary;
    const favicon    = getFaviconUrl(record, faviconField);
    const link       = linkField ? record.getCellValueAsString(linkField) : '';
    const category   = getCategory(record, categoryField);
    const status     = getStatus(record, updateField);

    // Save toggles: a course with no status becomes Saved; clicking Saved again
    // clears it (un-saves). In-progress / completed courses show a badge instead.
    const toggleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (saving || !updateField) return;
        setSaving(true);
        const next = status === 'Saved' ? null : { name: 'Saved' };
        try { await table.updateRecordAsync(record, { [updateField.id]: next }); } catch { /* surfaced on the detail save */ }
        setSaving(false);
    };

    const iconBoxStyle: React.CSSProperties = { width: '42px', height: '42px', borderRadius: '8px', flexShrink: 0, background: 'var(--surface-2)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', textDecoration: 'none' };

    return (
        <div onClick={onClick}
            style={{ position: 'relative', borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '13px', cursor: 'pointer', transition: 'border-color 0.16s, transform 0.16s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = ACCENT; el.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--ink-line)'; el.style.transform = 'translateY(0)'; }}>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                {/* Favicon → opens the Link */}
                {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" title="Open link"
                        onClick={e => e.stopPropagation()} style={{ ...iconBoxStyle, cursor: 'pointer' }}>
                        <FaviconIcon url={favicon} iconSize={22} />
                    </a>
                ) : (
                    <div style={iconBoxStyle}><FaviconIcon url={favicon} iconSize={22} /></div>
                )}
                {/* In-progress / completed show a badge; otherwise a Save toggle */}
                {status === 'In Progress' || status === 'Completed' ? (
                    <StatusBadge status={status} />
                ) : (
                    <div onClick={toggleSave} title={status === 'Saved' ? 'Saved — click to remove' : 'Save this course'}
                        style={{ ...monoLabel, display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '4px', cursor: saving ? 'wait' : 'pointer', color: ACCENT_TEXT, background: ACCENT, border: `1.5px solid ${INK}`, opacity: saving ? 0.7 : 1 }}
                        onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLDivElement).style.background = ACCENT_DEEP; }}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ACCENT}>
                        <BookmarkSimpleIcon size={11} weight={status === 'Saved' ? 'fill' : 'bold'} /> {saving ? '…' : (status === 'Saved' ? 'Saved' : 'Save')}
                    </div>
                )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, letterSpacing: '-0.02em' }}>{name || 'Untitled'}</div>
                {(org || category) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', minWidth: 0 }}>
                        {org && <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{org}</span>}
                        {category && <Tag text={category} accent />}
                    </div>
                )}
                {preview && <div style={{ marginTop: '9px', fontSize: '11px' }}><MarkdownText text={preview} /></div>}
            </div>

            {index !== undefined && <span style={{ ...monoLabel, position: 'absolute', bottom: '10px', right: '12px', color: 'var(--text-muted)', opacity: 0.6 }}>{String(index + 1).padStart(3, '0')}</span>}
        </div>
    );
}

// ── Completion celebration overlay ────────────────────────────────────────────
function Celebration() {
    // A handful of confetti pieces, deterministic so SSR/CSR match.
    const pieces = [8, 20, 33, 46, 58, 70, 82, 92];
    const colors = [ACCENT, '#16a34a', '#2563eb', '#E3A81B'];
    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', background: 'rgba(35,38,46,0.55)', backdropFilter: 'blur(2px)', overflow: 'hidden', pointerEvents: 'none' }}>
            {pieces.map((left, i) => (
                <span key={i} className="dd-confetti" style={{ position: 'absolute', top: '18%', left: `${left}%`, width: '9px', height: '14px', background: colors[i % colors.length], animationDelay: `${(i % 4) * 0.12}s` }} />
            ))}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="dd-burst" style={{ position: 'absolute', width: '92px', height: '92px', borderRadius: '50%', border: `3px solid ${ACCENT}` }} />
                <div className="dd-pop" style={{ width: '92px', height: '92px', borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(22,163,74,0.4)' }}>
                    <TrophyIcon size={48} color="#fff" weight="fill" />
                </div>
            </div>
            <div className="dd-pop" style={{ fontFamily: MONO, fontSize: '22px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff' }}>Completed!</div>
            <div style={{ ...monoLabel, color: 'rgba(255,255,255,0.85)' }}>Certificate logged · nice work</div>
        </div>
    );
}

// ── Course detail — status, notes, and the gated proof-of-completion upload ────
function CourseModal({ record, table, nameField, summaryField, linkField, orgField, categoryField, faviconField, updateField, notesField, proofField, onClose }: {
    record: any; table: any; nameField: any; summaryField: any; linkField: any; orgField: any; categoryField: any; faviconField: any; updateField: any; notesField: any; proofField: any; onClose: () => void;
}) {
    const isNarrow = useIsNarrow();
    const name     = nameField    ? record.getCellValueAsString(nameField)    : record.name;
    const org      = orgField     ? record.getCellValueAsString(orgField)     : '';
    const link     = linkField    ? record.getCellValueAsString(linkField)    : '';
    const summary  = summaryField ? record.getCellValueAsString(summaryField) : '';
    const category = getCategory(record, categoryField);
    const favicon  = getFaviconUrl(record, faviconField);

    const originalStatus = getStatus(record, updateField);
    const originalNotes  = notesField ? record.getCellValueAsString(notesField) : '';
    const proofExisting: any[] = proofField ? ((record.getCellValue(proofField) as any[] | null) ?? []) : [];

    const [status,    setStatus]    = useState<Status | null>(originalStatus);
    const [notesVal,  setNotesVal]  = useState(originalNotes);
    const [editNotes, setEditNotes] = useState(!!originalNotes);
    const [newFiles,  setNewFiles]  = useState<File[]>([]);
    const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
    const [saving,    setSaving]    = useState(false);
    const [saved,     setSaved]     = useState(false);
    const [saveError, setSaveError] = useState('');
    const [celebrate, setCelebrate] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const notesRef     = React.useRef<HTMLTextAreaElement>(null);

    const keptProof  = proofExisting.filter(a => !removedIds.has(a.id));
    const proofCount = keptProof.length + newFiles.length;
    const needsProof = status === 'Completed' && proofCount === 0;

    const isDirty = status !== originalStatus || notesVal !== originalNotes || newFiles.length > 0 || removedIds.size > 0;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length) setNewFiles(prev => [...prev, ...files]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    const removeNewFile = (idx: number) => setNewFiles(prev => prev.filter((_, i) => i !== idx));
    const removeProof   = (att: any) => setRemovedIds(prev => { const n = new Set(prev); n.add(att.id); return n; });

    const handleSave = async () => {
        if (needsProof) { setSaveError('Attach proof of completion to mark this course complete.'); return; }
        setSaving(true); setSaveError('');
        const updates: Record<string, any> = {};
        if (updateField && status !== originalStatus && status) updates[updateField.id] = { name: status };
        if (notesField && notesVal !== originalNotes)           updates[notesField.id]  = notesVal || null;
        if (proofField && (newFiles.length > 0 || removedIds.size > 0)) {
            updates[proofField.id] = [...keptProof, ...newFiles.map(file => ({ file }))];
        }
        try {
            await table.updateRecordAsync(record, updates);
            setNewFiles([]); setRemovedIds(new Set());
            const justCompleted = status === 'Completed' && originalStatus !== 'Completed';
            if (justCompleted) {
                setCelebrate(true);
                setTimeout(() => setCelebrate(false), 2400);
            } else {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (e: any) {
            setSaveError(e?.message ?? 'Save failed — check field permissions.');
        }
        setSaving(false);
    };

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    // Auto-grow the Notes textarea to fit its content.
    useEffect(() => {
        const el = notesRef.current;
        if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
    }, [notesVal, editNotes]);

    const fieldLabel: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em', marginBottom: '7px' };
    const fieldInputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', fontSize: '13px', color: 'var(--text-primary)', background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', borderRadius: '6px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'none' };

    return (
        <div onClick={onClose} style={{ ...modalOverlayStyle(isNarrow), background: 'rgba(35,38,46,0.45)', backdropFilter: 'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()}
                style={{ ...modalCardStyle(isNarrow), position: 'relative', borderRadius: isNarrow ? 0 : '8px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', boxShadow: '12px 12px 0 rgba(35,38,46,0.18)' }}>
                <CornerBrackets inset={10} size={12} />
                {celebrate && <Celebration />}

                {/* Top rule */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1.5px solid var(--ink-line)', flexShrink: 0 }}>
                    <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>// COURSE · DETAIL</span>
                    <div onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                        <XIcon size={14} weight="bold" />
                    </div>
                </div>

                {/* Body */}
                <div style={{ overflowY: 'auto', flex: 1, padding: isNarrow ? '18px 16px 24px' : '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ width: '54px', height: '54px', borderRadius: '8px', flexShrink: 0, background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <FaviconIcon url={favicon} iconSize={28} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: MONO, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.12, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{name || 'Untitled'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                {org && <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{org}</span>}
                                {category && <Tag text={category} accent />}
                            </div>
                        </div>
                        {link && (
                            <a href={link} target="_blank" rel="noopener noreferrer" title="Open course"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '6px', flexShrink: 0, background: ACCENT, color: ACCENT_TEXT, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', border: `1.5px solid ${INK}`, transition: 'background 0.1s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = ACCENT_DEEP}
                                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ACCENT}>
                                <ArrowUpRightIcon size={13} weight="bold" />
                            </a>
                        )}
                    </div>

                    {/* Progress — the segmented Saved → In Progress → Completed control */}
                    <div>
                        <div style={fieldLabel}>Your progress</div>
                        <div style={{ display: 'flex', gap: isNarrow ? '6px' : '8px' }}>
                            {STATUS_ORDER.map(s => {
                                const m = STATUS_META[s];
                                const active = status === s;
                                return (
                                    <button key={s} onClick={() => setStatus(s)}
                                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: isNarrow ? '10px 6px' : '11px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: MONO, fontSize: isNarrow ? '9px' : '10px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'all 0.14s', background: active ? m.line : 'var(--surface-2)', color: active ? '#fff' : 'var(--text-muted)', border: `1.5px solid ${active ? m.line : 'var(--ink-line)'}` }}>
                                        <m.Icon size={13} weight="bold" /> {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary */}
                    {summary.trim().length > 0 && (
                        <div>
                            <BlackLabel text="// Summary" />
                            <div style={{ border: '1.5px solid var(--ink-line)', borderTop: 'none', padding: '18px' }}>
                                <MarkdownText text={summary} />
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <div style={fieldLabel}>Notes</div>
                        {editNotes ? (
                            <textarea ref={notesRef} value={notesVal} onChange={e => setNotesVal(e.target.value)} placeholder="Your notes on this course…"
                                rows={3} style={{ ...fieldInputStyle, minHeight: '72px' }}
                                onFocus={e => (e.currentTarget.style.borderColor = ACCENT)}
                                onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-line)')} />
                        ) : (
                            <div onClick={() => setEditNotes(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '6px', background: 'var(--surface-2)', border: '1.5px dashed var(--ink-line)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                                <PlusIcon size={13} weight="bold" /> Add notes
                            </div>
                        )}
                    </div>

                    {/* Proof of completion — required before a course can be Completed */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '10px' }}>
                            <div style={{ ...fieldLabel, marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                                <TrophyIcon size={13} weight="bold" color={ACCENT_DEEP} />
                                Proof of completion{proofCount > 0 ? ` (${proofCount})` : ''}
                            </div>
                            <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                            <div onClick={() => fileInputRef.current?.click()}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 14px', borderRadius: '6px', background: ACCENT, border: `1.5px solid ${INK}`, cursor: 'pointer', fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: ACCENT_TEXT, transition: 'background 0.1s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = ACCENT_DEEP}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ACCENT}>
                                <PaperclipIcon size={12} weight="bold" /> Add certificate
                            </div>
                        </div>

                        {needsProof && (
                            <div style={{ marginBottom: '10px', padding: '11px 14px', borderRadius: '6px', background: 'rgba(227,168,27,0.14)', border: `1.5px solid ${ACCENT_DEEP}`, fontSize: '12px', color: ACCENT_TEXT, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrophyIcon size={14} weight="bold" /> Attach your certificate to mark this course complete.
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {keptProof.map(att => {
                                const isImage = att.type?.startsWith('image/');
                                return (
                                    <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderRadius: '6px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', textDecoration: 'none', color: 'var(--text-primary)', transition: 'border-color 0.15s' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = ACCENT}
                                        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--ink-line)'}>
                                        {isImage && att.thumbnails?.small?.url ? (
                                            <img src={att.thumbnails.small.url} alt={att.filename} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, border: '1.2px solid var(--ink-line)' }} />
                                        ) : (
                                            <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'var(--surface-2)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <FileIcon size={18} color={ACCENT_DEEP} />
                                            </div>
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{att.filename}</div>
                                            {att.size && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: MONO }}>{(att.size / 1024).toFixed(1)} KB</div>}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <ArrowUpRightIcon size={13} color="var(--text-muted)" />
                                            <div onClick={e => { e.preventDefault(); e.stopPropagation(); removeProof(att); }} title="Remove" aria-label="Remove"
                                                style={{ width: '26px', height: '26px', borderRadius: '5px', background: 'var(--surface)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                                <XIcon size={12} weight="bold" />
                                            </div>
                                        </div>
                                    </a>
                                );
                            })}
                            {newFiles.map((file, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderRadius: '6px', background: 'var(--accent-soft)', border: `1.5px solid ${ACCENT}` }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'var(--surface)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <FileIcon size={18} color={ACCENT_DEEP} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{file.name}</div>
                                        <div style={{ fontSize: '11px', color: ACCENT_DEEP, marginTop: '2px', fontWeight: 600, fontFamily: MONO }}>{(file.size / 1024).toFixed(1)} KB · pending save</div>
                                    </div>
                                    <div onClick={e => { e.preventDefault(); removeNewFile(idx); }}
                                        style={{ width: '26px', height: '26px', borderRadius: '5px', background: 'var(--surface)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                                        <XIcon size={11} weight="bold" />
                                    </div>
                                </div>
                            ))}
                            {proofCount === 0 && !needsProof && (
                                <div style={{ padding: '16px', borderRadius: '6px', background: 'var(--surface-2)', border: '1.5px dashed var(--ink-line)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <TrophyIcon size={15} color="var(--text-muted)" />
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Finished it? Add your certificate to complete the course.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Save footer */}
                {(isDirty || saved || saveError) && !celebrate && (
                    <div style={{ padding: '14px 18px', borderTop: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
                        {saveError && <span style={{ flex: 1, fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>⚠ {saveError}</span>}
                        {saved && <span style={{ fontFamily: MONO, fontSize: '12px', color: STATUS_META['Saved'].text, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Saved ✓</span>}
                        {isDirty && (
                            <>
                                <div onClick={onClose} style={{ padding: '9px 18px', borderRadius: '6px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', color: 'var(--text-muted)', fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</div>
                                <div onClick={!saving ? handleSave : undefined}
                                    title={needsProof ? 'Attach proof of completion first' : undefined}
                                    style={{ padding: '9px 20px', borderRadius: '6px', background: needsProof ? 'var(--surface-2)' : ACCENT, border: `1.5px solid ${needsProof ? 'var(--ink-line)' : INK}`, color: needsProof ? 'var(--text-muted)' : ACCENT_TEXT, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: saving ? 'wait' : (needsProof ? 'not-allowed' : 'pointer'), opacity: saving ? 0.7 : 1, transition: 'background 0.12s' }}>
                                    {saving ? 'Saving…' : 'Save'}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Progress tracker (home masthead) ──────────────────────────────────────────
// The bar tracks completion only — it fills as courses reach Completed, not when
// they're merely saved or in progress.
function ProgressBar({ completed, total }: { completed: number; total: number }) {
    const pct = total > 0 ? (completed / total) * 100 : 0;
    return (
        <div style={{ height: '14px', borderRadius: '7px', overflow: 'hidden', background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: STATUS_META['Completed'].line, transition: 'width 0.4s' }} />
        </div>
    );
}

function ProgressTracker({ records, updateField, categoryField }: { records: any[]; updateField: any; categoryField: any }) {
    const { counts, total, pct, byCategory } = useMemo(() => {
        const counts: Record<Status, number> = { 'Saved': 0, 'In Progress': 0, 'Completed': 0 };
        const byCategory: Record<string, { done: number; total: number }> = {};
        records.forEach(r => {
            const s = getStatus(r, updateField);
            if (s) counts[s] += 1;
            const cat = getCategory(r, categoryField);
            if (cat) {
                byCategory[cat] ??= { done: 0, total: 0 };
                byCategory[cat].total += 1;
                if (s === 'Completed') byCategory[cat].done += 1;
            }
        });
        const total = records.length;
        const pct = total > 0 ? Math.round((counts['Completed'] / total) * 100) : 0;
        return { counts, total, pct, byCategory };
    }, [records, updateField, categoryField]);

    // Show categories you've actually engaged with, fullest bars first.
    const catRows = useMemo(() =>
        Object.entries(byCategory)
            .filter(([, v]) => v.done > 0)
            .sort((a, b) => (b[1].done / b[1].total) - (a[1].done / a[1].total))
            .slice(0, 6),
    [byCategory]);

    const chip = (status: Status) => {
        const m = STATUS_META[status];
        return (
            <div key={status} style={{ flex: 1, minWidth: '92px', display: 'flex', alignItems: 'center', gap: '9px', padding: '11px 12px', borderRadius: '6px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', flexShrink: 0, background: m.soft, border: `1.2px solid ${m.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <m.Icon size={16} weight="bold" color={m.line} />
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: MONO, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{counts[status]}</div>
                    <div style={{ ...monoLabel, color: 'var(--text-muted)', marginTop: '3px', fontSize: '8px' }}>{status}</div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ borderRadius: '6px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                    <SectionLabel text="// Your Progress" />
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {counts['Completed']} of {total} course{total === 1 ? '' : 's'} completed
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: '38px', lineHeight: 0.9, color: STATUS_META['Completed'].line, letterSpacing: '-0.03em' }}>{pct}</span>
                    <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: '18px', color: 'var(--text-muted)' }}>%</span>
                </div>
            </div>

            <ProgressBar completed={counts['Completed']} total={total} />

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {STATUS_ORDER.map(s => chip(s))}
            </div>

            {catRows.length > 0 && (
                <div>
                    <SectionLabel text="// By Category" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                        {catRows.map(([cat, v]) => {
                            const Icon = categoryIcon(cat);
                            const ratio = v.total > 0 ? (v.done / v.total) * 100 : 0;
                            return (
                                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                                        <Icon size={13} weight="bold" color={ACCENT_DEEP} />
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{cat}</span>
                                        <span style={{ ...monoLabel, color: 'var(--text-muted)', flexShrink: 0 }}>{v.done}/{v.total}</span>
                                    </div>
                                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--surface-2)', border: '1px solid var(--ink-line)', overflow: 'hidden' }}>
                                        <div style={{ width: `${ratio}%`, height: '100%', background: STATUS_META['Completed'].line, transition: 'width 0.4s' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Home dashboard ────────────────────────────────────────────────────────────
function CategoryTile({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
    const Icon = categoryIcon(label);
    return (
        <div onClick={onClick}
            style={{ borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', cursor: 'pointer', transition: 'border-color 0.16s, transform 0.16s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = ACCENT; el.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--ink-line)'; el.style.transform = 'translateY(0)'; }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <Icon size={15} weight="bold" color={ACCENT_DEEP} />
                <span style={{ fontFamily: MONO, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{label}</span>
            </span>
            <span style={{ ...monoLabel, fontSize: '11px', color: ACCENT_DEEP, flexShrink: 0 }}>{String(count).padStart(2, '0')}</span>
        </div>
    );
}

function HomeView({ allRecords, recentRecords, allCategories, categoryMap, fields, onSelectRecord, onSelectCategory, onViewAll, table }: {
    allRecords: any[]; recentRecords: any[]; allCategories: string[]; categoryMap: Record<string, number>;
    fields: any; onSelectRecord: (r: any) => void; onSelectCategory: (c: string) => void; onViewAll: () => void; table: any;
}) {
    const cardProps = (r: any, index?: number) => ({
        record: r, table, index,
        nameField: fields.nameField, summaryField: fields.summaryField, faviconField: fields.faviconField,
        linkField: fields.linkField, orgField: fields.orgField, categoryField: fields.categoryField, updateField: fields.updateField,
        onClick: () => onSelectRecord(r),
    });
    return (
        <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px clamp(16px, 3vw, 32px) 40px' }}>
          <div style={{ width: '100%', maxWidth: '1080px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
            {/* Masthead */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 0', borderBottom: '1.5px solid var(--ink-line)' }}>
                    <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>06 / Course Tracker</span>
                    <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>Learning · {new Date().getFullYear()}Q{Math.floor(new Date().getMonth() / 3) + 1}</span>
                </div>
                <h2 style={{ margin: '14px 0 4px', fontFamily: MONO, fontWeight: 800, fontSize: 'clamp(40px, 9vw, 92px)', lineHeight: 0.9, letterSpacing: '-0.03em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                    COURSES<span style={{ color: ACCENT_DEEP }}>.</span>
                </h2>
                <div style={{ ...monoLabel, color: 'var(--text-muted)', marginTop: '8px' }}>Save what you want to learn · track it through to done</div>
            </div>

            {/* Progress tracker */}
            <ProgressTracker records={allRecords} updateField={fields.updateField} categoryField={fields.categoryField} />

            {/* Recently added (numbered) */}
            {recentRecords.length > 0 && (
                <div>
                    <SectionLabel text="// Recently Added" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                        {recentRecords.map((r, i) => <CourseCard key={r.id} {...cardProps(r, i)} />)}
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
                        {allCategories.map(cat => <CategoryTile key={cat} label={cat} count={categoryMap[cat] ?? 0} onClick={() => onSelectCategory(cat)} />)}
                    </div>
                </div>
            )}
          </div>
        </div>
    );
}

// ── New course form (add a link → AI fills course / org / summary / category) ──
function NewCourseForm({ table, records, onClose }: { table: any; records: readonly any[]; onClose: () => void }) {
    const isNarrow      = useIsNarrow();
    const linkField     = table.getFieldIfExists(LINK_ID);
    const courseField   = table.getFieldIfExists(COURSE_ID);
    const nameField     = table.getFieldIfExists(NAME_ID);
    const orgField      = table.getFieldIfExists(ORG_ID);
    const summaryField  = table.getFieldIfExists(SUMMARY_ID);
    const categoryField = table.getFieldIfExists(CATEGORY_ID);

    const [link, setLink]         = useState('');
    const [newId, setNewId]       = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [error, setError]       = useState('');

    // Once created, the record reactively fills in as AI populates it (useRecords polls).
    const rec      = newId ? records.find(r => r.id === newId) ?? null : null;
    const liveName = rec && nameField    ? rec.getCellValueAsString(nameField)    : '';
    const liveOrg  = rec && orgField     ? rec.getCellValueAsString(orgField)     : '';
    const liveSumm = rec && summaryField ? rec.getCellValueAsString(summaryField) : '';
    const liveCat  = rec ? getCategory(rec, categoryField) : '';

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
            setError(e?.message ?? 'Could not add the course.');
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
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', textTransform: 'uppercase', color: 'var(--text-primary)' }}>New Course</span>
                    <div onClick={onClose} style={{ width: '30px', height: '30px', border: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}><XIcon size={15} weight="bold" /></div>
                </div>

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: isNarrow ? '18px 16px 24px' : '24px' }}>
                    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div>
                            <label style={labelStyle}>Course link *</label>
                            <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://… (paste the course page)" style={{ ...inputStyle, opacity: newId ? 0.6 : 1 }} disabled={!!newId} autoFocus />
                            {!newId && <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>Paste a link — AI fills in the course, organization, summary, icon and category.</div>}
                        </div>

                        {/* Live AI preview after creation */}
                        {rec && (
                            <>
                                <LiveField label="Course" value={liveName || (courseField ? rec.getCellValueAsString(courseField) : '')} />
                                <LiveField label="Organization" value={liveOrg} />
                                <LiveField label="Category" value={liveCat} />
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
                            <div onClick={() => { if (!creating) handleCreate(); }} style={{ padding: '10px 22px', border: '2px solid var(--text-primary)', background: ACCENT, color: ACCENT_TEXT, ...monoLabel, cursor: creating ? 'wait' : 'pointer', userSelect: 'none', opacity: creating ? 0.7 : 1 }}>{creating ? 'Adding…' : 'Add course'}</div>
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

// ── Main ──────────────────────────────────────────────────────────────────────
type StatusFilter = 'all' | Status;

function CoursesApp(): React.ReactElement {
    const isNarrow = useIsNarrow();
    const base    = useBase();
    const table   = base.tables.find(t => t.id === COURSES_TABLE) ?? base.tables[0];
    const records = useRecords(table);

    const nameField     = table?.primaryField ?? table?.getFieldIfExists(NAME_ID);
    const summaryField  = table?.getFieldIfExists(SUMMARY_ID) as Field | undefined;
    const faviconField  = table?.getFieldIfExists(FAVICON_ID);
    const categoryField = table?.getFieldIfExists(CATEGORY_ID);
    const updateField   = table?.getFieldIfExists(UPDATE_ID);
    const proofField    = table?.getFieldIfExists(PROOF_ID);
    const notesField    = table?.getFieldIfExists(NOTES_ID);
    const linkField     = table?.getFieldIfExists(LINK_ID);
    const orgField      = table?.getFieldIfExists(ORG_ID);
    const createdField  = table?.getFieldIfExists(CREATED_ID);

    const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showAll,        setShowAll]        = useState(false); // "view all" toggle
    const [search,         setSearch]         = useState('');
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [showNew,        setShowNew]        = useState(false);

    const resetToHome = () => { setShowAll(false); setStatusFilter('all'); setCategoryFilter('all'); setSearch(''); };

    const categoryMap = useMemo(() => {
        const map: Record<string, number> = {};
        records.forEach(r => { const cat = getCategory(r, categoryField); if (cat) map[cat] = (map[cat] ?? 0) + 1; });
        return map;
    }, [records, categoryField]);
    const allCategories = useMemo(() => Object.keys(categoryMap).sort(), [categoryMap]);

    useEffect(() => { setSelectedRecord(null); }, [search, statusFilter, categoryFilter, showAll]);

    const isSearching = search.trim().length > 0;
    // Any active filter (or the explicit view-all) leaves the home dashboard for a grid.
    const inResults = isSearching || statusFilter !== 'all' || categoryFilter !== 'all' || showAll;

    // Newest first — by Created descending; fall back to reverse table order.
    const recordsByNewest = useMemo(() => {
        const withIdx = records.map((r, i) => ({ r, i, t: getCreatedTime(r, createdField) }));
        withIdx.sort((a, b) => (b.t - a.t) || (b.i - a.i));
        return withIdx.map(x => x.r);
    }, [records, createdField]);
    const recentRecords = useMemo(() => recordsByNewest.slice(0, 3), [recordsByNewest]);

    // Grid contents: newest-first, narrowed by the search box and the two dropdowns.
    const displayedRecords = useMemo(() => {
        let list = recordsByNewest;
        if (isSearching) {
            const q = search.toLowerCase();
            list = list.filter(r => {
                const name    = nameField    ? r.getCellValueAsString(nameField)    : r.name;
                const org     = orgField     ? r.getCellValueAsString(orgField)     : '';
                const summary = summaryField ? r.getCellValueAsString(summaryField) : '';
                return name.toLowerCase().includes(q) || org.toLowerCase().includes(q) || summary.toLowerCase().includes(q);
            });
        }
        if (statusFilter !== 'all') list = list.filter(r => getStatus(r, updateField) === statusFilter);
        if (categoryFilter !== 'all') list = list.filter(r => getCategory(r, categoryField) === categoryFilter);
        return list;
    }, [isSearching, search, recordsByNewest, statusFilter, categoryFilter, categoryField, nameField, orgField, summaryField, updateField]);

    // After a write, SWR revalidates into fresh record instances. Re-resolve the
    // open record by id so the modal reflects the saved values (e.g. a just-uploaded
    // certificate, the new status) instead of the stale reference captured on click.
    const liveSelected = useMemo(
        () => (selectedRecord ? records.find(r => r.id === selectedRecord.id) ?? selectedRecord : null),
        [selectedRecord, records],
    );

    if (!table) return <div style={{ padding: '24px' }}>No table found.</div>;

    const contentTitle = isSearching ? `Results for "${search}"`
        : categoryFilter !== 'all' ? categoryFilter
        : statusFilter !== 'all' ? statusFilter
        : 'All Courses';
    const homeFields = { nameField, summaryField, faviconField, linkField, orgField, categoryField, updateField };

    // Compact brutalist dropdown shared by the two filters.
    const selectStyle: React.CSSProperties = { appearance: 'none', WebkitAppearance: 'none', padding: '7px 28px 7px 12px', borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', color: 'var(--text-primary)', fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', outline: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, var(--text-muted) 50%), linear-gradient(135deg, var(--text-muted) 50%, transparent 50%)', backgroundPosition: 'calc(100% - 15px) 52%, calc(100% - 10px) 52%', backgroundSize: '5px 5px, 5px 5px', backgroundRepeat: 'no-repeat' };

    return (
        <>
            <style>{`
                :root {
                    --page: #eceae4; --bg: #eceae4; --surface: #ffffff; --surface-2: #f3f1ea;
                    --border: rgba(35,38,46,0.20); --ink-line: rgba(35,38,46,0.20); --grid-line: rgba(35,38,46,0.05);
                    --text-primary: #323232; --text-muted: #8b8678; --divider: rgba(35,38,46,0.12); --accent-soft: #fbeecb;
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --page: #15140f; --bg: #15140f; --surface: #211f1a; --surface-2: #2a2720;
                        --border: rgba(255,255,255,0.20); --ink-line: rgba(255,255,255,0.20); --grid-line: rgba(255,255,255,0.05);
                        --text-primary: #efe9dd; --text-muted: #9d978b; --divider: rgba(255,255,255,0.10); --accent-soft: rgba(245,193,61,0.18);
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
                    {inResults && (
                        <div onClick={resetToHome} title="Back" aria-label="Back"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '5px', cursor: 'pointer', flexShrink: 0, border: '1.5px solid var(--ink-line)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'}>
                            <ArrowLeftIcon size={15} weight="bold" />
                        </div>
                    )}
                    <div onClick={() => { resetToHome(); setShowAll(true); }} title="View all" aria-label="View all"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '5px', cursor: 'pointer', flexShrink: 0, border: '1.5px solid var(--ink-line)', background: (showAll && !isSearching && statusFilter === 'all' && categoryFilter === 'all') ? INK : 'var(--surface)', color: (showAll && !isSearching && statusFilter === 'all' && categoryFilter === 'all') ? '#fff' : 'var(--text-primary)' }}>
                        <SquaresFourIcon size={15} weight="bold" />
                    </div>
                    <div onClick={() => setShowNew(true)} title="New course" aria-label="New course"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '5px', cursor: 'pointer', flexShrink: 0, background: ACCENT, color: ACCENT_TEXT, border: `2px solid ${INK}` }}>
                        <PlusIcon size={15} weight="bold" />
                    </div>
                    <HelpButton page="courses" />
                </div>

                {/* Dropdown filters — status (Update) + category. The divider spans the
                    page, but the controls align to the same perimeter as the content. */}
                <div style={{ flexShrink: 0, borderBottom: '1.5px solid var(--ink-line)', background: 'var(--surface)' }}>
                    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '9px clamp(16px, 3vw, 32px)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>Filter</span>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} style={selectStyle} aria-label="Filter by status">
                            <option value="all">All statuses</option>
                            {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={selectStyle} aria-label="Filter by category">
                            <option value="all">All categories</option>
                            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {(statusFilter !== 'all' || categoryFilter !== 'all') && (
                            <div onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '5px', cursor: 'pointer', ...monoLabel, color: 'var(--text-muted)', border: '1.5px solid var(--ink-line)', background: 'var(--surface)' }}>
                                <XIcon size={10} weight="bold" /> Clear
                            </div>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {!inResults ? (
                        <HomeView
                            allRecords={records}
                            recentRecords={recentRecords}
                            allCategories={allCategories}
                            categoryMap={categoryMap}
                            fields={homeFields}
                            table={table}
                            onSelectRecord={r => setSelectedRecord(r)}
                            onSelectCategory={cat => setCategoryFilter(cat)}
                            onViewAll={() => setShowAll(true)}
                        />
                    ) : (
                        <>
                            <div style={{ flexShrink: 0, borderBottom: '1.5px solid var(--ink-line)' }}>
                                <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '14px clamp(16px, 3vw, 32px) 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontFamily: MONO, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{contentTitle}</span>
                                    <span style={{ ...monoLabel, color: ACCENT_DEEP }}>[{String(displayedRecords.length).padStart(2, '0')}]</span>
                                </div>
                            </div>

                            <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px clamp(16px, 3vw, 32px) 32px' }}>
                              <div style={{ width: '100%', maxWidth: '1080px' }}>
                                {displayedRecords.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', ...monoLabel, fontSize: '11px' }}>
                                        {isSearching ? 'No courses match your search.' : 'No courses match these filters.'}
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                                        {displayedRecords.map((r, i) => (
                                            <CourseCard key={r.id} record={r} table={table} index={i}
                                                nameField={nameField} summaryField={summaryField} faviconField={faviconField}
                                                linkField={linkField} orgField={orgField} categoryField={categoryField} updateField={updateField}
                                                onClick={() => setSelectedRecord(r)} />
                                        ))}
                                    </div>
                                )}
                              </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {liveSelected && (
                <CourseModal
                    record={liveSelected} table={table}
                    nameField={nameField} summaryField={summaryField} linkField={linkField} orgField={orgField}
                    categoryField={categoryField} faviconField={faviconField} updateField={updateField}
                    notesField={notesField} proofField={proofField}
                    onClose={() => setSelectedRecord(null)}
                />
            )}
            {showNew && <NewCourseForm table={table} records={records} onClose={() => setShowNew(false)} />}
        </>
    );
}

export default function CoursesPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    return (
        <Shell>
            {mounted ? (
                <AirtableBoundary>
                    <CoursesApp />
                </AirtableBoundary>
            ) : (
                <div style={{ flex: 1, background: 'var(--page)' }} />
            )}
        </Shell>
    );
}
