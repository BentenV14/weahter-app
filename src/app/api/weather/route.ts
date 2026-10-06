import { NextRequest, NextResponse } from 'next/server';
import { requestSchema, buildRequest } from '@/lib/weather/providers/openmeteo/config';
import { fetchProvider } from '@/lib/weather/providers/openmeteo/client';
import { cachedFetch } from '@/lib/server/cache';
export async function GET(request: NextRequest) {
  const parsed = requestSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid weather request.' }, { status: 400 });
  const { kind, lat, lon, ...options } = parsed.data;
  try {
    const { url, ttl } = buildRequest(
        kind,
        { name: 'Selected point', latitude: lat, longitude: lon },
        options,
      ),
      started = Date.now();
    const cached = await cachedFetch(url, ttl * 1000, async () => {
      const data = await fetchProvider(url);
      const stamp = (v: typeof data) =>
        Array.isArray(v)
          ? v.map((d) => ({
              ...d,
              fetchedAt: Date.now(),
              provider: 'Open-Meteo',
              model: options.model ?? 'best_match',
            }))
          : {
              ...v,
              fetchedAt: Date.now(),
              provider: 'Open-Meteo',
              model: options.model ?? 'best_match',
            };
      return stamp(data);
    });
    return NextResponse.json(cached.value, {
      headers: {
        'Cache-Control': `public, max-age=${Math.min(ttl, 300)}, stale-while-revalidate=${ttl}`,
        'X-Cache': cached.hit ? 'HIT' : 'MISS',
        'Server-Timing': `provider;dur=${Date.now() - started}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Weather provider unavailable.' },
      { status: 502 },
    );
  }
}
