import React from 'react';
import { INK } from './brutalist';

// ── Lightweight markdown renderer ─────────────────────────────────────────────
// Renders the small subset of markdown that Airtable's AI summary fields produce:
// bold / italic / inline code / links, headings, and bullet & numbered lists.
// Shared by the interface pages that display those summaries.

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

export function MarkdownText({ text }: { text: string }): React.ReactElement {
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
