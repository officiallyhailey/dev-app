'use client';

import React, {useCallback, useEffect, useState, useMemo, useRef} from 'react';
import {useBase, useRecords, AirtableBoundary} from '@/lib/airtable/hooks';
import {Shell} from '@/lib/components/Shell';
import {Warning, X, CaretDown, CaretUp} from '@phosphor-icons/react';
// These were SDK model types; the ported UI only uses them as loose annotations.
type Base = any;
type Field = any;
type Table = any;
type AirtableRecord = any;
import MapBoxMap, {Marker, NavigationControl} from 'react-map-gl/mapbox';
import type {ViewStateChangeEvent, MapRef} from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ── Accent (amber) ────────────────────────────────────────────────────────────
const ACCENT      = '#F5C13D'; // amber primary (fills)
const ACCENT_MID  = '#E3A81B'; // deeper amber (gradients / hover)
const ACCENT_DEEP = '#E3A81B'; // amber for text/icons on light surfaces
const ACCENT_TEXT = '#2c2510'; // dark text on amber
const INK         = '#23262e'; // charcoal (line-art ink / titles)
const TEAL        = INK;       // secondary accent is charcoal to match the devwork theme

// ── Markdown renderer ─────────────────────────────────────────────────────────
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
        else if (m[5]) parts.push(<code key={m.index} style={{background: 'var(--neu-inset-color)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace'}}>{m[5]}</code>);
        else if (m[6]) parts.push(<a key={m.index} href={m[7]} target="_blank" rel="noopener noreferrer" style={{color: TEAL, textDecoration: 'underline'}}>{m[6]}</a>);
        last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last).replace(/\*+/g, ''));
    return parts;
}

function MarkdownText({text}: {text: string}): React.ReactElement {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i] ?? '';
        const hMatch = line.match(/^(#{1,3})\s+(.*)/);
        if (hMatch) {
            const sizes = ['16px', '15px', '14px'];
            elements.push(<div key={i} style={{margin: '12px 0 4px', fontSize: sizes[(hMatch[1]?.length ?? 1) - 1], fontWeight: 700, color: 'var(--text-primary)'}}>{renderInline(hMatch[2] ?? '')}</div>);
        } else if (/^[-*]\s+/.test(line)) {
            const items: React.ReactNode[] = [];
            while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? '')) {
                items.push(<li key={i} style={{marginBottom: '3px'}}>{renderInline((lines[i] ?? '').replace(/^[-*]\s+/, ''))}</li>);
                i++;
            }
            elements.push(<ul key={`ul-${i}`} style={{margin: '6px 0', paddingLeft: '18px', listStyleType: 'disc'}}>{items}</ul>);
            continue;
        } else if (/^\d+\.\s+/.test(line)) {
            const items: React.ReactNode[] = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
                items.push(<li key={i} style={{marginBottom: '3px'}}>{renderInline((lines[i] ?? '').replace(/^\d+\.\s+/, ''))}</li>);
                i++;
            }
            elements.push(<ol key={`ol-${i}`} style={{margin: '6px 0', paddingLeft: '18px'}}>{items}</ol>);
            continue;
        } else if (line.trim() === '' || /^-{3,}$/.test(line.trim())) {
            elements.push(<div key={i} style={{height: '8px'}} />);
        } else {
            const rendered = renderInline(line);
            if (rendered.some(r => r !== '')) elements.push(<p key={i} style={{margin: '0 0 6px'}}>{rendered}</p>);
        }
        i++;
    }
    return <div style={{fontSize: '13px', lineHeight: 1.7, color: 'var(--text-primary)'}}>{elements}</div>;
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({text}: {text: string}) {
    return <div style={{fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: '8px'}}>{text}</div>;
}

// ── Neumorphic editable input ─────────────────────────────────────────────────
function NeuInput({label, value, onChange, multiline = false, type = 'text'}: {
    label: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string;
}) {
    const insetStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', fontSize: '13px',
        color: 'var(--text-primary)', background: 'var(--neu-bg)',
        border: 'none', borderRadius: '12px', outline: 'none',
        fontFamily: 'inherit', resize: multiline ? 'vertical' as const : 'none' as const,
        boxShadow: 'var(--neu-inset)', boxSizing: 'border-box' as const,
        transition: 'box-shadow 0.15s',
    };
    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
            <SectionLabel text={label} />
            {multiline ? (
                <textarea value={value} onChange={e => onChange(e.target.value)} rows={4} style={insetStyle}
                    onFocus={e => (e.currentTarget.style.boxShadow = `inset 3px 3px 8px rgba(245,193,61,0.15), inset -3px -3px 8px var(--neu-light)`)}
                    onBlur={e => (e.currentTarget.style.boxShadow = 'var(--neu-inset)')} />
            ) : (
                <input type={type} value={value} onChange={e => onChange(e.target.value)} style={insetStyle}
                    onFocus={e => (e.currentTarget.style.boxShadow = `inset 3px 3px 8px rgba(245,193,61,0.15), inset -3px -3px 8px var(--neu-light)`)}
                    onBlur={e => (e.currentTarget.style.boxShadow = 'var(--neu-inset)')} />
            )}
        </div>
    );
}

