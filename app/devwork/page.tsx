'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useBase, useRecords, AirtableBoundary } from '@/lib/airtable/hooks';
import { useIsNarrow } from '@/lib/useIsNarrow';
import { modalOverlayStyle, modalCardStyle } from '@/lib/components/modalStyle';
import { HelpButton } from '@/lib/components/InfoModal';
import { Shell } from '@/lib/components/Shell';
import {
    CodeIcon,
    XIcon,
    MagnifyingGlassIcon,
    ArrowUpRightIcon,
    PaperclipIcon,
    FileIcon,
    CalendarIcon,
    PlusIcon,
} from '@phosphor-icons/react';

// ── Field IDs ─────────────────────────────────────────────────────────────────
const TITLE_ID      = 'fldK913cqfvcLYHju'; // singleLineText
const LANGUAGE_ID   = 'fldPB8a2e2tr8eFSz'; // multipleSelects
const LINK_ID       = 'fldvpbqAIq66D48Xl'; // url
const NOTES_ID      = 'fld3Oa8qKUyt5cXf8'; // richText
const ATTACHMENT_ID = 'fldC06BUGgXtZ2g6E'; // multipleAttachments
const CREATED_ID    = 'fld615lytIyK4Llr6'; // createdTime

// ── Accent (amber + ink) ──────────────────────────────────────────────────────
const ACCENT      = '#F5C13D'; // amber primary
const ACCENT_MID  = '#E3A81B'; // deeper amber
const ACCENT_DEEP = '#E3A81B'; // amber for text on light
const ACCENT_TEXT = '#2c2510'; // dark text on amber
const INK         = '#23262e'; // charcoal (catalog line-art borders / dividers)

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(raw: string): string {
    if (!raw) return '';
    try {
        return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return raw; }
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
    return (
        <div style={{
            display: 'inline-block',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#fff', background: INK,
            padding: '5px 11px', borderRadius: '4px', marginBottom: '12px',
        }}>
            // {text}
        </div>
    );
}

