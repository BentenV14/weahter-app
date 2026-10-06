import { describe, it, expect, vi } from 'vitest';
import { buildRequest, requestSchema } from '@/lib/weather/providers/openmeteo/config';
import { cachedFetch, clearCache } from '@/lib/server/cache';
import { rainViewer, parseRadar } from '@/lib/radar/rainviewer';
import { sampleGrid } from '@/lib/map/layers';
describe('provider requests', () => {
  it('validates coordinates and refuses unrestricted models and dates', () => {
    expect(requestSchema.safeParse({ lat: '100', lon: '0', kind: 'forecast' }).success).toBe(false);
    expect(() =>
      buildRequest('forecast', { latitude: 1, longitude: 2, name: 'Test' }, { model: 'injected' }),
    ).toThrow();
    expect(() =>
      buildRequest(
        'historical',
        { latitude: 1, longitude: 2, name: 'Test' },
        { start: '2025-01-02', end: '2025-01-01' },
      ),
    ).toThrow();
    expect(buildRequest('forecast', { latitude: 1, longitude: 2, name: 'Test' }).url).toContain(
      'timeformat=unixtime',
    );
    expect(
      buildRequest(
        'climate',
        { latitude: 1, longitude: 2, name: 'Test' },
        { start: '2030-01-01', end: '2030-12-31' },
      ).url,
    ).toContain('climate-api.open-meteo.com');
  });
  it('deduplicates requests and expires cache', async () => {
    clearCache();
    const fetcher = vi.fn().mockResolvedValue({ good: true });
    await Promise.all([cachedFetch('one', 1000, fetcher), cachedFetch('one', 1000, fetcher)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const cached = await cachedFetch('one', 1000, fetcher);
    expect(cached.hit).toBe(true);
  });
  it('creates bounded geographic samples', () => {
    const samples = sampleGrid({ latitude: 89.9, longitude: 179.9, name: 'Pole' }, 4);
    expect(samples).toHaveLength(25);
    expect(samples.every((s) => Math.abs(s.latitude) <= 85 && Math.abs(s.longitude) <= 180)).toBe(
      true,
    );
  });
});
describe('optional radar', () => {
  it('uses only past frames and validated tile URLs', () => {
    const parsed = parseRadar({
      host: 'https://tilecache.rainviewer.com',
      radar: {
        past: [{ time: 123, path: '/v2/radar/123' }],
        nowcast: [{ time: 456, path: '/future' }],
      },
    });
    expect(parsed).toHaveLength(1);
    expect(rainViewer.getTileUrl(parsed[0])).toContain('/256/{z}/{x}/{y}/2/1_1.png');
    expect(() =>
      parseRadar({
        host: 'https://evil.test',
        radar: { past: [{ time: 1, path: '/v2/radar/1' }] },
      }),
    ).toThrow();
    expect(parseRadar({ host: 'https://tilecache.rainviewer.com', radar: { past: [] } })).toEqual(
      [],
    );
  });
});
