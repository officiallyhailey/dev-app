import type { Metadata, Viewport } from 'next';
import './globals.css';
import './theme.css';

export const metadata: Metadata = {
    title: 'Cheat Sheets',
    description: 'Airtable interfaces, on the go.',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Cheat Sheets',
    },
    icons: {
        icon: '/icon.svg',
        apple: '/icon.svg',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#eceae4' },
        { media: '(prefers-color-scheme: dark)', color: '#15140f' },
    ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
