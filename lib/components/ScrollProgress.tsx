'use client';

import React, { useEffect, useState } from 'react';

/**
 * Fixed accent bar at the very top of the page showing scroll progress.
 * Tracks `window` by default, or a specific scroll container via `targetRef`
 * (the full-screen interfaces scroll an inner <main>, not the window).
 * The bar grows/shrinks as the user scrolls either direction, and emits a
 * small "ping" once they reach the bottom.
 */
export function ScrollProgress({ targetRef }: { targetRef?: React.RefObject<HTMLElement | null> }) {
    const [progress, setProgress] = useState(0);
    const [atBottom, setAtBottom] = useState(false);

    useEffect(() => {
        const compute = () => {
            const el = targetRef?.current;
            const scrollTop = el ? el.scrollTop : window.scrollY;
            const scrollHeight = el ? el.scrollHeight : document.documentElement.scrollHeight;
            const clientHeight = el ? el.clientHeight : window.innerHeight;
            const max = scrollHeight - clientHeight;
            const p = max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0;
            setProgress(p);
            setAtBottom(max > 8 && p >= 0.995);
        };

        compute();
        const scroller: Window | HTMLElement = targetRef?.current ?? window;
        scroller.addEventListener('scroll', compute, { passive: true });
        window.addEventListener('resize', compute);
        return () => {
            scroller.removeEventListener('scroll', compute);
            window.removeEventListener('resize', compute);
        };
    }, [targetRef]);

    return (
        <div aria-hidden style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '8px', zIndex: 2000, pointerEvents: 'none' }}>
            <div style={{ position: 'relative', height: '100%', width: `${progress * 100}%`, background: 'var(--accent)', transition: 'width 0.08s linear' }}>
                {atBottom && (
                    <span className="dd-ping" style={{ position: 'absolute', right: 0, top: '50%', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', transform: 'translate(50%, -50%)' }} />
                )}
            </div>
        </div>
    );
}
