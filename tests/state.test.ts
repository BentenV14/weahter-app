import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, defaultSettings, restorePreferences } from '@/lib/store';
describe('location and preference state', () => {
  beforeEach(() => useAppStore.setState({ favorites: [], recent: [], settings: defaultSettings }));
  const london = { name: 'London', latitude: 51.5, longitude: -0.12, timezone: 'Europe/London' };
  it('deduplicates favorites and switches locations with recents', () => {
    useAppStore.getState().toggleFavorite(london);
    expect(useAppStore.getState().favorites).toHaveLength(1);
    useAppStore.getState().selectLocation(london);
    useAppStore.getState().selectLocation(london);
    expect(useAppStore.getState().recent).toHaveLength(1);
    useAppStore.getState().toggleFavorite(london);
    expect(useAppStore.getState().favorites).toHaveLength(0);
  });
  it('updates preferences without erasing other settings', () => {
    useAppStore.getState().updateSettings({ temperature: 'fahrenheit' });
    expect(useAppStore.getState().settings.temperature).toBe('fahrenheit');
    expect(useAppStore.getState().settings.wind).toBe('kmh');
  });
  it('restores valid preferences while rejecting corrupt browser storage', () => {
    const saved = restorePreferences({
      location: { name: 'Invalid', latitude: 200, longitude: 0 },
      favorites: [london, { latitude: 0 }],
      settings: {
        temperature: 'fahrenheit',
        wind: 'invalid',
        theme: null,
        heatThreshold: Infinity,
      },
    });
    expect(saved.location).toBeUndefined();
    expect(saved.favorites).toEqual([london]);
    expect(saved.settings).toMatchObject({
      temperature: 'fahrenheit',
      wind: 'kmh',
      theme: 'system',
      heatThreshold: 32,
    });
    expect(restorePreferences(null)).toEqual({ settings: defaultSettings });
  });
});
