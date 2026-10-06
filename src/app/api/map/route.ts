import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mapLayers, sampleGrid } from '@/lib/map/layers';
import { providers } from '@/lib/weather/providers/openmeteo/config';
import { fetchProvider } from '@/lib/weather/providers/openmeteo/client';
import { cachedFetch } from '@/lib/server/cache';
const schema = z.object({
  lat: z.coerce.number().min(-85).max(85),
  lon: z.coerce.number().min(-180).max(180),
  span: z.coerce.number().min(0.2).max(20).default(3),
  layer: z.string(),
});
export async function GET(request: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid map area.' }, { status: 400 });
  const { lat, lon, span, layer: id } = parsed.data,
    layer = mapLayers.find((l) => l.id === id);
  if (!layer) return NextResponse.json({ error: 'Layer unavailable.' }, { status: 400 });
  const points = sampleGrid({ name: 'Map', latitude: lat, longitude: lon }, span),
    config = providers[layer.provider],
    p = new URLSearchParams({
      latitude: points.map((l) => l.latitude.toFixed(4)).join(','),
      longitude: points.map((l) => l.longitude.toFixed(4)).join(','),
      timeformat: 'unixtime',
      timezone: 'GMT',
      forecast_days: layer.provider === 'flood' ? '7' : '2',
    });
  p.set(
    layer.provider === 'flood' ? 'daily' : 'hourly',
    layer.id === 'wind' ? `${layer.variable},wind_direction_10m` : layer.variable,
  );
  try {
    const result = await cachedFetch(
      `map:${id}:${lat.toFixed(2)}:${lon.toFixed(2)}:${span}`,
      600000,
      async () => {
        const data = await fetchProvider(`${config.endpoint}?${p}`);
        return Array.isArray(data) ? data : [data];
      },
    );
    return NextResponse.json(result.value, { headers: { 'Cache-Control': 'public,max-age=600' } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Map samples unavailable.' },
      { status: 502 },
    );
  }
}
