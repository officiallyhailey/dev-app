'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const DISPLAY = 'var(--font-display)';

function LoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const next = params.get('next') || '/';

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
        width: '100%', padding: '14px 16px', fontSize: '16px', color: 'var(--text-primary)',
        background: 'var(--page)', border: '2px solid var(--text-primary)', borderRadius: 0,
        outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box',
    };

    return (
        <div style={{
            minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', background: 'var(--page)',
            backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            fontFamily: 'var(--font-body), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
            <form onSubmit={submit} style={{
                width: '100%', maxWidth: '380px', background: 'var(--surface)', border: '2px solid var(--text-primary)',
                borderRadius: 0, padding: '30px 26px', boxShadow: '10px 10px 0 var(--text-primary)',
                display: 'flex', flexDirection: 'column', gap: '18px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '34px', height: '34px', background: 'var(--accent)', border: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontSize: '20px', color: 'var(--accent-text)' }}>D</span>
                    <span style={{ fontFamily: DISPLAY, fontSize: '26px', letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>DevDeck</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>// Enter password</div>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    autoFocus
                    style={inputStyle}
                />
                {error && <div style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>{error}</div>}
                <button type="submit" disabled={busy} style={{
                    padding: '15px 20px', borderRadius: 0, cursor: busy ? 'wait' : 'pointer',
                    background: 'var(--accent)', color: 'var(--accent-text)', border: '2px solid var(--text-primary)',
                    fontFamily: MONO, fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', opacity: busy ? 0.7 : 1,
                }}>
                    {busy ? 'Checking…' : 'Enter →'}
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
