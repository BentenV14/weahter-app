import { afterEach, describe, it, expect, vi } from 'vitest';
import { searchLocations } from '@/lib/weather/providers/openmeteo/geocoding';
import { parseCountries } from '@/lib/location/countries';
import { resolveDeviceLocation, detectCountry } from '@/lib/location/detection';
import { locate } from '@/lib/location/controller';
import { useAppStore, initialLocation } from '@/lib/store';
afterEach(() => vi.unstubAllGlobals());
describe('worldwide location coverage', () => {
  it('requests the maximum worldwide matches and applies a country filter', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] })));
    vi.stubGlobal('fetch', fetcher);
    await searchLocations('London', 'en', 'GB');
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get('count')).toBe('100');
    expect(url.searchParams.get('countryCode')).toBe('GB');
  });
  it('parses real country TSV fields and rejects malformed rows', () => {
    const tsv =
      '# source\nBE\tBEL\t056\tBE\tBelgium\tBrussels\t30510\t11422068\tEU\t.be\tEUR\tEuro\t32\t####\tpostal\tnl-BE,fr-BE,de-BE\t2802361\tDE,NL,LU,FR\t\ninvalid';
    expect(parseCountries(tsv)).toEqual([
      expect.objectContaining({
        code: 'BE',
        name: 'Belgium',
        capital: 'Brussels',
        continent: 'Europe',
        population: 11422068,
        currency: 'Euro',
        languages: ['nl-BE', 'fr-BE', 'de-BE'],
      }),
    ]);
    expect(() => parseCountries('<html>Unavailable</html>')).toThrow();
  });
});
describe('consented location and country-only fallback', () => {
  it('keeps a manual selection made while automatic GPS is pending', async () => {
    useAppStore.setState({
      location: initialLocation,
      hasSelectedLocation: false,
      selectionRevision: 0,
    });
    let complete: (position: GeolocationPosition) => void = () => {};
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: typeof complete) => {
          complete = success;
        },
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const pending = locate(true);
    expect(locate(true)).toBe(pending);
    useAppStore.getState().selectLocation({ name: 'Paris', latitude: 48.8566, longitude: 2.3522 });
    complete({ coords: { latitude: 50.85, longitude: 4.35 } } as GeolocationPosition);
    await pending;
    expect(useAppStore.getState().location.name).toBe('Paris');
    expect(useAppStore.getState().locationAccess.status).toBe('granted');
  });
  it('opens country information on a denied automatic startup and retains saved places', async () => {
    useAppStore.setState({
      location: initialLocation,
      hasSelectedLocation: true,
      selectionRevision: 0,
    });
    vi.stubGlobal('navigator', {
      onLine: true,
      geolocation: {
        getCurrentPosition: (_success: unknown, failure: (error: unknown) => void) =>
          failure({ code: 1 }),
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ country: 'JP' }))),
    );
    await locate(true);
    expect(useAppStore.getState().hasSelectedLocation).toBe(false);
    expect(useAppStore.getState().location.name).toBe('Bruges');
    expect(useAppStore.getState().locationAccess).toMatchObject({
      status: 'denied',
      countryCode: 'JP',
    });
  });
  it('honours a renewed explicit device request after a manual selection', async () => {
    useAppStore.setState({
      location: initialLocation,
      hasSelectedLocation: false,
      selectionRevision: 0,
    });
    let complete: (position: GeolocationPosition) => void = () => {};
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: typeof complete) => {
          complete = success;
        },
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const pending = locate(true);
    useAppStore.getState().selectLocation({ name: 'Paris', latitude: 48.8566, longitude: 2.3522 });
    void locate();
    complete({ coords: { latitude: 50.85, longitude: 4.35 } } as GeolocationPosition);
    await pending;
    expect(useAppStore.getState().location.latitude).toBe(50.85);
  });
  it('opens the country view before slow network-country detection finishes', async () => {
    useAppStore.setState({
      location: initialLocation,
      hasSelectedLocation: true,
      selectionRevision: 0,
    });
    vi.stubGlobal('navigator', {
      onLine: true,
      geolocation: {
        getCurrentPosition: (_success: unknown, failure: (error: unknown) => void) =>
          failure({ code: 1 }),
      },
    });
    let complete: (response: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            complete = resolve;
          }),
      ),
    );
    const pending = locate(true);
    await vi.waitFor(() => expect(useAppStore.getState().locationAccess.status).toBe('denied'));
    const countryView = !useAppStore.getState().hasSelectedLocation;
    complete(new Response(JSON.stringify({ country: 'JP' })));
    await pending;
    expect(countryView).toBe(true);
  });
  it('restores an explicitly chosen place offline after country view cleared active weather', async () => {
    useAppStore.setState({
      location: initialLocation,
      recent: [initialLocation],
      hasSelectedLocation: false,
      selectionRevision: 0,
    });
    vi.stubGlobal('navigator', {
      onLine: false,
      geolocation: {
        getCurrentPosition: (_success: unknown, failure: (error: unknown) => void) =>
          failure({ code: 2 }),
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await locate(true);
    expect(useAppStore.getState().hasSelectedLocation).toBe(true);
    expect(useAppStore.getState().location.name).toBe('Bruges');
  });
  it('resolves the local name while preserving actual GPS coordinates', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: (position: unknown) => void) =>
          success({ coords: { latitude: 50.85, longitude: 4.35 } }),
      },
    });
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          locality: 'Brussels',
          city: 'Brussels',
          countryName: 'Belgium',
          countryCode: 'BE',
          principalSubdivision: 'Brussels Capital',
          lookupSource: 'reverseGeocoding',
        }),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    const place = await resolveDeviceLocation('en');
    expect(place).toMatchObject({
      name: 'Brussels',
      latitude: 50.85,
      longitude: 4.35,
      country_code: 'BE',
    });
    expect(String(fetcher.mock.calls[0][0])).toContain('latitude=50.85');
  });
  it('uses only country data after a denied GPS permission', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success: unknown, failure: (error: unknown) => void) =>
          failure({ code: 1 }),
      },
    });
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ ip: 'discarded', country: 'JP', city: 'Do not use IP city' }),
        ),
      );
    vi.stubGlobal('fetch', fetcher);
    await expect(resolveDeviceLocation('en')).rejects.toMatchObject({ code: 1 });
    expect(await detectCountry()).toBe('JP');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).not.toContain('latitude');
  });
  it('keeps GPS usable when reverse geocoding is unavailable', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: (position: unknown) => void) =>
          success({ coords: { latitude: 50.85, longitude: 4.35 } }),
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await resolveDeviceLocation('en')).toMatchObject({
      name: 'Your location',
      latitude: 50.85,
      longitude: 4.35,
    });
  });
});
