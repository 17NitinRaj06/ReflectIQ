import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'ReflectIQ — Personal Reflection Intelligence',
  description: 'Personal reflection intelligence platform for journaling, pattern discovery, and grounded self-inquiry.',
  openGraph: {
    title: 'ReflectIQ — Personal Reflection Intelligence',
    description: 'Personal reflection intelligence platform for journaling, pattern discovery, and grounded self-inquiry.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReflectIQ — Personal Reflection Intelligence',
    description: 'Personal reflection intelligence platform for journaling, pattern discovery, and grounded self-inquiry.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
