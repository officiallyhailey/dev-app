'use client';

import React, {useState, useEffect, useMemo} from 'react';
import {useBase, useRecords, AirtableBoundary} from '@/lib/airtable/hooks';
import {Shell} from '@/lib/components/Shell';
import {useIsNarrow} from '@/lib/useIsNarrow';
import {modalOverlayStyle, modalCardStyle} from '@/lib/components/modalStyle';
import {HelpButton} from '@/lib/components/InfoModal';
// These were SDK model types; the ported UI only uses them as loose annotations.
type AirtableRecord = any;
type Table = any;
type Field = any;
import {X, MagnifyingGlass, ArrowUpRight, CaretLeft, CaretRight, MapPin, Clock, Plus, CheckCircle, Circle} from '@phosphor-icons/react';

// ── Accent ────────────────────────────────────────────────────────────────────
const ACCENT      = '#F5C13D'; // amber primary
const ACCENT_DEEP = '#E3A81B'; // darker amber (tags / icons on tint)
const ACCENT_TEXT = '#2c2510'; // dark text on amber
const INK         = '#23262e'; // charcoal (line-art ink / titles / pills)
const TEAL        = INK;       // secondary accent is charcoal to match the devwork theme
const MONO        = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// ── Field IDs ─────────────────────────────────────────────────────────────────
const F = {
    name:            'fldI3nYLgvlcI58Ni',
    title:           'fldHSeh7u67uHAkrB',
    organization:    'fldcbl2LMgIewlFad',
    summary:         'fldhiJhH4kW4t3VWX',
    date:            'fldWMqRKlLoxnRB7b',
    eventDate:       'fldGqgPyqKG0KDyUz',
    displayLocation: 'fldoNX88tL54KqQG0',
    location:        'fldgfo9lUSwRHK8X1',
    type:            'fldlVyy9qMqs5ySkk',
    status:          'fldFtw6r5ptWWMbCx',
    update:          'fldim1JZzcBvQt8fU',
    acDiscount:      'fldM4Vsn5wgdWBrrJ',
    frequency:       'fldWJNvZcEGGYsKJx',
    notes:           'fld4c7r50yHXlL8kE',
    contactPerson:   'fldenlkAkfZsCIiyA',
    contactEmail:    'fldu7ywo9jiTlXGVC',
    eventLink:       'fldEMXBETWH9vLKAp',
    taskLink:        'fldEBr4ENsFpsL5l1',
    flag:            'fldu6V63VtnDqRZeT',
    created:         'fldNphx06K1wqxwxs',
    generatedDate:   'fldhGh5rqGB582YT0',
};

// ── Update status color map ───────────────────────────────────────────────────
const UPDATE_COLORS: Record<string, {bg: string; text: string}> = {
    'Upcoming':    {bg: 'rgba(35,181,164,0.14)',  text: '#1a8c7e'},
    'Registered':  {bg: 'rgba(37,99,235,0.12)',   text: '#2563eb'},
    'Attended':    {bg: 'rgba(22,163,74,0.12)',    text: '#16a34a'},
    'Interested':  {bg: 'rgba(124,58,237,0.12)',   text: '#7c3aed'},
    'Saved':       {bg: 'rgba(110,143,152,0.12)',  text: '#6e8f98'},
    'Not Going':   {bg: 'rgba(220,38,38,0.12)',    text: '#dc2626'},
    'Cancelled':   {bg: 'rgba(220,38,38,0.12)',    text: '#dc2626'},
    'Pending':     {bg: 'rgba(217,119,6,0.12)',    text: '#d97706'},
    'Completed':   {bg: 'rgba(22,163,74,0.12)',    text: '#16a34a'},
};

