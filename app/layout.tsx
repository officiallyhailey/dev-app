import type { Metadata, Viewport } from 'next';
import './globals.css';
import './theme.css';
import { anton, montserrat } from './fonts';

export const metadata: Metadata = {
    title: 'DevDeck — your resource hub',
    description: 'Cheat sheets, dev work, events, jobs and tools — on the go.',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'DevDeck',
    },
    icons: {
        icon: '/icon.svg',
        apple: '/icon.svg',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    // Keep the whole page in view: stop iOS from zooming when a field is focused
    // and the keyboard appears.
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#f4f4f5' },
        { media: '(prefers-color-scheme: dark)', color: '#161618' },
    ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${anton.variable} ${montserrat.variable}`}>
            <body>{children}</body>
        </html>
    );
}