// ── Neumorphic button ─────────────────────────────────────────────────────────
function NeuButton({ children, href, onClick, accent }: {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    accent?: boolean;
}) {
    const base: React.CSSProperties = {
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '11px 22px', borderRadius: '14px',
        fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em',
        cursor: 'pointer', textDecoration: 'none', border: 'none',
        transition: 'box-shadow 0.15s, transform 0.1s',
        userSelect: 'none',
    };

    const accentStyle: React.CSSProperties = {
        ...base,
        background: `linear-gradient(145deg, ${ACCENT_MID}, ${ACCENT})`,
        color: ACCENT_TEXT,
        boxShadow: `4px 4px 10px rgba(245,193,61,0.35), -2px -2px 6px rgba(255,255,255,0.3)`,
    };
    const neutralStyle: React.CSSProperties = {
        ...base,
        background: 'var(--neu-bg)',
        color: 'var(--text-muted)',
        boxShadow: 'var(--neu-raised-sm)',
    };

    const style = accent ? accentStyle : neutralStyle;

    const onME = (e: React.MouseEvent) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = accent
            ? `2px 2px 6px rgba(245,193,61,0.4), -1px -1px 4px rgba(255,255,255,0.2)`
            : 'var(--neu-inset-sm)';
        el.style.transform = 'scale(0.98)';
    };
    const onML = (e: React.MouseEvent) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = accent
            ? `4px 4px 10px rgba(245,193,61,0.35), -2px -2px 6px rgba(255,255,255,0.3)`
            : 'var(--neu-raised-sm)';
        el.style.transform = 'scale(1)';
    };

    if (href) {
        return <a href={href} target="_blank" rel="noopener noreferrer" style={style} onMouseEnter={onME} onMouseLeave={onML}>{children}</a>;
    }
    return <button style={style} onMouseEnter={onME} onMouseLeave={onML} onClick={onClick}>{children}</button>;
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DevModal({ record, table, onClose }: { record: any; table: any; onClose: () => void }) {
    const isNarrow     = useIsNarrow();
    const titleField   = table.getFieldIfExists(TITLE_ID);
    const langField    = table.getFieldIfExists(LANGUAGE_ID);
    const linkField    = table.getFieldIfExists(LINK_ID);
    const notesField   = table.getFieldIfExists(NOTES_ID);
    const attachField  = table.getFieldIfExists(ATTACHMENT_ID);
    const createdField = table.getFieldIfExists(CREATED_ID);

    const name  = titleField ? record.getCellValueAsString(titleField) : record.name;
    const originalLangs: string[] = langField
        ? ((record.getCellValue(langField) as { name: string }[] | null) ?? []).map((l: { name: string }) => l.name)
        : [];
    // All available choices for the language multipleSelects field
    const langChoices: string[] = langField
        ? ((langField.config as any)?.options?.choices ?? []).map((c: any) => c.name)
        : [];
    const created     = createdField ? record.getCellValueAsString(createdField) : '';
    const attachments = attachField  ? ((record.getCellValue(attachField) as any[] | null) ?? []) : [];

    // Editable state
    const originalLink  = linkField  ? (record.getCellValue(linkField)  as string | null) ?? '' : '';
    const originalNotes = notesField ? record.getCellValueAsString(notesField) : '';
    const [langsVal, setLangsVal] = useState<string[]>(originalLangs);
    const [linkVal,  setLinkVal]  = useState(originalLink);
    const [notesVal, setNotesVal] = useState(originalNotes);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [saving,   setSaving]   = useState(false);
    const [saved,    setSaved]    = useState(false);
    const [saveError, setSaveError] = useState('');
    // Empty-but-editable fields start collapsed behind an "+ Add" affordance.
    const [editLink,  setEditLink]  = useState(!!originalLink);
    const [editNotes, setEditNotes] = useState(!!originalNotes);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const notesRef     = React.useRef<HTMLTextAreaElement>(null);

    const toggleLang = (lang: string) =>
        setLangsVal(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);

    const langsChanged = langsVal.slice().sort().join(',') !== originalLangs.slice().sort().join(',');
    const isDirty = linkVal !== originalLink || notesVal !== originalNotes || newFiles.length > 0 || langsChanged;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length) setNewFiles(prev => [...prev, ...files]);
        // Reset input so the same file can be re-selected if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeNewFile = (idx: number) => setNewFiles(prev => prev.filter((_, i) => i !== idx));

    const handleSave = async () => {
        setSaving(true);
        setSaveError('');
        const updates: Record<string, any> = {};
        if (langField)  updates[langField.id]  = langsVal.map(name => ({ name }));
        if (linkField)  updates[linkField.id]  = linkVal || null;
        if (notesField) updates[notesField.id] = notesVal || null;
        if (attachField && newFiles.length > 0) {
            const existing = (record.getCellValue(attachField) as any[] | null) ?? [];
            updates[attachField.id] = [
                ...existing,
                ...newFiles.map(file => ({ file })),
            ];
        }
        try {
            await table.updateRecordAsync(record, updates);
            setNewFiles([]);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e: any) {
            setSaveError(e?.message ?? 'Save failed — check field permissions.');
        }
        setSaving(false);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Auto-grow the Notes textarea to fit its content
    useEffect(() => {
        const el = notesRef.current;
        if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
    }, [notesVal]);

    const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

    const fieldInputStyle: React.CSSProperties = {
        width: '100%', padding: '11px 14px', fontSize: '13px',
        color: 'var(--text-primary)', background: 'var(--surface-2)',
        border: '1.5px solid var(--ink-line)', borderRadius: '6px', outline: 'none',
        fontFamily: 'inherit', boxSizing: 'border-box' as const, transition: 'border-color 0.15s',
    };

    // Subtler field label (less "spec-table" than the mono SectionLabel)
    const fieldLabel: React.CSSProperties = {
        fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
        letterSpacing: '0.02em', marginBottom: '7px',
    };
    // Click-to-expand affordance for empty editable fields
    const addBtnStyle: React.CSSProperties = {
        display: 'inline-flex', alignItems: 'center', gap: '7px', width: '100%', boxSizing: 'border-box',
        padding: '11px 14px', borderRadius: '6px', background: 'var(--surface-2)',
        border: '1.5px dashed var(--ink-line)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
    };

    // Brutalist mono tag (languages)
    const tagStyle: React.CSSProperties = {
        fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        padding: '4px 10px', borderRadius: '4px', border: `1.5px solid ${INK}`,
        background: 'var(--accent-soft)', color: ACCENT_DEEP, whiteSpace: 'nowrap',
    };

    return (
        <div onClick={onClose} style={{ ...modalOverlayStyle(isNarrow), background: 'rgba(35,38,46,0.45)', backdropFilter: 'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ ...modalCardStyle(isNarrow), borderRadius: isNarrow ? 0 : '8px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', boxShadow: '12px 12px 0 rgba(35,38,46,0.18)' }}>
                <CornerBrackets inset={10} size={12} />

                {/* Top rule */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1.5px solid var(--ink-line)', flexShrink: 0 }}>
                    <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>// PROJECT · DETAIL</span>
                    <div onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                        <XIcon size={14} weight="bold" />
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ width: '54px', height: '54px', borderRadius: '8px', flexShrink: 0, background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CodeIcon size={26} color={ACCENT_DEEP} weight="bold" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: MONO, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{name || 'Untitled'}</div>
                            {created && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>
                                    <CalendarIcon size={11} weight="bold" /> {formatDate(created)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Languages + Link — two fields per row on desktop, inputs bottom-aligned */}
                    <div style={{ display: 'flex', flexDirection: isNarrow ? 'column' : 'row', gap: '18px', alignItems: 'stretch' }}>
                        {langChoices.length > 0 && (
                            <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                                <div style={fieldLabel}>Languages</div>
                                {langsVal.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                        {langsVal.map(lang => (
                                            <span key={lang} style={{ ...tagStyle, display: 'inline-flex', alignItems: 'center', gap: '6px', paddingRight: '6px' }}>
                                                {lang}
                                                <span onClick={() => toggleLang(lang)}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '15px', height: '15px', borderRadius: '3px', cursor: 'pointer', color: ACCENT_DEEP, background: 'rgba(35,38,46,0.06)', flexShrink: 0 }}>
                                                    <XIcon size={9} weight="bold" />
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <select
                                    value=""
                                    onChange={e => { if (e.target.value) toggleLang(e.target.value); }}
                                    style={{ width: '100%', padding: '10px 36px 10px 14px', fontSize: '13px', color: langsVal.length === langChoices.length ? 'var(--text-muted)' : 'var(--text-primary)', background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', borderRadius: '6px', outline: 'none', fontFamily: 'inherit', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', boxSizing: 'border-box' as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8678' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}>
                                    <option value="" disabled>{langsVal.length === langChoices.length ? 'All languages selected' : '+ Add language…'}</option>
                                    {langChoices.filter(l => !langsVal.includes(l)).map(lang => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={fieldLabel}>Link</div>
                            <div style={{ marginTop: 'auto' }}>
                                {editLink ? (
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input
                                            type="url"
                                            value={linkVal}
                                            onChange={e => setLinkVal(e.target.value)}
                                            placeholder="https://…"
                                            autoFocus={!originalLink}
                                            style={fieldInputStyle}
                                            onFocus={e => (e.currentTarget.style.borderColor = ACCENT)}
                                            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--ink-line)')}
                                        />
                                        {linkVal && (
                                            <a href={linkVal} target="_blank" rel="noopener noreferrer" title="Open link"
                                                style={{ width: '42px', height: '42px', borderRadius: '6px', flexShrink: 0, background: ACCENT, border: `1.5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'background 0.1s' }}
                                                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = ACCENT_DEEP}
                                                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ACCENT}>
                                                <ArrowUpRightIcon size={14} color={ACCENT_TEXT} weight="bold" />
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <div onClick={() => setEditLink(true)} style={addBtnStyle}>
                                        <PlusIcon size={13} weight="bold" /> Add link
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Editable notes (collapsed when empty) */}
                    <div>
                        <div style={fieldLabel}>Notes</div>
                        {editNotes ? (
                            <textarea
                                ref={notesRef}
                                value={notesVal}
                                onChange={e => setNotesVal(e.target.value)}
                                placeholder="Add notes…"
                                rows={1}
                                autoFocus={!originalNotes}
                                style={{ ...fieldInputStyle, resize: 'none' as const, overflow: 'hidden', minHeight: '110px', lineHeight: 1.7 }}
                                onFocus={e => (e.currentTarget.style.borderColor = ACCENT)}
                                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--ink-line)')}
                            />
                        ) : (
                            <div onClick={() => setEditNotes(true)} style={addBtnStyle}>
                                <PlusIcon size={13} weight="bold" /> Add notes
                            </div>
                        )}
                    </div>

                    {/* Attachments — existing + file upload */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ ...fieldLabel, marginBottom: 0 }}>{attachments.length > 0 ? `Attachments (${attachments.length})` : 'Attachments'}</div>
                            {/* Hidden native file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            {/* Styled upload trigger */}
                            <div onClick={() => fileInputRef.current?.click()}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 14px', borderRadius: '6px', background: ACCENT, border: `1.5px solid ${INK}`, cursor: 'pointer', fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: ACCENT_TEXT, transition: 'background 0.1s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = ACCENT_DEEP}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ACCENT}>
                                <PaperclipIcon size={12} weight="bold" /> Add file
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Existing saved attachments */}
                            {attachments.map((att: any) => {
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
                                        <ArrowUpRightIcon size={13} color="var(--text-muted)" />
                                    </a>
                                );
                            })}

                            {/* Newly queued files (pending save) */}
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

                            {/* Empty state */}
                            {attachments.length === 0 && newFiles.length === 0 && (
                                <div style={{ padding: '18px', borderRadius: '6px', background: 'var(--surface-2)', border: '1.5px dashed var(--ink-line)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <PaperclipIcon size={15} color="var(--text-muted)" />
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>No attachments yet — click Add file above</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Save footer */}
                {(isDirty || saved || saveError) && (
                    <div style={{ padding: '16px 28px', borderTop: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
                        {saveError && (
                            <span style={{ flex: 1, fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>⚠ {saveError}</span>
                        )}
                        {saved && <span style={{ fontFamily: MONO, fontSize: '12px', color: ACCENT_DEEP, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Saved ✓</span>}
                        {isDirty && (
                            <>
                                <div onClick={onClose} style={{ padding: '9px 18px', borderRadius: '6px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', color: 'var(--text-muted)', fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', transition: 'background 0.12s' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'}>
                                    Discard
                                </div>
                                <div onClick={!saving ? handleSave : undefined} style={{ padding: '9px 20px', borderRadius: '6px', background: ACCENT, border: `1.5px solid ${INK}`, color: ACCENT_TEXT, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'background 0.12s' }}
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

// ── Project reader ────────────────────────────────────────────────────────────
function readProject(record: any, table: any) {
    const titleField   = table.getFieldIfExists(TITLE_ID);
    const linkField    = table.getFieldIfExists(LINK_ID);
    const langField    = table.getFieldIfExists(LANGUAGE_ID);
    const notesField   = table.getFieldIfExists(NOTES_ID);
    const attachField  = table.getFieldIfExists(ATTACHMENT_ID);
    const createdField = table.getFieldIfExists(CREATED_ID);
    return {
        name: titleField ? record.getCellValueAsString(titleField) : record.name,
        link: linkField  ? (record.getCellValue(linkField) as string | null) ?? '' : '',
        langs: (langField ? ((record.getCellValue(langField) as { name: string }[] | null) ?? []).map((l: { name: string }) => l.name) : []) as string[],
        notes: notesField ? record.getCellValueAsString(notesField) : '',
        // Raw ISO-8601 timestamp (createdTime cells return ISO strings). Using the
        // raw value — not getCellValueAsString's locale-formatted display string —
        // keeps Date.parse reliable so the grid actually sorts newest → oldest.
        created: createdField ? ((record.getCellValue(createdField) as string | null) ?? '') : '',
        attachCount: attachField ? ((record.getCellValue(attachField) as any[] | null) ?? []).length : 0,
    };
}

// ── Metric cell (technical readout) ───────────────────────────────────────────
function Metric({ value, label, borderRight, borderTop }: { value: React.ReactNode; label: string; borderRight?: boolean; borderTop?: boolean }) {
    return (
        <div style={{ padding: '11px 13px', minWidth: 0, borderRight: borderRight ? '1.5px solid var(--ink-line)' : 'none', borderTop: borderTop ? '1.5px solid var(--ink-line)' : 'none' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '3px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{label}</div>
        </div>
    );
}

const monoLabel: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' };

function CatTag({ label }: { label: string }) {
    return <span style={{ ...monoLabel, padding: '3px 9px', border: '1.2px solid var(--ink-line)', borderRadius: '5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>;
}

function Glyph({ name, size = 40 }: { name: string; size?: number }) {
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
    return (
        <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '8px', border: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 800, fontSize: `${Math.round(size * 0.42)}px`, color: 'var(--text-primary)' }}>{initial}</div>
    );
}

// ── Corner registration brackets (technical blueprint marks) ──────────────────
function CornerBrackets({ inset = 9, size = 9, color = 'var(--ink-line)' }: { inset?: number; size?: number; color?: string }) {
    const b = `1.5px solid ${color}`;
    const base: React.CSSProperties = { position: 'absolute', width: `${size}px`, height: `${size}px`, pointerEvents: 'none' };
    return (
        <>
            <div style={{ ...base, top: inset, left: inset, borderTop: b, borderLeft: b }} />
            <div style={{ ...base, top: inset, right: inset, borderTop: b, borderRight: b }} />
            <div style={{ ...base, bottom: inset, left: inset, borderBottom: b, borderLeft: b }} />
            <div style={{ ...base, bottom: inset, right: inset, borderBottom: b, borderRight: b }} />
        </>
    );
}

// ── Project tile (grid card) ──────────────────────────────────────────────────
function ProjectTile({ record, table, index, onClick }: { record: any; table: any; index: number; onClick: () => void }) {
    const { name, link, langs, created, attachCount } = readProject(record, table);
    return (
        <div onClick={onClick}
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.16s, box-shadow 0.16s, transform 0.16s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = ACCENT; el.style.boxShadow = '0 10px 26px rgba(40,35,20,0.10)'; el.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--ink-line)'; el.style.boxShadow = 'none'; el.style.transform = 'translateY(0)'; }}>

            {/* Tag + index */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px 0' }}>
                <CatTag label={langs[0] ?? 'Project'} />
                <span style={{ ...monoLabel, fontSize: '9px', color: 'var(--text-muted)' }}>{String(index + 1).padStart(3, '0')}</span>
            </div>

            {/* Identity */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '26px 16px' }}>
                <Glyph name={name} size={46} />
                <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', textAlign: 'center', lineHeight: 1.2 }}>{name || 'Untitled'}</div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'flex', borderTop: '1.5px solid var(--ink-line)' }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <Metric value={attachCount} label="Files" borderRight />
                    <Metric value={langs.length} label="Tags" />
                    <Metric value={link ? 'Yes' : '—'} label="Link" borderRight borderTop />
                    <Metric value={created ? formatDate(created) : '—'} label="Added" borderTop />
                </div>
                <div style={{ width: '46px', borderLeft: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                    <ArrowUpRightIcon size={16} weight="bold" />
                </div>
            </div>
        </div>
    );
}

// ── Featured project (wide) ───────────────────────────────────────────────────
function FeaturedCard({ record, table, onClick }: { record: any; table: any; onClick: () => void }) {
    const { name, link, langs, notes, created, attachCount } = readProject(record, table);
    const desc = notes ? (notes.length > 220 ? notes.slice(0, 220).trimEnd() + '…' : notes) : '';
    const isNarrow = useIsNarrow();
    return (
        <div onClick={onClick}
            style={{ display: 'flex', flexDirection: isNarrow ? 'column' : 'row', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', marginBottom: '26px', transition: 'border-color 0.16s, box-shadow 0.16s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = ACCENT; el.style.boxShadow = '0 12px 30px rgba(40,35,20,0.10)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--ink-line)'; el.style.boxShadow = 'none'; }}>

            {/* Glyph panel — side divider on desktop, top strip on mobile */}
            <div style={{ width: isNarrow ? '100%' : '150px', flexShrink: 0, padding: isNarrow ? '18px' : 0, borderRight: isNarrow ? 'none' : '1.5px solid var(--ink-line)', borderBottom: isNarrow ? '1.5px solid var(--ink-line)' : 'none', display: 'flex', alignItems: 'center', justifyContent: isNarrow ? 'flex-start' : 'center' }}>
                <Glyph name={name} size={isNarrow ? 48 : 64} />
            </div>

            {/* Body */}
            <div style={{ flex: 1, minWidth: 0, padding: isNarrow ? '18px' : '22px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ ...monoLabel, padding: '3px 9px', borderRadius: '5px', background: ACCENT, color: ACCENT_TEXT }}>New</span>
                    {langs.slice(0, 3).map(l => <CatTag key={l} label={l} />)}
                </div>
                <div style={{ fontSize: isNarrow ? '20px' : '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>{name || 'Untitled'}</div>
                {desc && <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{desc}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: isNarrow ? '14px 24px' : '26px', marginTop: '4px' }}>
                    {[['Files', String(attachCount)], ['Tags', String(langs.length)], ['Link', link ? 'Yes' : '—'], ['Added', created ? formatDate(created) : '—']].map(([label, value]) => (
                        <div key={label} style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{value}</div>
                            <div style={{ ...monoLabel, color: 'var(--text-muted)', marginTop: '3px' }}>{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Arrow panel — desktop only (whole card is tappable on mobile) */}
            {!isNarrow && (
                <div style={{ width: '58px', flexShrink: 0, borderLeft: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                    <ArrowUpRightIcon size={20} weight="bold" />
                </div>
            )}
        </div>
    );
}

// ── New project form (manual fields; Dev Work has no AI) ──────────────────────
function NewProjectForm({ table, onClose }: { table: any; onClose: () => void }) {
    const isNarrow    = useIsNarrow();
    const titleField  = table.getFieldIfExists(TITLE_ID);
    const langField   = table.getFieldIfExists(LANGUAGE_ID);
    const linkField   = table.getFieldIfExists(LINK_ID);
    const notesField  = table.getFieldIfExists(NOTES_ID);
    const attachField = table.getFieldIfExists(ATTACHMENT_ID);
    const langChoices: string[] = ((langField?.config as any)?.options?.choices ?? []).map((c: any) => c.name);

    const [title, setTitle] = useState('');
    const [langs, setLangs] = useState<string[]>([]);
    const [link, setLink]   = useState('');
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleLang = (l: string) => setLangs(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    async function handleCreate() {
        if (!title.trim()) { setError('A title is required.'); return; }
        setSaving(true); setError('');
        const fields: Record<string, any> = {};
        if (titleField)                  fields[titleField.id]  = title.trim();
        if (langField && langs.length)   fields[langField.id]   = langs.map(name => ({ name }));
        if (linkField && link.trim())    fields[linkField.id]   = link.trim();
        if (notesField && notes.trim())  fields[notesField.id]  = notes;
        if (attachField && files.length) fields[attachField.id] = files.map(file => ({ file }));
        try {
            await table.createRecordAsync(fields);
            onClose();
        } catch (e: any) {
            setError(e?.message ?? 'Could not create the project.');
            setSaving(false);
        }
    }

    const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', background: 'var(--surface)', border: '2px solid var(--text-primary)', borderRadius: 0, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { ...monoLabel, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' };

    return (
        <div onClick={onClose} style={{ ...modalOverlayStyle(isNarrow), background: 'rgba(35,38,46,0.45)', backdropFilter: 'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ ...modalCardStyle(isNarrow), borderRadius: isNarrow ? 0 : '8px', background: 'var(--surface)', border: '2px solid var(--text-primary)', boxShadow: '12px 12px 0 rgba(35,38,46,0.18)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 18px', borderBottom: '2px solid var(--text-primary)', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', textTransform: 'uppercase', color: 'var(--text-primary)' }}>New Project</span>
                    <div onClick={onClose} style={{ width: '30px', height: '30px', border: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}><XIcon size={15} weight="bold" /></div>
                </div>

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: isNarrow ? '18px 16px 24px' : '24px' }}>
                    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div>
                            <label style={labelStyle}>Title *</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Project title…" style={inputStyle} autoFocus />
                        </div>
                        {langChoices.length > 0 && (
                            <div>
                                <label style={labelStyle}>Languages</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                                    {langChoices.map(l => {
                                        const active = langs.includes(l);
                                        return <span key={l} onClick={() => toggleLang(l)} style={{ cursor: 'pointer', userSelect: 'none', ...monoLabel, padding: '7px 12px', border: '2px solid var(--text-primary)', background: active ? ACCENT : 'var(--surface)', color: active ? ACCENT_TEXT : 'var(--text-muted)' }}>{l}</span>;
                                    })}
                                </div>
                            </div>
                        )}
                        <div>
                            <label style={labelStyle}>Link</label>
                            <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} placeholder="Write notes…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Attachments</label>
                            <input ref={fileInputRef} type="file" multiple onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) setFiles(prev => [...prev, ...f]); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ display: 'none' }} />
                            <div onClick={() => fileInputRef.current?.click()} style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <PaperclipIcon size={15} weight="bold" /> {files.length ? 'Add more files…' : 'Upload files…'}
                            </div>
                            {files.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                    {files.map((f, i) => (
                                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 10px', border: '2px solid var(--text-primary)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '220px' }}>
                                            <FileIcon size={13} weight="bold" />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                            <span onClick={e => { e.stopPropagation(); setFiles(prev => prev.filter((_, j) => j !== i)); }} style={{ cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><XIcon size={11} weight="bold" /></span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        {error && <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>{error}</div>}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', padding: '14px 18px', borderTop: '2px solid var(--text-primary)', flexShrink: 0 }}>
                    <div onClick={onClose} style={{ padding: '10px 18px', border: '2px solid var(--text-primary)', background: 'var(--surface)', color: 'var(--text-muted)', ...monoLabel, cursor: 'pointer', userSelect: 'none' }}>Cancel</div>
                    <div onClick={() => { if (!saving) handleCreate(); }} style={{ padding: '10px 22px', border: '2px solid var(--text-primary)', background: ACCENT, color: ACCENT_TEXT, ...monoLabel, cursor: saving ? 'wait' : 'pointer', userSelect: 'none', opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating…' : 'Create project'}</div>
                </div>
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function DevWorkGrid(): React.ReactElement {
    const isNarrow = useIsNarrow();
    const base  = useBase();
    const table = base.tables.find(t => t.getFieldIfExists(TITLE_ID) !== null) ?? base.tables[0];
    const records = useRecords(table);

    const [search, setSearch]     = useState('');
    const [filter, setFilter]     = useState<string>('all');
    const [selected, setSelected] = useState<any>(null);
    const [showNew, setShowNew]   = useState(false);

    if (!table) return <div style={{ padding: '24px' }}>No table found.</div>;

    // Languages → counts (filter tabs)
    const langMap: Record<string, number> = {};
    records.forEach(r => readProject(r, table).langs.forEach(l => { langMap[l] = (langMap[l] ?? 0) + 1; }));
    const allLangs = Object.keys(langMap).sort();

    const ts = (r: any) => { const t = Date.parse(readProject(r, table).created); return Number.isNaN(t) ? 0 : t; };
    const byNewest = [...records].sort((a, b) => ts(b) - ts(a));

    // Aggregate readout for the OVERVIEW strip
    const linkedCount = records.filter(r => readProject(r, table).link).length;
    const filesTotal  = records.reduce((n, r) => n + readProject(r, table).attachCount, 0);
    const latestName  = byNewest[0] ? readProject(byNewest[0], table).name : '—';
    const topLang     = allLangs.slice().sort((a, b) => (langMap[b] ?? 0) - (langMap[a] ?? 0))[0] ?? '—';
    const overview: [string, string][] = [
        ['Languages', String(allLangs.length)],
        ['Linked',    `${linkedCount}/${records.length}`],
        ['Files',     String(filesTotal)],
        ['Top stack', topLang],
    ];

    const q = search.trim().toLowerCase();
    const filtered = byNewest.filter(r => {
        const p = readProject(r, table);
        if (filter !== 'all' && !p.langs.includes(filter)) return false;
        if (!q) return true;
        return p.name.toLowerCase().includes(q) || p.langs.join(' ').toLowerCase().includes(q) || p.notes.toLowerCase().includes(q);
    });

    const gridItems = filtered;

    const tabStyle = (active: boolean): React.CSSProperties => ({
        ...monoLabel, padding: '8px 14px', borderRadius: '7px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
        background: active ? INK : 'transparent', color: active ? '#fff' : 'var(--text-muted)',
        border: active ? `1.5px solid ${INK}` : '1.5px solid var(--ink-line)',
    });

    return (
        <>
            <style>{`
                :root {
                    --page:      #eceae4;
                    --bg:        #eceae4;
                    --surface:   #ffffff;
                    --neu-bg:    #ffffff;
                    --surface-2: #f3f1ea;
                    --ink-line:  rgba(35,38,46,0.20);
                    --grid-line: rgba(35,38,46,0.05);
                    --border:    rgba(35,38,46,0.12);
                    --neu-raised:       0 8px 24px rgba(40,35,20,0.07);
                    --neu-raised-sm:    0 2px 8px rgba(40,35,20,0.05);
                    --neu-raised-hover: 0 16px 34px rgba(40,35,20,0.12);
                    --neu-inset:        inset 0 0 0 1px rgba(35,38,46,0.14);
                    --neu-inset-sm:     inset 0 0 0 1px rgba(35,38,46,0.10);
                    --neu-modal:        0 30px 70px rgba(40,35,20,0.30);
                    --accent-soft: #fbeecb;
                    --text-primary: #23262e;
                    --text-muted:   #8b8678;
                    --divider:      rgba(35,38,46,0.12);
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --page:      #15140f;
                        --bg:        #15140f;
                        --surface:   #211f1a;
                        --neu-bg:    #211f1a;
                        --surface-2: #2a2720;
                        --ink-line:  rgba(255,255,255,0.20);
                        --grid-line: rgba(255,255,255,0.05);
                        --border:    rgba(255,255,255,0.10);
                        --neu-raised:       0 8px 24px rgba(0,0,0,0.35);
                        --neu-raised-sm:    0 2px 8px rgba(0,0,0,0.3);
                        --neu-raised-hover: 0 16px 34px rgba(0,0,0,0.5);
                        --neu-inset:        inset 0 0 0 1px rgba(255,255,255,0.12);
                        --neu-inset-sm:     inset 0 0 0 1px rgba(255,255,255,0.08);
                        --neu-modal:        0 30px 70px rgba(0,0,0,0.6);
                        --accent-soft: rgba(245,193,61,0.18);
                        --text-primary: #efe9dd;
                        --text-muted:   #9d978b;
                        --divider:      rgba(255,255,255,0.10);
                    }
                }
                * { box-sizing: border-box; } body { margin: 0; }
                ::placeholder { color: var(--text-muted); opacity: 1; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: var(--divider); border-radius: 6px; }
            `}</style>

            <div style={{ minHeight: '100%', background: 'var(--page)', backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)', backgroundSize: '38px 38px', padding: isNarrow ? '14px 10px 36px' : '28px 24px 40px', fontFamily: 'var(--font-body), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                <div style={{ position: 'relative', maxWidth: '1000px', margin: '0 auto', border: '1.5px solid var(--ink-line)', borderRadius: isNarrow ? '0' : '20px', padding: isNarrow ? '16px 14px 24px' : 'clamp(20px, 3.5vw, 38px)' }}>

                    {/* Registration brackets */}
                    <CornerBrackets inset={11} size={12} />

                    {/* Topbar — label + controls (search / new / help, far right) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '22px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CodeIcon size={13} weight="bold" color={ACCENT_TEXT} />
                            </div>
                            <span style={{ ...monoLabel, fontSize: '11px', color: 'var(--text-primary)' }}>DEV&nbsp;WORK&nbsp;/&nbsp;LABS</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 14px', borderRadius: '8px', border: '1.5px solid var(--ink-line)', background: 'var(--surface)', width: isNarrow ? '150px' : '220px' }}>
                                <MagnifyingGlassIcon size={15} color="var(--text-muted)" weight="bold" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
                                    style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                                {search && <XIcon size={12} weight="bold" color="var(--text-muted)" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setSearch('')} />}
                            </div>
                            <div onClick={() => setShowNew(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', cursor: 'pointer', background: ACCENT, color: ACCENT_TEXT, border: `2px solid ${INK}`, ...monoLabel, fontSize: '11px', userSelect: 'none' }}>
                                <PlusIcon size={14} weight="bold" /> New
                            </div>
                            <HelpButton page="devwork" />
                        </div>
                    </div>

                    {/* Headline */}
                    <h1 style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 800, fontSize: 'clamp(40px, 10vw, 104px)', lineHeight: 0.92, letterSpacing: '-0.02em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                        DEV<span style={{ color: ACCENT_DEEP }}>_</span>WORK
                    </h1>

                    {/* Sub row */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', margin: '18px 0 24px', borderBottom: '1.5px solid var(--ink-line)', paddingBottom: '22px' }}>
                        <span style={{ ...monoLabel, fontSize: '11px', color: 'var(--text-muted)' }}>■ Meet the projects</span>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ ...monoLabel, color: 'var(--text-muted)' }}>Projects</div>
                            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 800, fontSize: '26px', color: 'var(--text-primary)', lineHeight: 1 }}>{String(records.length).padStart(2, '0')}</div>
                        </div>
                    </div>

                    {/* Overview — aggregate readout (spec table) */}
                    <div style={{ border: '1.5px solid var(--ink-line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '26px', background: 'var(--surface)' }}>
                        <div style={{ ...monoLabel, fontSize: '9px', padding: '8px 14px', color: '#fff', background: INK }}>// OVERVIEW</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                            {overview.map(([label, value], i) => (
                                <div key={label} style={{ flex: '1 1 120px', minWidth: 0, padding: '13px 16px', borderLeft: i === 0 ? 'none' : '1.5px solid var(--ink-line)' }}>
                                    <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                                    <div style={{ ...monoLabel, color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                        <span onClick={() => setFilter('all')} style={tabStyle(filter === 'all')}>All</span>
                        {allLangs.map(l => (
                            <span key={l} onClick={() => setFilter(l)} style={tabStyle(filter === l)}>{l}</span>
                        ))}
                    </div>

                    {/* Grid */}
                    {gridItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>No projects found.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                            {gridItems.map((r, i) => (
                                <ProjectTile key={r.id} record={r} table={table} index={i} onClick={() => setSelected(r)} />
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '34px', paddingTop: '22px', borderTop: '1.5px solid var(--ink-line)' }}>
                        <span style={{ ...monoLabel, color: 'var(--text-muted)' }}>// end of portfolio</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 16px', borderRadius: '9999px', background: ACCENT, color: ACCENT_TEXT, border: `1.5px solid ${INK}`, ...monoLabel, fontSize: '10px' }}>
                            dev_work · {records.length} files
                        </span>
                    </div>
                </div>
            </div>

            {selected && (
                <DevModal record={selected} table={table} onClose={() => setSelected(null)} />
            )}
            {showNew && (
                <NewProjectForm table={table} onClose={() => setShowNew(false)} />
            )}
        </>
    );
}

export default function DevWorkPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    return (
        <Shell>
            {mounted ? (
                <AirtableBoundary>
                    <DevWorkGrid />
                </AirtableBoundary>
            ) : (
                <div style={{ flex: 1, background: 'var(--page)' }} />
            )}
        </Shell>
    );
}