import { NextRequest, NextResponse } from 'next/server';
import { searchLocations } from '@/lib/weather/providers/openmeteo/geocoding';
import { cachedFetch } from '@/lib/server/cache';
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '',
    lang = request.nextUrl.searchParams.get('lang') === 'nl' ? 'nl' : 'en';
  const country = request.nextUrl.searchParams.get('country')?.toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country))
    return NextResponse.json({ error: 'Use a two-letter country code.' }, { status: 400 });
  if (q.length < 2 || q.length > 100) return NextResponse.json([]);
  try {
    const result = await cachedFetch(
      `geo:v2:${lang}:${country ?? 'world'}:${q.toLowerCase()}`,
      86400000,
      () => searchLocations(q, lang, country),
    );
    return NextResponse.json(result.value, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Search unavailable. Try latitude, longitude.' },
      { status: 502 },
    );
  }
}