function getUpdateColor(val: string) {
    return UPDATE_COLORS[val] ?? {bg: 'rgba(110,143,152,0.12)', text: '#6e8f98'};
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getField(table: Table, id: string) { return table.getFieldIfExists(id); }

function getStr(record: AirtableRecord, table: Table, id: string): string {
    const f = getField(table, id);
    return f ? record.getCellValueAsString(f) : '';
}

function getSelectName(record: AirtableRecord, table: Table, id: string): string {
    const f = getField(table, id);
    if (!f) return '';
    const v = record.getCellValue(f) as {name: string} | null;
    return v?.name ?? '';
}

function getChoices(field: Field | null): Array<{id: string; name: string}> {
    return (field?.config as any)?.options?.choices ?? [];
}

const MONTH_NAMES: Record<string, number> = {
    january:0, february:1, march:2, april:3, may:4, june:5,
    july:6, august:7, september:8, october:9, november:10, december:11,
    jan:0, feb:1, mar:2, apr:3, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
};

function parseDate(s: string | null | undefined): Date | null {
    if (!s) return null;
    const str = String(s).trim();
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const us = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (us) return new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]));
    const long = str.match(/^([A-Za-z]+)\s+(\d{1,2})[,\s]+(\d{4})/);
    if (long) { const mo = MONTH_NAMES[long[1]!.toLowerCase()]; if (mo !== undefined) return new Date(Number(long[3]), mo, Number(long[2])); }
    const dmy = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (dmy) { const mo = MONTH_NAMES[dmy[2]!.toLowerCase()]; if (mo !== undefined) return new Date(Number(dmy[3]), mo, Number(dmy[1])); }
    // Fallback: "Month DD, YYYY" anywhere in the string (e.g. "Wednesday, June 17, 2026, 6:00 PM")
    const longAny = str.match(/([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/);
    if (longAny) { const mo = MONTH_NAMES[longAny[1]!.toLowerCase()]; if (mo !== undefined) return new Date(Number(longAny[3]), mo, Number(longAny[2])); }
    return null;
}

// Resolve a record's date as a *calendar day*, Date field first, then the Event
// Date formula. We parse the value as plain Y-M-D and never run it through
// Date.parse: a date-only value like "2026-06-20" is treated by Date.parse as UTC
// midnight, which new Date() then shifts to the previous/next day in the viewer's
// local time zone — the source of the off-by-one. parseDate builds a local Date
// from the literal year/month/day, so the day the user sees never drifts.
function recordDate(record: AirtableRecord, table: Table): Date | null {
    for (const fid of [F.date, F.eventDate]) {
        const f = getField(table, fid);
        if (!f) continue;
        // Prefer the displayed string (exactly the day Airtable shows), then fall
        // back to the raw cell value — both parsed as a literal calendar date.
        const d = parseDate(record.getCellValueAsString(f))
            ?? parseDate(String(record.getCellValue(f) ?? ''));
        if (d) return d;
    }
    return null;
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Sort key derived from the same resolution, so bucket / badge / sort never diverge. Undated last.
function dateSortValue(record: AirtableRecord, table: Table): number {
    const d = recordDate(record, table);
    return d ? d.getTime() : Number.POSITIVE_INFINITY;
}

function toInputDate(d: Date | null): string {
    if (!d) return '';
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

// Convert a date-input value ("YYYY-MM-DD") into a value Airtable stores on the
// intended calendar day. We anchor at *noon UTC* rather than midnight: noon is far
// enough from the date boundary that no real-world time-zone offset (±14h) can push
// it onto an adjacent day, so the chosen day survives both date-only and date+time
// fields regardless of the viewer's time zone.
function fromInputDate(s: string): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s ?? '').trim());
    if (!m) return null;
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)).toISOString();
}

const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHT   = ['S','M','T','W','T','F','S'];

// Type detection
function typeKind(type: string): 'event' | 'task' | 'todo' | 'pin' | 'other' {
    if (/event/i.test(type)) return 'event';
    if (/pin/i.test(type)) return 'pin';
    if (/to\s*-?\s*do/i.test(type)) return 'todo';
    if (/task/i.test(type)) return 'task';
    return 'other';
}

// ── Corner registration brackets (technical blueprint marks) ──────────────────
function CornerBrackets({inset = 9, size = 10, color = 'var(--ink-line)'}: {inset?: number; size?: number; color?: string}) {
    const b = `1.5px solid ${color}`;
    const base: React.CSSProperties = {position: 'absolute', width: `${size}px`, height: `${size}px`, pointerEvents: 'none'};
    return (
        <>
            <div style={{...base, top: inset, left: inset, borderTop: b, borderLeft: b}} />
            <div style={{...base, top: inset, right: inset, borderTop: b, borderRight: b}} />
            <div style={{...base, bottom: inset, left: inset, borderBottom: b, borderLeft: b}} />
            <div style={{...base, bottom: inset, right: inset, borderBottom: b, borderRight: b}} />
        </>
    );
}

// ── Section label (brutalist mono) ────────────────────────────────────────────
function SectionLabel({text}: {text: string}) {
    return <div style={{fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: '8px'}}>// {text}</div>;
}

// ── Type pill (brutalist tag) ─────────────────────────────────────────────────
function TypePill({label}: {label: string}) {
    if (!label) return null;
    return (
        <span style={{display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '4px', border: `1.5px solid ${INK}`, background: 'var(--accent-soft)', color: ACCENT_DEEP, fontFamily: MONO, fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.05em', textTransform: 'uppercase'}}>
            {label}
        </span>
    );
}

// ── Form controls ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: '13px', color: 'var(--text-primary)',
    background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', borderRadius: '6px',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s',
};

function FieldWrap({label, children}: {label: string; children: React.ReactNode}) {
    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
            <SectionLabel text={label} />
            {children}
        </div>
    );
}

function TextInput({label, value, onChange, type = 'text', placeholder}: {
    label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
    return (
        <FieldWrap label={label}>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = ACCENT)}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-line)')} />
        </FieldWrap>
    );
}

function TextArea({label, value, onChange}: {label: string; value: string; onChange: (v: string) => void}) {
    return (
        <FieldWrap label={label}>
            <textarea value={value} onChange={e => onChange(e.target.value)} rows={4}
                style={{...inputStyle, resize: 'vertical', lineHeight: 1.6}}
                onFocus={e => (e.currentTarget.style.borderColor = ACCENT)}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-line)')} />
        </FieldWrap>
    );
}

