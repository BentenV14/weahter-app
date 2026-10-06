import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Atmos — Weather, with perspective',
    short_name: 'Atmos',
    description: 'A real-data weather forecast, radar and meteorology platform.',
    start_url: '/weather',
    scope: '/',
    display: 'standalone',
    background_color: '#101827',
    theme_color: '#101827',
    lang: 'en',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Radar', url: '/radar' },
      { name: 'Hourly forecast', url: '/hourly' },
    ],
  };
}
