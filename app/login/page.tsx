'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const ACCENT = '#F5C13D';
const ACCENT_TEXT = '#2c2510';
const INK = '#23262e';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

function LoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const next = params.get('next') || '/cheatsheet';

    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                router.replace(next);
                router.refresh();
                return;
            }
            const body = await res.json().catch(() => ({}));
            setError(body?.error ?? 'Login failed.');
        } catch {
            setError('Network error. Try again.');
        }
        setBusy(false);
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '14px 16px', fontSize: '15px', color: 'var(--text-primary, #23262e)',
        background: '#fff', border: `1.5px solid rgba(35,38,46,0.20)`, borderRadius: '6px',
        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', background: '#f4f4f5',
            backgroundImage: 'linear-gradient(rgba(35,38,46,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(35,38,46,0.05) 1px, transparent 1px)',
            backgroundSize: '38px 38px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
            <form onSubmit={submit} style={{
                width: '100%', maxWidth: '360px', background: '#fff', border: '1.5px solid rgba(35,38,46,0.20)',
                borderRadius: '8px', padding: '32px 28px', boxShadow: '8px 8px 0 rgba(35,38,46,0.12)',
                display: 'flex', flexDirection: 'column', gap: '18px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: ACCENT, border: `1.5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: ACCENT_TEXT }}>CS</div>
                    <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK }}>Cheat Sheets</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8b8678' }}>// Enter password</div>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    autoFocus
                    style={inputStyle}
                />
                {error && <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>{error}</div>}
                <button type="submit" disabled={busy} style={{
                    padding: '13px 20px', borderRadius: '6px', cursor: busy ? 'wait' : 'pointer',
                    background: ACCENT, color: ACCENT_TEXT, border: `1.5px solid ${INK}`,
                    fontFamily: MONO, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', opacity: busy ? 0.7 : 1,
                }}>
                    {busy ? 'Checking…' : 'Enter'}
                </button>
            </form>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    );
}
