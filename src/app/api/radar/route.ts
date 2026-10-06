import { NextResponse } from 'next/server';
import { parseRadar } from '@/lib/radar/rainviewer';
import { cachedFetch } from '@/lib/server/cache';
export async function GET() {
  if (process.env.NEXT_PUBLIC_RADAR_ENABLED === 'false')
    return NextResponse.json({ error: 'Radar is disabled for this deployment.' }, { status: 503 });
  try {
    const cached = await cachedFetch('radar', 300000, async () => {
      const r = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
        signal: AbortSignal.timeout(12000),
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('Radar unavailable');
      return parseRadar(await r.json());
    });
    return NextResponse.json(cached.value, { headers: { 'Cache-Control': 'public,max-age=300' } });
  } catch {
    return NextResponse.json({ error: 'RainViewer is currently unavailable.' }, { status: 503 });
  }
}
