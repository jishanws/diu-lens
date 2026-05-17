import type { Metadata } from 'next';
import { DM_Sans, Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-heading',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DIU Lens',
  description:
    'AI-powered student face registration and identification system.',
  icons: {
    icon: [
      { url: '/branding/favicon.ico' },
      { url: '/branding/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/branding/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      {
        url: '/branding/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  openGraph: {
    title: 'DIU Lens',
    description:
      'AI-powered student face registration and identification system.',
    images: [
      {
        url: '/branding/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DIU Lens',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DIU Lens',
    description:
      'AI-powered student face registration and identification system.',
    images: ['/branding/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col"
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
