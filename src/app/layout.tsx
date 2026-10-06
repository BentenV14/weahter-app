import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import { Providers } from '@/components/providers';
import { AppShell } from '@/components/app-shell';
export const metadata: Metadata = {
  title: { default: 'Atmos — Weather, with perspective', template: '%s · Atmos' },
  description:
    'A clear view of your weather. Real forecasts, observed radar, model comparisons and atmospheric insights powered by Open-Meteo.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Atmos' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#101827' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