function Select({label, field, value, onChange}: {label: string; field: Field; value: string; onChange: (v: string) => void}) {
    const choices = getChoices(field);
    return (
        <FieldWrap label={label}>
            <select value={value} onChange={e => onChange(e.target.value)}
                style={{
                    ...inputStyle, padding: '10px 36px 10px 14px', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b909c' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                }}>
                <option value="">— None —</option>
                {choices.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
        </FieldWrap>
    );
}

// ── Record form (create + edit) ───────────────────────────────────────────────
function RecordForm({record, table, onClose, initialType}: {record: AirtableRecord | null; table: Table; onClose: () => void; initialType?: string}) {
    const isEdit = !!record;
    const isNarrow = useIsNarrow();

    const typeField      = getField(table, F.type);
    const updateField    = getField(table, F.update);
    const frequencyField = getField(table, F.frequency);
    const eventLinkField = getField(table, F.eventLink);
    const taskLinkField  = getField(table, F.taskLink);
    const nameField      = getField(table, F.name);
    const notesField     = getField(table, F.notes);
    const dateField      = getField(table, F.date);

    // Default Type for new records: prefer "Task", else first choice
    const typeChoices = getChoices(typeField);
    const defaultType = typeChoices.find(c => /task/i.test(c.name))?.name ?? typeChoices[0]?.name ?? '';

    const [type,      setType]      = useState(record ? getSelectName(record, table, F.type) || defaultType : (initialType || defaultType));
    const [eventLink, setEventLink] = useState(record && eventLinkField ? (record.getCellValue(eventLinkField) as string | null) ?? '' : '');
    const [taskLink,  setTaskLink]  = useState(record && taskLinkField ? (record.getCellValue(taskLinkField) as string | null) ?? '' : '');
    const [name,      setName]      = useState(record ? getStr(record, table, F.name) : '');
    const [notes,     setNotes]     = useState(record && notesField ? record.getCellValueAsString(notesField) : '');
    const [update,    setUpdate]    = useState(record ? getSelectName(record, table, F.update) : '');
    const [frequency, setFrequency] = useState(record ? getSelectName(record, table, F.frequency) : '');
    const [dateVal,   setDateVal]   = useState(record ? toInputDate(recordDate(record, table)) : '');

    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);

    async function handleDelete() {
        if (!record) return;
        if (!confirmDelete) { setConfirmDelete(true); return; }
        const rec = record;
        onClose();                          // close first so nothing reads the record mid-delete
        try {
            await table.deleteRecordAsync(rec);
        } catch (e) {
            console.error('Delete failed', e);
        }
    }

    const kind = typeKind(type);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    async function handleSave() {
        setSaving(true); setError('');
        const updates: Record<string, any> = {};
        if (typeField) updates[typeField.id] = type ? {name: type} : null;

        if (kind === 'event') {
            if (eventLinkField) updates[eventLinkField.id] = eventLink || null;
            if (updateField)    updates[updateField.id]    = update ? {name: update} : null;
        } else if (kind === 'task' || kind === 'pin') {
            if (nameField)      updates[nameField.id]      = name || null;
            if (taskLinkField)  updates[taskLinkField.id]  = taskLink || null;
            if (notesField)     updates[notesField.id]     = notes || null;
            if (updateField)    updates[updateField.id]    = update ? {name: update} : null;
            if (frequencyField) updates[frequencyField.id] = frequency ? {name: frequency} : null;
            if (dateField)      updates[dateField.id]      = dateVal ? fromInputDate(dateVal) : null;
        } else if (kind === 'todo') {
            if (nameField)      updates[nameField.id]      = name || null;
            if (frequencyField) updates[frequencyField.id] = frequency ? {name: frequency} : null;
            if (dateField)      updates[dateField.id]      = dateVal ? fromInputDate(dateVal) : null;
            if (taskLinkField)  updates[taskLinkField.id]  = taskLink || null;
            if (notesField)     updates[notesField.id]     = notes || null;
        } else {
            // Unknown type — at least write the event link if provided
            if (eventLinkField) updates[eventLinkField.id] = eventLink || null;
        }

        try {
            if (isEdit && record) await table.updateRecordAsync(record, updates);
            else                  await table.createRecordAsync(updates);
            onClose();
        } catch (e: any) {
            setError(e?.message ?? 'Save failed — check field permissions.');
            setSaving(false);
        }
    }

    // Read-only enriched details (edit mode)
    const org           = record ? getStr(record, table, F.organization) : '';
    const eventDate     = record ? getStr(record, table, F.eventDate) : '';
    const location      = record ? (getStr(record, table, F.displayLocation) || getSelectName(record, table, F.location)) : '';
    const contactPerson = record ? getStr(record, table, F.contactPerson) : '';
    const contactEmail  = record ? getStr(record, table, F.contactEmail) : '';
    const summaryField  = getField(table, F.summary);
    // Summary / Event Date / Location / Contact are Event-only AI & formula fields
    const showEnriched  = isEdit && kind === 'event';
    const hasSummary    = showEnriched && summaryField && record!.getCellValue(summaryField);

    return (
        <div onClick={onClose} style={{...modalOverlayStyle(isNarrow), background: 'rgba(35,38,46,0.45)', backdropFilter: 'blur(4px)'}}>
            <div onClick={e => e.stopPropagation()} style={{...modalCardStyle(isNarrow), borderRadius: isNarrow ? 0 : '8px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', boxShadow: '12px 12px 0 rgba(35,38,46,0.18)'}}>
                <CornerBrackets inset={10} size={12} />

                {/* Header — top rule */}
                <div style={{padding: '10px 16px', borderBottom: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0}}>
                    <span style={{fontFamily: MONO, fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)'}}>// {isEdit ? 'Edit item' : 'New item'}</span>
                    <div onClick={onClose} style={{width: '28px', height: '28px', borderRadius: '6px', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)'}}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                        <X size={14} weight="bold" />
                    </div>
                </div>

                {/* Body */}
                <div style={{padding: '22px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px'}}>

                    {/* Type — first selector */}
                    {typeField && <Select label="Type" field={typeField} value={type} onChange={setType} />}

                    {/* Conditional fields */}
                    {kind === 'event' && (
                        <>
                            {eventLinkField && <TextInput label="Event Link" type="url" value={eventLink} onChange={setEventLink} placeholder="https://…" />}
                            {updateField    && <Select label="Update" field={updateField} value={update} onChange={setUpdate} />}
                        </>
                    )}

                    {(kind === 'task' || kind === 'pin') && (
                        <>
                            {nameField      && <TextInput label="Name" value={name} onChange={setName} placeholder={kind === 'pin' ? 'Reminder title' : 'Task name'} />}
                            {taskLinkField  && <TextInput label="Task Link" type="url" value={taskLink} onChange={setTaskLink} placeholder="https://…" />}
                            {notesField     && <TextArea label="Notes" value={notes} onChange={setNotes} />}
                            <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                                {updateField    && <div style={{flex: '1 1 130px', minWidth: 0}}><Select label="Update" field={updateField} value={update} onChange={setUpdate} /></div>}
                                {frequencyField && <div style={{flex: '1 1 130px', minWidth: 0}}><Select label="Frequency" field={frequencyField} value={frequency} onChange={setFrequency} /></div>}
                                {dateField      && <div style={{flex: '1 1 130px', minWidth: 0}}><TextInput label="Date" type="date" value={dateVal} onChange={setDateVal} /></div>}
                            </div>
                        </>
                    )}

                    {kind === 'todo' && (
                        <>
                            {nameField      && <TextInput label="Name" value={name} onChange={setName} placeholder="What needs doing?" />}
                            {frequencyField && <Select label="Frequency" field={frequencyField} value={frequency} onChange={setFrequency} />}
                            {dateField      && <TextInput label="Date" type="date" value={dateVal} onChange={setDateVal} />}
                            {taskLinkField  && <TextInput label="Task Link" type="url" value={taskLink} onChange={setTaskLink} placeholder="https://…" />}
                            {notesField     && <TextArea label="Notes" value={notes} onChange={setNotes} />}
                        </>
                    )}

                    {/* Read-only enriched details (Event edit mode) — additional fields first, Summary last */}
                    {showEnriched && (org || eventDate || location) && (
                        <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500}}>
                            {org && <span>{org}</span>}
                            {eventDate && <span style={{display: 'inline-flex', alignItems: 'center', gap: '5px'}}><Clock size={13} weight="bold" color={ACCENT_DEEP} />{eventDate}</span>}
                            {location && <span style={{display: 'inline-flex', alignItems: 'center', gap: '5px'}}><MapPin size={13} weight="bold" color={ACCENT_DEEP} />{location}</span>}
                        </div>
                    )}
                    {showEnriched && (contactPerson || contactEmail) && (
                        <div>
                            <SectionLabel text="Contact" />
                            <div style={{borderRadius: '6px', background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                {contactPerson && <span style={{fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600}}>{contactPerson}</span>}
                                {contactEmail  && <a href={`mailto:${contactEmail}`} style={{fontSize: '13px', color: TEAL, textDecoration: 'none', fontWeight: 500}}>{contactEmail}</a>}
                            </div>
                        </div>
                    )}
                    {hasSummary && (
                        <div>
                            <SectionLabel text="Summary" />
                            <div style={{borderRadius: '6px', background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', padding: '16px', fontSize: '13px', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap'}}>
                                {record!.getCellValueAsString(summaryField!)}
                            </div>
                        </div>
                    )}

                    {error && <div style={{fontSize: '12px', color: '#dc2626', fontWeight: 600}}>{error}</div>}
                </div>

                {/* Footer */}
                <div style={{padding: '14px 20px', borderTop: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexShrink: 0}}>
                    {/* Delete (edit mode) — confirms on first click, deletes on second */}
                    {isEdit ? (
                        <div onClick={handleDelete}
                            onMouseLeave={() => setConfirmDelete(false)}
                            style={{padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', userSelect: 'none', fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'background 0.12s',
                                background: confirmDelete ? '#dc2626' : 'transparent',
                                color: confirmDelete ? '#fff' : '#dc2626',
                                border: `1.5px solid ${confirmDelete ? '#dc2626' : 'rgba(220,38,38,0.5)'}`}}>
                            {confirmDelete ? 'Are you sure?' : 'Delete'}
                        </div>
                    ) : <div />}

                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <div onClick={onClose} style={{padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', color: 'var(--text-muted)', fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', userSelect: 'none', transition: 'background 0.12s'}}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'}>
                            Cancel
                        </div>
                        <div onClick={() => { if (!saving) handleSave(); }}
                            style={{padding: '9px 20px', borderRadius: '6px', cursor: saving ? 'default' : 'pointer', background: ACCENT, color: ACCENT_TEXT, border: `1.5px solid ${INK}`, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', userSelect: 'none', opacity: saving ? 0.7 : 1, transition: 'background 0.12s'}}
                            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLDivElement).style.background = ACCENT_DEEP; }}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ACCENT}>
                            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Mini calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({records, table, onSelectDate, highlightDate}: {
    records: readonly AirtableRecord[];
    table: Table;
    onSelectDate: (d: Date | null) => void;
    highlightDate: Date | null;
}) {
    const today = new Date();
    const [year, setYear]   = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());

    const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

    const byDate = useMemo(() => {
        const map = new Map<string, AirtableRecord[]>();
        records.forEach(r => {
            const d = recordDate(r, table);
            if (!d) return;
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(r);
        });
        return map;
    }, [records, table]);

    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div style={{position: 'relative', borderRadius: '8px', background: 'var(--surface)', boxShadow: '5px 5px 0 rgba(35,38,46,0.16)', border: '1.5px solid var(--ink-line)', padding: '20px'}}>
            <CornerBrackets inset={8} size={9} />

            {/* Month nav */}
            <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.5px solid var(--ink-line)'}}>
                <div>
                    <div style={{fontFamily: MONO, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', textTransform: 'uppercase', lineHeight: 1}}>{MONTHS[month]}</div>
                    <div style={{fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: '3px'}}>{year}</div>
                </div>
                <div style={{display: 'flex', gap: '6px'}}>
                    <div onClick={prevMonth} style={{width: '30px', height: '30px', borderRadius: '6px', border: '1.5px solid var(--ink-line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', transition: 'background 0.12s'}}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'}>
                        <CaretLeft size={12} weight="bold" />
                    </div>
                    <div onClick={nextMonth} style={{width: '30px', height: '30px', borderRadius: '6px', border: '1.5px solid var(--ink-line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', transition: 'background 0.12s'}}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'}>
                        <CaretRight size={12} weight="bold" />
                    </div>
                </div>
            </div>

            {/* Day headers */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px'}}>
                {DAYS_SHT.map((d, i) => (
                    <div key={i} style={{textAlign: 'center', fontFamily: MONO, fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '3px 0', letterSpacing: '0.04em'}}>{d}</div>
                ))}
            </div>

            {/* Day cells — brutalist dot grid */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px'}}>
                {cells.map((day, idx) => {
                    if (!day) return <div key={idx} style={{aspectRatio: '1'}} />;
                    const key        = `${year}-${month}-${day}`;
                    const dayRecords = byDate.get(key) ?? [];
                    const isToday    = isSameDay(new Date(year, month, day), today);
                    const isHl       = highlightDate ? isSameDay(new Date(year, month, day), highlightDate) : false;
                    const hasEvents  = dayRecords.length > 0;
                    const thisDate   = new Date(year, month, day);

                    // Dot-grid treatment: today = amber fill, has-events = ink fill,
                    // selected = amber ring, empty = hollow outline.
                    const fill   = isToday ? ACCENT : hasEvents ? INK : 'transparent';
                    const txt    = isToday ? ACCENT_TEXT : hasEvents ? '#fff' : 'var(--text-muted)';
                    const border = isHl ? `1.5px solid ${ACCENT_DEEP}` : hasEvents || isToday ? '1.5px solid transparent' : '1.5px solid var(--ink-line)';

                    return (
                        <div key={idx}
                            onClick={() => hasEvents && onSelectDate(isHl ? null : thisDate)}
                            style={{
                                aspectRatio: '1', borderRadius: '50%', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', cursor: hasEvents ? 'pointer' : 'default',
                                background: fill, border, opacity: hasEvents || isToday ? 1 : 0.55,
                                transition: 'transform 0.1s',
                            }}
                            onMouseEnter={e => { if (hasEvents) (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.12)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}>
                            <span style={{fontFamily: MONO, fontSize: '12px', fontWeight: isToday || hasEvents ? 800 : 500, color: txt, lineHeight: 1}}>{day}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Agenda row ────────────────────────────────────────────────────────────────
function AgendaRow({record, table, onClick, onToggleComplete, completedName, isToday}: {
    record: AirtableRecord; table: Table; onClick: () => void;
    onToggleComplete: ((r: AirtableRecord, done: boolean) => void) | null;
    completedName: string | null; isToday: boolean;
}) {
    const name      = getStr(record, table, F.name) || getStr(record, table, F.title);
    const org       = getStr(record, table, F.organization);
    const location  = getStr(record, table, F.displayLocation) || getSelectName(record, table, F.location);
    const type      = getSelectName(record, table, F.type);
    const update    = getSelectName(record, table, F.update);
    const kind      = typeKind(type);
    const isTaskish = kind === 'task' || kind === 'todo';

    const linkId = kind === 'task' || kind === 'todo' ? F.taskLink : F.eventLink;
    const linkF  = getField(table, linkId);
    const link   = linkF ? record.getCellValue(linkF) as string | null : null;

    const parsed   = recordDate(record, table);
    const dayNum   = parsed ? String(parsed.getDate()).padStart(2, '0') : null;
    const monthStr = parsed ? MONTHS_SHT[parsed.getMonth()] : null;

    const isComplete = !!completedName && update === completedName;
    const showCheck  = isTaskish && !!onToggleComplete && !!completedName;
    const updateColor = update ? getUpdateColor(update) : null;

    return (
        <div onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 14px',
                borderRadius: '6px', cursor: 'pointer', transition: 'box-shadow 0.12s, transform 0.12s',
                background: isToday ? 'var(--accent-soft)' : 'var(--surface)',
                boxShadow: 'none', border: '1.5px solid var(--ink-line)', marginBottom: '10px',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '4px 4px 0 rgba(35,38,46,0.16)'; (e.currentTarget as HTMLDivElement).style.transform = 'translate(-1px,-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'translate(0,0)'; }}>

            {/* Check circle (tasks/todos) */}
            {showCheck && (
                <div onClick={e => { e.stopPropagation(); onToggleComplete!(record, !isComplete); }}
                    style={{display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0, color: isComplete ? '#16a34a' : 'var(--text-muted)'}}>
                    {isComplete ? <CheckCircle size={24} weight="fill" /> : <Circle size={24} weight="regular" />}
                </div>
            )}

            {/* Date badge */}
            <div style={{width: '46px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'var(--surface-2)', border: '1.5px solid var(--ink-line)', padding: '8px 4px', minHeight: '50px'}}>
                {monthStr ? (
                    <>
                        <span style={{fontFamily: MONO, fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: ACCENT_DEEP, lineHeight: 1}}>{monthStr}</span>
                        <span style={{fontFamily: MONO, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em'}}>{dayNum}</span>
                    </>
                ) : (
                    <span style={{fontFamily: MONO, fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700}}>TBD</span>
                )}
            </div>

            {/* Content */}
            <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isComplete ? 'line-through' : 'none', opacity: isComplete ? 0.55 : 1}}>{name || 'Untitled'}</div>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '2px'}}>
                    {org && <span style={{fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500}}>{org}</span>}
                    {location && (
                        <span style={{display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500}}>
                            <MapPin size={10} weight="bold" />{location}
                        </span>
                    )}
                </div>
            </div>

            {/* Right: pills */}
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0}}>
                {type && <TypePill label={type} />}
                {update && updateColor && (
                    <span style={{display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '4px', border: `1.5px solid ${updateColor.text}`, background: updateColor.bg, color: updateColor.text, fontFamily: MONO, fontSize: '9px', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase'}}>{update}</span>
                )}
            </div>

            {/* Link icon */}
            {link && (
                <a href={link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    style={{width: '30px', height: '30px', borderRadius: '6px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT_DEEP, flexShrink: 0, textDecoration: 'none'}}>
                    <ArrowUpRight size={13} weight="bold" />
                </a>
            )}
        </div>
    );
}

// ── Pin (brutalist note) card ─────────────────────────────────────────────────
function PinCard({record, table, onClick, index}: {record: AirtableRecord; table: Table; onClick: () => void; index: number}) {
    const title   = getStr(record, table, F.name) || getStr(record, table, F.title);
    const notesF  = getField(table, F.notes);
    const notes   = notesF ? record.getCellValueAsString(notesF) : '';
    const heading = notes && title ? title : '';
    const body    = notes || title || 'Empty note';
    const rot = index % 2 === 0 ? '-1.2deg' : '1.1deg';

    return (
        <div onClick={onClick}
            style={{position: 'relative', background: 'var(--surface)', color: 'var(--text-primary)', borderRadius: '6px', border: '1.5px solid var(--ink-line)', padding: '15px 14px 13px', boxShadow: '4px 4px 0 rgba(35,38,46,0.16)', cursor: 'pointer', minHeight: '96px', transform: `rotate(${rot})`, transition: 'transform 0.14s, box-shadow 0.14s', display: 'flex', flexDirection: 'column', gap: '5px'}}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'rotate(0deg) translate(-1px,-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '6px 6px 0 rgba(35,38,46,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = `rotate(${rot})`; (e.currentTarget as HTMLDivElement).style.boxShadow = '4px 4px 0 rgba(35,38,46,0.16)'; }}>
            {/* Amber pin tab */}
            <span style={{position: 'absolute', top: '-6px', left: '12px', width: '14px', height: '14px', borderRadius: '50%', background: ACCENT, border: `1.5px solid ${INK}`}} />
            {heading && <div style={{fontFamily: MONO, fontWeight: 800, fontSize: '11px', letterSpacing: '0.02em', textTransform: 'uppercase', color: ACCENT_DEEP}}>{heading}</div>}
            <div style={{fontSize: '12.5px', lineHeight: 1.5, fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 7, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden'}}>{body}</div>
        </div>
    );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function EventsApp(): React.ReactElement {
    const isNarrow   = useIsNarrow();
    const base       = useBase();
    // Agenda Fields table (the standalone base has many tables, so pin by id).
    const table      = base.tables.find(t => t.id === 'tbl6xGCwCI4XclP19') ?? base.tables[0];
    const allRecords = useRecords(table ?? null);
    const [search,          setSearch]          = useState('');
    const [formRecord,      setFormRecord]      = useState<AirtableRecord | null>(null);
    const [formOpen,        setFormOpen]        = useState(false);
    const [formInitialType, setFormInitialType] = useState('');
    const [dateFilter,      setDateFilter]      = useState<Date | null>(null);
    const [typeFilter,      setTypeFilter]      = useState<'all' | 'task' | 'event' | 'past'>('all');

    if (!table) return <div style={{padding: '24px', color: 'var(--text-muted)'}}>No table found.</div>;

    const statusField = getField(table, F.status);
    const updateField = getField(table, F.update);
    const pinTypeName = getChoices(getField(table, F.type)).find(c => /pin/i.test(c.name))?.name ?? 'Pin';
    const completedName = getChoices(updateField).find(c => /complete|done/i.test(c.name))?.name ?? null;
    const incompleteName = getChoices(updateField).find(c => /pending|to\s*-?\s*do|open|todo/i.test(c.name))?.name ?? null;

    const visible = allRecords.filter(r => {
        const s = statusField ? (r.getCellValue(statusField) as {name: string} | null)?.name?.toLowerCase() : '';
        return s !== 'hidden';
    });

    const sorted = useMemo(
        () => [...visible].sort((a, b) => dateSortValue(a, table) - dateSortValue(b, table)),
        [visible, table]
    );

    const isPast = typeFilter === 'past';
    const isDone = (r: AirtableRecord) => !!completedName && getSelectName(r, table, F.update) === completedName;

    const filtered = sorted.filter(r => {
        const kind = typeKind(getSelectName(r, table, F.type));
        if (kind === 'pin') return false; // Pins live in their own column
        if (isPast) {
            if (!isDone(r)) return false;             // Past = completed (Done) history
        } else {
            if (isDone(r)) return false;              // hide Done from active views
            if (typeFilter === 'task'  && !(kind === 'task' || kind === 'todo')) return false;
            if (typeFilter === 'event' && kind !== 'event') return false;
        }
        if (dateFilter) {
            const d = recordDate(r, table);
            if (!d || !isSameDay(d, dateFilter)) return false;
        }
        if (!search) return true;
        const name = getStr(r, table, F.name) || getStr(r, table, F.title);
        const org  = getStr(r, table, F.organization);
        const q    = search.toLowerCase();
        return name.toLowerCase().includes(q) || org.toLowerCase().includes(q);
    });

    // Pins — reminders shown in the far-right post-it column (Done pins hidden, search-filtered)
    const pins = visible.filter(r => {
        if (typeKind(getSelectName(r, table, F.type)) !== 'pin') return false;
        if (isDone(r)) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        const txt = `${getStr(r, table, F.name)} ${getStr(r, table, F.title)} ${getStr(r, table, F.notes)}`.toLowerCase();
        return txt.includes(q);
    });

    async function toggleComplete(record: AirtableRecord, done: boolean) {
        if (!updateField) return;
        const target = done ? completedName : incompleteName;
        try {
            await table.updateRecordAsync(record, {[updateField.id]: target ? {name: target} : null});
        } catch (e) { console.error('Toggle failed', e); }
    }

    // Group into sections (only when not date-filtered)
    const today = new Date();
    const groups = useMemo(() => {
        const g: {key: string; label: string; items: AirtableRecord[]}[] = [
            {key: 'overdue',  label: 'Overdue',  items: []},
            {key: 'today',    label: 'Today',    items: []},
            {key: 'upcoming', label: 'Upcoming', items: []},
            {key: 'none',     label: 'No date',  items: []},
        ];
        const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        filtered.forEach(r => {
            const d = recordDate(r, table);
            if (!d) { g[3]!.items.push(r); return; }
            if (isSameDay(d, today)) g[1]!.items.push(r);
            else if (d.getTime() < startToday) g[0]!.items.push(r);
            else g[2]!.items.push(r);
        });
        // Ensure every section is strictly earliest → latest by the Date field
        g.forEach(s => s.items.sort((a, b) => dateSortValue(a, table) - dateSortValue(b, table)));
        return g.filter(s => s.items.length > 0);
    }, [filtered, table]);

    const openCreate    = () => { setFormRecord(null); setFormInitialType(''); setFormOpen(true); };
    const openCreatePin = () => { setFormRecord(null); setFormInitialType(pinTypeName); setFormOpen(true); };
    const openEdit      = (r: AirtableRecord) => { setFormRecord(r); setFormInitialType(''); setFormOpen(true); };

    const todayLabel = today.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'});

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
                select option { color: #23262e; }

                /* Agenda split layout — calendar | list | pins.
                   On shrink, the Pinned column drops under the calendar instead
                   of being clipped; on narrow widths everything stacks. */
                .agenda-grid {
                    display: grid;
                    grid-template-columns: 280px minmax(0, 1fr) 300px;
                    grid-template-areas: "cal list pins";
                    gap: 20px;
                    align-items: start;
                }
                /* minmax(0, …) lets the flexible track shrink below its content's
                   intrinsic width, so a long agenda row can't blow the grid past
                   the viewport (the right-edge cutoff). */
                .agenda-grid > * { min-width: 0; }
                @media (max-width: 1425px) {
                    .agenda-grid {
                        grid-template-columns: 260px minmax(0, 1fr);
                        grid-template-areas:
                            "cal  list"
                            "pins list";
                    }
                }
                @media (max-width: 680px) {
                    .agenda-grid {
                        grid-template-columns: minmax(0, 1fr);
                        grid-template-areas:
                            "cal"
                            "list"
                            "pins";
                    }
                }
            `}</style>

            <div style={{minHeight: '100%', background: 'var(--page)', backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)', backgroundSize: '38px 38px', padding: isNarrow ? '14px 10px 32px' : '24px 24px 32px', fontFamily: 'var(--font-body), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}}>
                <div style={{maxWidth: '1180px', margin: '0 auto'}}>

                    {/* Header */}
                    <div style={{marginBottom: '24px', paddingBottom: '20px', borderBottom: '1.5px solid var(--ink-line)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap'}}>
                        <div>
                            <h1 style={{margin: 0, fontFamily: MONO, fontSize: 'clamp(40px, 8vw, 68px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', textTransform: 'uppercase', lineHeight: 0.92}}>AGEN<span style={{color: ACCENT_DEEP}}>_</span>DA</h1>
                            <p style={{margin: '10px 0 0', fontFamily: MONO, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase'}}>■ {todayLabel}</p>
                        </div>

                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
                            {/* Type filter */}
                            <div style={{display: 'flex', gap: '6px'}}>
                                {(['all', 'task', 'event', 'past'] as const).map(t => {
                                    const active = typeFilter === t;
                                    const label = t === 'all' ? 'All' : t === 'task' ? 'Tasks' : t === 'event' ? 'Events' : 'Past';
                                    return (
                                        <button key={t} onClick={() => setTypeFilter(t)}
                                            style={{padding: '8px 14px', borderRadius: '5px', cursor: 'pointer', fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', border: '1.5px solid var(--ink-line)', background: active ? INK : 'var(--surface)', color: active ? '#fff' : 'var(--text-muted)', transition: 'background 0.12s'}}>
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Search */}
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '5px', background: 'var(--surface)', border: '1.5px solid var(--ink-line)', minWidth: '200px'}}>
                                <MagnifyingGlass size={14} color="var(--text-muted)" weight="bold" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                                    style={{flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', color: 'var(--text-primary)', fontFamily: MONO, letterSpacing: '0.03em'}} />
                                {search && (
                                    <div onClick={() => setSearch('')} style={{width: '18px', height: '18px', borderRadius: '4px', background: 'var(--surface-2)', border: '1.2px solid var(--ink-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)'}}>
                                        <X size={10} weight="bold" />
                                    </div>
                                )}
                            </div>

                            {/* Help */}
                            <HelpButton page="events" />

                            {/* Add */}
                            <div onClick={openCreate}
                                style={{display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '5px', cursor: 'pointer', background: ACCENT, color: ACCENT_TEXT, border: `1.5px solid ${INK}`, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', userSelect: 'none', transition: 'background 0.12s'}}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = ACCENT_DEEP}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ACCENT}>
                                <Plus size={15} weight="bold" /> Add
                            </div>
                        </div>
                    </div>

                    {/* Split layout */}
                    <div className="agenda-grid">

                        {/* Left: mini calendar */}
                        <div style={{gridArea: 'cal'}}>
                            <MiniCalendar
                                records={visible}
                                table={table}
                                onSelectDate={d => setDateFilter(d)}
                                highlightDate={dateFilter}
                            />
                        </div>

                        {/* Right: agenda */}
                        <div style={{gridArea: 'list', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            {/* Panel header */}
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '0 2px'}}>
                                <span style={{fontFamily: MONO, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', textTransform: 'uppercase'}}>
                                    {isPast ? 'Past' : dateFilter ? `${MONTHS_SHT[dateFilter.getMonth()]} ${dateFilter.getDate()}` : 'Today'}
                                </span>
                                {dateFilter && (
                                    <span onClick={() => setDateFilter(null)} style={{display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 9px', borderRadius: '4px', border: `1.5px solid ${INK}`, background: 'var(--accent-soft)', fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: ACCENT_DEEP, cursor: 'pointer'}}>
                                        Clear <X size={10} weight="bold" />
                                    </span>
                                )}
                            </div>

                            {filtered.length === 0 ? (
                                <div style={{textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontFamily: MONO, fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', background: 'var(--surface)', borderRadius: '8px', border: '1.5px dashed var(--ink-line)'}}>{isPast ? 'Nothing completed yet.' : 'Nothing scheduled.'}</div>
                            ) : (dateFilter || isPast) ? (
                                // Flat list — selected day, or Past (completed) — earliest → latest by Date
                                <div>
                                    {filtered.map(r => (
                                        <AgendaRow key={r.id} record={r} table={table} onClick={() => openEdit(r)} onToggleComplete={toggleComplete} completedName={completedName} isToday={!isPast && !!dateFilter && isSameDay(dateFilter, today)} />
                                    ))}
                                </div>
                            ) : (
                                // Grouped sections
                                groups.map(section => (
                                    <div key={section.key} style={{marginBottom: '6px'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 2px 10px'}}>
                                            <span style={{fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: section.key === 'today' ? ACCENT_DEEP : section.key === 'overdue' ? '#dc2626' : 'var(--text-muted)'}}>// {section.label}</span>
                                            <span style={{flex: 1, height: '1.5px', background: 'var(--ink-line)'}} />
                                        </div>
                                        {section.items.map(r => (
                                            <AgendaRow key={r.id} record={r} table={table} onClick={() => openEdit(r)} onToggleComplete={toggleComplete} completedName={completedName} isToday={section.key === 'today'} />
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Far right: Pins (pinned content) */}
                        <div style={{gridArea: 'pins', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '0 2px'}}>
                                <span style={{fontFamily: MONO, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', textTransform: 'uppercase'}}>Pinned</span>
                                <div onClick={openCreatePin} title="Add pin"
                                    style={{marginLeft: 'auto', width: '30px', height: '30px', borderRadius: '5px', background: ACCENT, color: ACCENT_TEXT, border: `1.5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.12s'}}
                                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = ACCENT_DEEP}
                                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ACCENT}>
                                    <Plus size={15} weight="bold" />
                                </div>
                            </div>

                            {pins.length === 0 ? (
                                <div style={{textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontFamily: MONO, fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', background: 'var(--surface)', borderRadius: '8px', border: '1.5px dashed var(--ink-line)'}}>No pins yet.</div>
                            ) : (
                                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '16px', padding: '6px 4px'}}>
                                    {pins.map((r, i) => (
                                        <PinCard key={r.id} record={r} table={table} index={i} onClick={() => openEdit(r)} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {formOpen && (
                <RecordForm record={formRecord} table={table} initialType={formInitialType} onClose={() => setFormOpen(false)} />
            )}
        </>
    );
}

export default function EventsPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    return (
        <Shell>
            {mounted ? (
                <AirtableBoundary>
                    <EventsApp />
                </AirtableBoundary>
            ) : (
                <div style={{flex: 1, background: 'var(--page)'}} />
            )}
        </Shell>
    );
}