// ── Neumorphic select ─────────────────────────────────────────────────────────
function NeuSelect({label, field, value, onChange}: {
    label: string; field: Field; value: string; onChange: (v: string) => void;
}) {
    const choices: Array<{id: string; name: string}> = (field.config as any)?.options?.choices ?? [];
    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
            <SectionLabel text={label} />
            <select value={value} onChange={e => onChange(e.target.value)}
                style={{
                    width: '100%', padding: '10px 36px 10px 14px', fontSize: '13px',
                    color: 'var(--text-primary)', background: 'var(--neu-bg)',
                    border: 'none', borderRadius: '12px', outline: 'none',
                    fontFamily: 'inherit', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
                    boxShadow: 'var(--neu-inset)', boxSizing: 'border-box' as const,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e8f98' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                }}>
                <option value="">— None —</option>
                {choices.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
        </div>
    );
}

// ── Job Modal ─────────────────────────────────────────────────────────────────
function JobModal({record, table, onClose}: {record: AirtableRecord; table: Table; onClose: () => void}) {
    const displayRoleField  = table.getFieldIfExists('fldDbwjKDzYQNVUY9');
    const roleField         = table.getFieldIfExists('fldco5O5czDVfIKy3');
    const organizationField = table.getFieldIfExists('fldC0zsxhYswqv8xe');
    const mapLocationField  = table.getFieldIfExists('fldLHsZ51pavW8Ar0');
    const summaryField      = table.getFieldIfExists('fldH7XHtz2GmndojY');
    const updateField       = table.getFieldIfExists('fldcT9S9Ae0vQLUOK');
    const contactNameField  = table.getFieldIfExists('fldEczKmPXJKwSLVB');
    const contactEmailField = table.getFieldIfExists('fldUWMWaE12bf79iD');
    const notesField        = table.getFieldIfExists('fldu1lRRvgrffVBHF');
    const linkField         = table.getFieldIfExists('fld4Bb1qoErrpVdXq');

    const title    = displayRoleField ? record.getCellValueAsString(displayRoleField) : roleField ? record.getCellValueAsString(roleField) : record.name;
    const org      = organizationField ? record.getCellValueAsString(organizationField) : '';
    const location = mapLocationField  ? record.getCellValueAsString(mapLocationField)  : '';
    const summary  = summaryField      ? record.getCellValueAsString(summaryField)      : '';
    const linkVal  = linkField         ? (record.getCellValue(linkField) as string | null) ?? '' : '';

    const currentUpdateObj = updateField ? record.getCellValue(updateField) as {name: string} | null : null;
    const [updateVal,    setUpdateVal]    = useState(currentUpdateObj?.name ?? '');
    const [contactName,  setContactName]  = useState(contactNameField  ? record.getCellValueAsString(contactNameField)  : '');
    const [contactEmail, setContactEmail] = useState(contactEmailField ? record.getCellValueAsString(contactEmailField) : '');
    const [notes,        setNotes]        = useState(notesField        ? record.getCellValueAsString(notesField)        : '');
    const [saving,       setSaving]       = useState(false);
    const [saved,        setSaved]        = useState(false);

    const isDirty =
        (updateField       ? updateVal    !== (currentUpdateObj?.name ?? '')              : false) ||
        (contactNameField  ? contactName  !== record.getCellValueAsString(contactNameField!)  : false) ||
        (contactEmailField ? contactEmail !== record.getCellValueAsString(contactEmailField!) : false) ||
        (notesField        ? notes        !== record.getCellValueAsString(notesField!)        : false);

    const handleSave = async () => {
        setSaving(true);
        const updates: Record<string, any> = {};
        if (updateField)       updates[updateField.id]       = updateVal ? {name: updateVal} : null;
        if (contactNameField)  updates[contactNameField.id]  = contactName;
        if (contactEmailField) updates[contactEmailField.id] = contactEmail;
        if (notesField)        updates[notesField.id]        = notes;
        try {
            await table.updateRecordAsync(record, updates);
            setSaved(true); setTimeout(() => setSaved(false), 2000);
        } catch (e) { console.error('Save failed', e); }
        setSaving(false);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Status color mapping
    const statusColor: Record<string, string> = {
        'Saved': 'var(--text-muted)',
        'Applied': '#2563eb',
        'Contacted for Interview': '#d97706',
    };
    const currentColor = statusColor[updateVal] ?? ACCENT_DEEP;

    return (
        <div onClick={onClose} style={{position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(210,218,230,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'}}>
            <div onClick={e => e.stopPropagation()} style={{width: 'min(860px, 90vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', borderRadius: '28px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-modal)', overflow: 'hidden'}}>

                {/* Header */}
                <div style={{padding: '26px 28px 22px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'flex-start', gap: '16px', flexShrink: 0}}>
                    {/* Briefcase icon */}
                    <div style={{width: '50px', height: '50px', borderRadius: '16px', flexShrink: 0, background: 'var(--neu-bg)', boxShadow: 'var(--neu-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={TEAL} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                        </svg>
                    </div>

                    <div style={{flex: 1, minWidth: 0}}>
                        <div style={{fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25, letterSpacing: '-0.02em'}}>{title || 'Untitled'}</div>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px', alignItems: 'center'}}>
                            {org      && <span style={{fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500}}>{org}</span>}
                            {location && <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500}}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                {location}
                            </span>}
                            {updateVal && (
                                <span style={{padding: '3px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, color: currentColor, background: 'var(--neu-bg)', boxShadow: 'var(--neu-inset-sm)', letterSpacing: '0.02em'}}>
                                    {updateVal}
                                </span>
                            )}
                        </div>
                    </div>

                    <div onClick={onClose} style={{width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, background: 'var(--neu-bg)', boxShadow: 'var(--neu-raised-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'box-shadow 0.12s'}}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--neu-inset-sm)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--neu-raised-sm)'}>
                        <X size={15} weight="bold" />
                    </div>
                </div>

                {/* Body */}
                <div style={{padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px'}}>

                    {/* View link */}
                    {linkVal ? (
                        <a href={linkVal} target="_blank" rel="noopener noreferrer"
                            style={{display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 22px', borderRadius: '14px', alignSelf: 'flex-start', background: `linear-gradient(145deg, ${ACCENT_MID}, ${ACCENT})`, color: ACCENT_TEXT, fontSize: '13px', fontWeight: 600, textDecoration: 'none', letterSpacing: '0.02em', boxShadow: `4px 4px 10px rgba(245,193,61,0.35), -2px -2px 6px rgba(255,255,255,0.3)`, transition: 'box-shadow 0.15s, transform 0.1s'}}
                            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = `2px 2px 6px rgba(245,193,61,0.4)`; (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(0.98)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = `4px 4px 10px rgba(245,193,61,0.35), -2px -2px 6px rgba(255,255,255,0.3)`; (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'; }}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2c2510" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            View Link
                        </a>
                    ) : (
                        <span style={{display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 22px', borderRadius: '14px', alignSelf: 'flex-start', background: 'var(--neu-bg)', boxShadow: 'var(--neu-raised-sm)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600}}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            No Link Available
                        </span>
                    )}

                    {/* Update status */}
                    {updateField && (
                        <NeuSelect label="Update Status" field={updateField} value={updateVal} onChange={setUpdateVal} />
                    )}

                    {/* Summary */}
                    {summary && (
                        <div>
                            <SectionLabel text="Summary" />
                            <div style={{borderRadius: '16px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-inset)', padding: '18px'}}>
                                <MarkdownText text={summary} />
                            </div>
                        </div>
                    )}

                    {/* Editable fields */}
                    {contactNameField  && <NeuInput label="Contact Name"  value={contactName}  onChange={setContactName} />}
                    {contactEmailField && <NeuInput label="Contact Email" value={contactEmail} onChange={setContactEmail} type="email" />}
                    {notesField        && <NeuInput label="Notes"         value={notes}        onChange={setNotes} multiline />}
                </div>

                {/* Save footer */}
                {(isDirty || saved) && (
                    <div style={{padding: '16px 28px', borderTop: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', flexShrink: 0}}>
                        {saved && <span style={{fontSize: '13px', color: '#16a34a', fontWeight: 600}}>Saved ✓</span>}
                        {isDirty && (
                            <>
                                <div onClick={onClose} style={{padding: '9px 18px', borderRadius: '12px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-raised-sm)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'box-shadow 0.12s'}}
                                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--neu-inset-sm)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--neu-raised-sm)'}>
                                    Discard
                                </div>
                                <div onClick={handleSave} style={{padding: '9px 20px', borderRadius: '12px', background: `linear-gradient(145deg, ${ACCENT_MID}, ${ACCENT})`, color: ACCENT_TEXT, fontSize: '13px', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: `4px 4px 10px rgba(245,193,61,0.35), -2px -2px 6px rgba(255,255,255,0.3)`, transition: 'opacity 0.15s, box-shadow 0.15s, transform 0.1s'}}
                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `2px 2px 6px rgba(245,193,61,0.4)`; (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.98)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `4px 4px 10px rgba(245,193,61,0.35), -2px -2px 6px rgba(255,255,255,0.3)`; (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}>
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

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({record, table, onClick, isActive, isPinned}: {record: AirtableRecord; table: Table; onClick: () => void; isActive?: boolean; isPinned?: boolean}) {
    const displayRoleField  = table.getFieldIfExists('fldDbwjKDzYQNVUY9');
    const roleField         = table.getFieldIfExists('fldco5O5czDVfIKy3');
    const organizationField = table.getFieldIfExists('fldC0zsxhYswqv8xe');
    const mapLocationField  = table.getFieldIfExists('fldLHsZ51pavW8Ar0');
    const updateField       = table.getFieldIfExists('fldcT9S9Ae0vQLUOK');

    const title    = displayRoleField ? record.getCellValueAsString(displayRoleField) : roleField ? record.getCellValueAsString(roleField) : record.name;
    const org      = organizationField ? record.getCellValueAsString(organizationField) : '';
    const location = mapLocationField  ? record.getCellValueAsString(mapLocationField)  : '';
    const updateObj = updateField ? record.getCellValue(updateField) as {name: string} | null : null;
    const updateName = updateObj?.name ?? '';

    const statusColor: Record<string, string> = {'Saved': 'var(--text-muted)', 'Applied': '#2563eb', 'Contacted for Interview': '#d97706'};
    const badgeColor = statusColor[updateName] ?? 'var(--text-muted)';

    return (
        <div onClick={onClick}
            style={{borderRadius: '14px', background: 'var(--neu-bg)', border: isActive ? `1.5px solid ${ACCENT}` : '1.5px solid var(--ink-line)', boxShadow: isPinned ? 'var(--neu-raised)' : 'var(--neu-raised-sm)', padding: isPinned ? '22px 20px' : '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', transition: 'box-shadow 0.18s ease, border-color 0.18s, padding 0.18s ease'}}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--neu-raised)'; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.boxShadow = isPinned ? 'var(--neu-raised)' : 'var(--neu-raised-sm)'; }}
        >
            <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px'}}>
                <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{title || 'Untitled'}</div>
                    {org && <div style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500}}>{org}</div>}
                </div>
                {updateName && (
                    <span style={{padding: '2px 10px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, color: badgeColor, background: 'var(--neu-bg)', boxShadow: 'var(--neu-inset-sm)', whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.02em'}}>
                        {updateName}
                    </span>
                )}
            </div>
            {location && (
                <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500}}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    {location}
                </span>
            )}
        </div>
    );
}

// ── Jobs panel (right side) ───────────────────────────────────────────────────
function JobsPanel({records, table, pinnedRecordId, onClearPin}: {
    records: readonly AirtableRecord[]; table: Table;
    pinnedRecordId: string | null; onClearPin: () => void;
}) {
    const [search, setSearch]                 = useState('');
    const [selectedRecord, setSelectedRecord] = useState<AirtableRecord | null>(null);
    const listTopRef = useRef<HTMLDivElement | null>(null);

    // Scroll to top of list whenever a pin is selected
    useEffect(() => {
        if (pinnedRecordId) listTopRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [pinnedRecordId]);

    const statusField = table.getFieldIfExists('fld5iKwdA7deQWEZy');
    const visibleRecords = records.filter(r => {
        if (!statusField) return true;
        const s = r.getCellValue(statusField) as {name: string} | null;
        return s?.name?.toLowerCase() !== 'hidden';
    });

    const updateField = table.getFieldIfExists('fldcT9S9Ae0vQLUOK');
    const UPDATE_STATUSES = [
        {name: 'Saved',                   color: '#6b7280'},
        {name: 'Applied',                 color: '#2563eb'},
        {name: 'Contacted for Interview', color: '#d97706'},
    ];
    const updateCounts = UPDATE_STATUSES.map(s => ({
        ...s,
        count: visibleRecords.filter(r => {
            if (!updateField) return false;
            const v = r.getCellValue(updateField) as {name: string} | null;
            return v?.name === s.name;
        }).length,
    }));

    const displayRoleField  = table.getFieldIfExists('fldDbwjKDzYQNVUY9');
    const roleField         = table.getFieldIfExists('fldco5O5czDVfIKy3');
    const orgField          = table.getFieldIfExists('fldC0zsxhYswqv8xe');

    // When a pin is active, show only that record (ignoring search)
    // Otherwise apply normal search filter
    const filtered = pinnedRecordId
        ? visibleRecords.filter(r => r.id === pinnedRecordId)
        : visibleRecords.filter(r => {
            if (!search) return true;
            const title = displayRoleField ? r.getCellValueAsString(displayRoleField) : roleField ? r.getCellValueAsString(roleField) : r.name;
            const org   = orgField ? r.getCellValueAsString(orgField) : '';
            return title.toLowerCase().includes(search.toLowerCase()) || org.toLowerCase().includes(search.toLowerCase());
        });

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'}}>

            {/* Panel header */}
            <div style={{padding: '20px 20px 0', flexShrink: 0}}>
                <div style={{marginBottom: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px'}}>
                    <div>
                        <h2 style={{margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', textTransform: 'uppercase'}}>JOB<span style={{color: ACCENT_DEEP}}>_</span>BOARD</h2>
                        <p style={{margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500}}>{visibleRecords.length} opportunities</p>
                    </div>
                    {/* Active pin indicator */}
                    {pinnedRecordId && (
                        <div style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px 6px 10px', borderRadius: '99px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-inset-sm)', flexShrink: 0, marginTop: '2px'}}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill={ACCENT}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            <span style={{fontSize: '11px', fontWeight: 700, color: ACCENT_DEEP}}>Pin selected</span>
                            <div onClick={onClearPin} style={{width: '16px', height: '16px', borderRadius: '4px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-raised-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '2px'}}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--neu-inset-sm)'}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--neu-raised-sm)'}>
                                <X size={9} weight="bold" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Search — hidden while a pin is active */}
                {!pinnedRecordId && (
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-inset)', marginBottom: '16px'}}>
                        <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles…"
                            style={{flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'inherit'}} />
                        {search && <div onClick={() => setSearch('')} style={{width: '20px', height: '20px', borderRadius: '6px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-raised-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)'}}>
                            <X size={10} weight="bold" />
                        </div>}
                    </div>
                )}

                {/* Status metrics — hidden while a pin is active */}
                {!pinnedRecordId && (
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px'}}>
                        {updateCounts.map(s => (
                            <div key={s.name} style={{borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-raised-sm)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                <span style={{fontSize: '22px', fontWeight: 800, color: s.color, lineHeight: 1}}>{s.count}</span>
                                <span style={{fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.3, letterSpacing: '0.02em'}}>{s.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* "Show all" button while pin is active */}
                {pinnedRecordId && (
                    <div onClick={onClearPin} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-raised-sm)', marginBottom: '16px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, transition: 'box-shadow 0.12s'}}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--neu-inset)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--neu-raised-sm)'}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><polyline points="9 6 3 12 9 18"/></svg>
                        Show all {visibleRecords.length} opportunities
                    </div>
                )}
            </div>

            {/* Scrollable cards */}
            <div style={{flex: 1, overflowY: 'auto', padding: '0 20px 20px'}}>
                <div ref={listTopRef} />
                {filtered.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '14px'}}>No opportunities match your search.</div>
                ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                        {filtered.map(r => (
                            <JobCard key={r.id} record={r} table={table} isActive={selectedRecord?.id === r.id} isPinned={pinnedRecordId === r.id} onClick={() => setSelectedRecord(r)} />
                        ))}
                    </div>
                )}
            </div>

            {selectedRecord && (
                <JobModal record={selectedRecord} table={table} onClose={() => setSelectedRecord(null)} />
            )}
        </div>
    );
}

// ── Map types & state hooks ───────────────────────────────────────────────────
interface MapViewState { longitude: number; latitude: number; zoom: number; }

function MapExtensionApp() {
    const base    = useBase();
    // Job Opportunities table (pinned; the standalone base has many tables).
    const table   = base.tables.find((t: Table) => t.id === 'tblwmU2i7qOf6vioa') ?? base.tables[0];
    const records = useRecords(table);

    const configurationErrorState: { error?: { message?: string } } | null = null;
    const storageKey = useMemo(() => `mapView:${table?.id}`, [table?.id]);
    const {viewState, setViewState, savedViewRef, initialCameraAppliedRef} = useMapViewState(storageKey, {longitude: -74.5, latitude: 40, zoom: 9});

    const [hoveredLocationId,  setHoveredLocationId]  = useState<string | null>(null);
    const [pinnedRecordId,     setPinnedRecordId]     = useState<string | null>(null);
    const mapRef = useRef<MapRef | null>(null);
    const [isMapReady,         setIsMapReady]         = useState(false);
    const [isWarningDismissed, setIsWarningDismissed] = useState(false);
    const [isPromptExpanded,   setIsPromptExpanded]   = useState(false);
    // State (not just the ref) so the loading overlay reliably clears on re-render.
    const [cameraReady,        setCameraReady]        = useState(false);
    // Stack map-over-list on phones instead of the desktop side-by-side split.
    const [isNarrow,           setIsNarrow]           = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const update = () => setIsNarrow(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    // Mapbox token comes from an env var (was an Airtable custom property / secret).
    const mapboxApiKey = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    // Were configurable custom properties; hardcoded for the standalone app.
    const labelField       = table?.getFieldIfExists('fld8SBoxLd5uCfBaj') as Field | undefined; // Name
    const addressField     = table?.getFieldIfExists('fldLHsZ51pavW8Ar0') as Field | undefined; // Map Location
    const zoomToPinOnClick = true;
    const autoCenterOnLoad = true;
    const isConfigured     = Boolean(mapboxApiKey && labelField && addressField);

    const recordsHash = useMemo(() => {
        if (!isConfigured) return '';
        return records.map(r => [r.id, r.getCellValueAsString(labelField!), r.getCellValueAsString(addressField!)].join('::')).join('||');
    }, [records, labelField, addressField, isConfigured]);

    const previousHashRef  = useRef<string>('');
    const stableDataRef    = useRef<LocationData[]>([]);

    if (recordsHash !== previousHashRef.current) {
        previousHashRef.current = recordsHash;
        stableDataRef.current   = isConfigured && records
            ? records.map(r => ({id: r.id, name: r.getCellValueAsString(labelField!), address: r.getCellValueAsString(addressField!), lat: null, lng: null, geoCache: null, record: r}))
            : [];
    }

    const geocodingInputs = useMemo(() => stableDataRef.current.map(r => ({id: r.id, name: r.name, address: r.address, record: r.record})), [stableDataRef.current]);
    const {locations, geocodingStatus} = useGeocoding({records: geocodingInputs, apiKey: mapboxApiKey, enabled: isConfigured});
    const hasGeocodingWork = geocodingInputs.length > 0;

    useEffect(() => {
        if (!isConfigured || !isMapReady || initialCameraAppliedRef.current) return;
        if (autoCenterOnLoad && hasGeocodingWork && geocodingStatus === GeocodingStatus.Idle) return;
        if (autoCenterOnLoad && locations.length > 0) {
            if (locations.length === 1) {
                setViewState({latitude: locations[0].lat!, longitude: locations[0].lng!, zoom: 12});
            } else {
                const lats = locations.map(l => l.lat!);
                const lngs = locations.map(l => l.lng!);
                const bounds = new mapboxgl.LngLatBounds([Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]);
                const mapInstance = mapRef.current?.getMap?.();
                if (mapInstance) {
                    const camera = mapInstance.cameraForBounds(bounds, {padding: 40});
                    if (camera?.center) {
                        const center = mapboxgl.LngLat.convert(camera.center as mapboxgl.LngLatLike);
                        setViewState({latitude: center.lat, longitude: center.lng, zoom: Math.min(Math.max(typeof camera.zoom === 'number' ? camera.zoom : 8, 1), 16)});
                    }
                } else {
                    setViewState({latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2, zoom: 8});
                }
            }
            initialCameraAppliedRef.current = true; setCameraReady(true);
            return;
        }
        if (autoCenterOnLoad && hasGeocodingWork && geocodingStatus === GeocodingStatus.Running) return;
        if (savedViewRef.current) setViewState(savedViewRef.current);
        initialCameraAppliedRef.current = true; setCameraReady(true);
    }, [isConfigured, isMapReady, autoCenterOnLoad, geocodingStatus, locations, savedViewRef, initialCameraAppliedRef, setViewState, hasGeocodingWork]);

    const handleMarkerClick = (location: LocationData) => {
        // Toggle pin: clicking the already-pinned marker clears it
        if (pinnedRecordId === location.id) {
            setPinnedRecordId(null);
        } else {
            setPinnedRecordId(location.id);
        }
        if (zoomToPinOnClick) {
            const mapInstance = mapRef.current?.getMap?.();
            if (mapInstance) {
                mapInstance.flyTo({center: [location.lng!, location.lat!], zoom: 14});
            } else {
                setViewState({latitude: location.lat!, longitude: location.lng!, zoom: 14});
            }
        }
    };

    const suggestedPrompt: string | undefined = undefined;
    const shouldShowWarning   = false; // SDK token-warning flow not used in standalone app
    const shouldWaitForGeocoding = isConfigured && hasGeocodingWork && geocodingStatus !== GeocodingStatus.Completed;
    const hideMapUntilReady   = !cameraReady || shouldWaitForGeocoding;

    // (SDK token-fetch error/loading states removed — token now comes from env;
    //  the !isConfigured state below covers a missing token.)
    void suggestedPrompt;

    if (!isConfigured) {
        return (
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh', background: 'var(--bg)', padding: '24px'}}>
                <div style={{maxWidth: '480px', textAlign: 'center', background: 'var(--neu-bg)', borderRadius: '24px', padding: '36px', boxShadow: 'var(--neu-raised)'}}>
                    <div style={{width: '52px', height: '52px', borderRadius: '16px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'}}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <h2 style={{margin: '0 0 10px', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)'}}>Map not configured</h2>
                    <p style={{margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6}}>Add a <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> environment variable to enable the map view. The job list still works without it.</p>
                </div>
            </div>
        );
    }

    void configurationErrorState; // (SDK configuration-error state not used in standalone app)

    return (
        <>
            <style>{`
                :root {
                    --page:             #eceae4;
                    --bg:               #eceae4;
                    --neu-bg:           #ffffff;
                    --surface-2:        #f3f1ea;
                    --border:           rgba(35,38,46,0.20);
                    --ink-line:         rgba(35,38,46,0.20);
                    --grid-line:        rgba(35,38,46,0.05);
                    --neu-raised:       0 2px 6px rgba(40,35,20,0.05);
                    --neu-raised-sm:    0 1px 2px rgba(40,35,20,0.04);
                    --neu-raised-hover: 0 10px 26px rgba(40,35,20,0.10);
                    --neu-inset:        inset 0 0 0 1px rgba(35,38,46,0.14);
                    --neu-inset-sm:     inset 0 0 0 1px rgba(35,38,46,0.10);
                    --neu-modal:        0 30px 70px rgba(40,35,20,0.30);
                    --neu-inset-color:  #f3f1ea;
                    --neu-light:        #ffffff;
                    --accent-soft:      #fbeecb;
                    --text-primary: #23262e;
                    --text-muted:   #8b8678;
                    --divider:      rgba(35,38,46,0.12);
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --page:             #15140f;
                        --bg:               #15140f;
                        --neu-bg:           #211f1a;
                        --surface-2:        #2a2720;
                        --border:           rgba(255,255,255,0.20);
                        --ink-line:         rgba(255,255,255,0.20);
                        --grid-line:        rgba(255,255,255,0.05);
                        --neu-raised:       0 2px 6px rgba(0,0,0,0.35);
                        --neu-raised-sm:    0 1px 2px rgba(0,0,0,0.3);
                        --neu-raised-hover: 0 10px 26px rgba(0,0,0,0.5);
                        --neu-inset:        inset 0 0 0 1px rgba(255,255,255,0.12);
                        --neu-inset-sm:     inset 0 0 0 1px rgba(255,255,255,0.08);
                        --neu-modal:        0 30px 70px rgba(0,0,0,0.6);
                        --neu-inset-color:  #2a2720;
                        --neu-light:        #2a2720;
                        --accent-soft:      rgba(245,193,61,0.18);
                        --text-primary: #efe9dd;
                        --text-muted:   #9d978b;
                        --divider:      rgba(255,255,255,0.10);
                    }
                }
                * { box-sizing: border-box; } body { margin: 0; }
                ::placeholder { color: var(--text-muted); opacity: 1; }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: var(--divider); border-radius: 4px; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: isNarrow ? 'column' : 'row', background: 'var(--page)', backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)', backgroundSize: '38px 38px', fontFamily: 'var(--font-body), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: isNarrow ? '12px' : '16px', gap: isNarrow ? '12px' : '16px', overflow: 'hidden'}}>

                {/* Warning banner */}
                {shouldShowWarning && (
                    <div style={{position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, background: 'var(--neu-bg)', borderBottom: '1px solid var(--divider)', boxShadow: 'var(--neu-raised-sm)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <Warning size={18} color="#d97706" />
                            <p style={{margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500}}>Map configuration warning</p>
                        </div>
                        <div onClick={() => setIsWarningDismissed(true)} style={{width: '28px', height: '28px', borderRadius: '8px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-raised-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)'}}>
                            <X size={14} />
                        </div>
                    </div>
                )}

                {/* ── Map panel (top on mobile, left on desktop) ─────────── */}
                <div style={{width: isNarrow ? '100%' : '60%', height: isNarrow ? '42vh' : 'auto', flexShrink: 0, borderRadius: isNarrow ? '18px' : '24px', overflow: 'hidden', border: '1.5px solid var(--ink-line)', boxShadow: 'var(--neu-raised)', position: 'relative'}}>
                    {/* Loading overlay */}
                    {hideMapUntilReady && (
                        <div style={{position: 'absolute', inset: 0, zIndex: 10, background: 'var(--neu-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                            <div style={{width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite'}} />
                            <span style={{fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500}}>Preparing map…</span>
                        </div>
                    )}

                    <MapBoxMap
                        mapLib={mapboxgl}
                        {...viewState}
                        style={{width: '100%', height: '100%', visibility: hideMapUntilReady ? 'hidden' : 'visible'}}
                        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
                        ref={mapRef}
                        onLoad={() => setIsMapReady(true)}
                        mapboxAccessToken={mapboxApiKey}
                        mapStyle="mapbox://styles/mapbox/light-v11"
                        minZoom={1}
                        maxZoom={18}
                    >
                        <NavigationControl position="bottom-right" />
                        {locations.map(location => {
                            const isPinned  = pinnedRecordId === location.id;
                            const isHovered = hoveredLocationId === location.id;
                            return (
                                <Marker key={location.id} longitude={location.lng!} latitude={location.lat!} style={{zIndex: isPinned ? 2000 : isHovered ? 1000 : 1}}>
                                    <div
                                        onClick={() => handleMarkerClick(location)}
                                        onMouseEnter={() => setHoveredLocationId(location.id)}
                                        onMouseLeave={() => setHoveredLocationId(prev => prev === location.id ? null : prev)}
                                        style={{position: 'relative', cursor: 'pointer', transform: isPinned ? 'scale(1.3)' : isHovered ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.18s'}}
                                    >
                                        {/* Pin shape */}
                                        <div style={{width: '28px', height: '28px', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: isPinned ? `linear-gradient(135deg, #fff, #e8edf5)` : `linear-gradient(135deg, ${ACCENT_MID}, ${ACCENT})`, boxShadow: isPinned ? `0 0 0 3px ${ACCENT}, 3px 3px 10px rgba(245,193,61,0.5)` : `3px 3px 8px rgba(245,193,61,0.4), -2px -2px 6px rgba(255,255,255,0.3)`, transition: 'background 0.18s, box-shadow 0.18s'}} />
                                        {/* White dot on pinned */}
                                        {isPinned && <div style={{position: 'absolute', top: '5px', left: '5px', width: '10px', height: '10px', borderRadius: '50%', background: ACCENT, pointerEvents: 'none'}} />}
                                        {/* Tooltip */}
                                        {(isHovered || isPinned) && (
                                            <div style={{position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)', background: isPinned ? ACCENT : 'var(--neu-bg)', boxShadow: isPinned ? `0 4px 14px rgba(245,193,61,0.4)` : 'var(--neu-raised)', borderRadius: '10px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: isPinned ? ACCENT_TEXT : 'var(--text-primary)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 20}}>
                                                {location.name}
                                            </div>
                                        )}
                                    </div>
                                </Marker>
                            );
                        })}
                    </MapBoxMap>
                </div>

                {/* ── Jobs list panel (below on mobile, right on desktop) ── */}
                <div style={{flex: 1, minHeight: 0, width: '100%', borderRadius: isNarrow ? '18px' : '24px', background: 'var(--neu-bg)', border: '1.5px solid var(--ink-line)', boxShadow: 'var(--neu-raised)', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                    <JobsPanel records={records} table={table} pinnedRecordId={pinnedRecordId} onClearPin={() => setPinnedRecordId(null)} />
                </div>
            </div>
        </>
    );
}

export default function JobsPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    return (
        <Shell>
            {mounted ? (
                <AirtableBoundary>
                    <MapExtensionApp />
                </AirtableBoundary>
            ) : (
                <div style={{flex: 1, background: 'var(--page)'}} />
            )}
        </Shell>
    );
}

// ── Types & hooks (unchanged) ─────────────────────────────────────────────────
export interface LocationData {
    id: string; name: string; address: string;
    lat: number | null; lng: number | null; geoCache: string | null; record: AirtableRecord;
}

export enum GeocodingStatus { Idle = 'idle', Running = 'running', Completed = 'completed' }

type InputRecord = {id: string; name: string; address: string; record: AirtableRecord};

export function useGeocoding({records, apiKey, enabled = true}: {records: ReadonlyArray<InputRecord>; apiKey: string; enabled?: boolean}) {
    const [locations, setLocations]           = useState<LocationData[]>([]);
    const [geocodingStatus, setGeocodingStatus] = useState<GeocodingStatus>(GeocodingStatus.Idle);
    const geoMemoryCacheRef = useRef<Map<string, {lat: number; lng: number}>>(new Map());

    useEffect(() => {
        if (!enabled || !apiKey || !records || records.length === 0) { setLocations([]); setGeocodingStatus(GeocodingStatus.Idle); return; }
        let didCancel = false;
        const geocodeAddress = async (address: string, cacheKey: string): Promise<{lat: number; lng: number} | null> => {
            if (!apiKey || !address) return null;
            const cached = geoMemoryCacheRef.current.get(cacheKey);
            if (cached) return cached;
            try {
                const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&limit=1`);
                const data = await response.json();
                if (data.features?.length > 0) {
                    const [lng, lat] = data.features[0].center;
                    const coords = {lat, lng} as const;
                    geoMemoryCacheRef.current.set(cacheKey, coords);
                    return coords;
                }
            } catch (error) { console.error('Geocoding error:', error); }
            return null;
        };
        const process = async () => {
            setGeocodingStatus(GeocodingStatus.Running);
            const out: LocationData[] = [];
            for (const r of records) {
                const {id, name, address, record} = r;
                if (!address) continue;
                const normalizedAddress = address.toLowerCase().trim();
                const coords = await geocodeAddress(address, normalizedAddress);
                if (coords) out.push({id, name: name || address, address, lat: coords.lat, lng: coords.lng, geoCache: normalizedAddress, record});
            }
            if (!didCancel) { setLocations(out); setGeocodingStatus(GeocodingStatus.Completed); }
        };
        process();
        return () => { didCancel = true; };
    }, [records, apiKey, enabled]);

    return {locations, geocodingStatus};
}

export function useMapViewState(storageKey: string, defaultState: MapViewState) {
    const [viewState, setViewState]       = useState<MapViewState>(defaultState);
    const savedViewRef                    = useRef<MapViewState | null>(null);
    const initialCameraAppliedRef         = useRef<boolean>(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number' && typeof parsed.zoom === 'number') {
                    savedViewRef.current = parsed as MapViewState;
                }
            }
        } catch {}
    }, [storageKey]);

    useEffect(() => {
        try { localStorage.setItem(storageKey, JSON.stringify(viewState)); } catch {}
    }, [storageKey, viewState]);

    return {viewState, setViewState, savedViewRef, initialCameraAppliedRef};
}
