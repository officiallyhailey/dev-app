'use client';

import React from 'react';
import { TopNav } from './TopNav';

/**
 * App shell for the full-screen interfaces: brutalist top nav above a
 * height-constrained main region. The interface inside should use height:100%
 * (not 100vh) so it fills the area left below the nav.
 */
export function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--page)' }}>
            <TopNav />
            <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
                {children}
            </main>
        </div>
    );
}
