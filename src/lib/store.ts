'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Location, Settings } from './weather/types';
import { locationKey } from './weather/format';
import { z } from 'zod';
import { locationSchema } from './weather/schema';
export const defaultSettings: Settings = {
  temperature: 'celsius',
  wind: 'kmh',
  pressure: 'hPa',
  precipitation: 'mm',
  distance: 'km',
  time: '24h',
  theme: 'system',
  language: 'en',
  alerts: false,
  gustThreshold: 60,
  heatThreshold: 32,
};
export const initialLocation: Location = {
  name: 'Bruges',
  latitude: 51.2093,
  longitude: 3.2247,
  country: 'Belgium',
  country_code: 'BE',
  admin1: 'Flanders',
  timezone: 'Europe/Brussels',
};
export interface LocationAccess {
  status: 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable';
  countryCode: string | null;
  countrySource: 'network' | 'selected' | null;
}
const preferenceFields = {
  temperature: z.enum(['celsius', 'fahrenheit']),
  wind: z.enum(['kmh', 'ms', 'mph', 'kn']),
  pressure: z.enum(['hPa', 'mmHg', 'inHg']),
  precipitation: z.enum(['mm', 'inch']),
  distance: z.enum(['km', 'mi']),
  time: z.enum(['24h', '12h']),
  theme: z.enum(['light', 'dark', 'system']),
  language: z.enum(['en', 'nl']),
  alerts: z.boolean(),
  gustThreshold: z.number().finite().min(0).max(300),
  heatThreshold: z.number().finite().min(-50).max(60),
};
export function restorePreferences(input: unknown): {
  location?: Location;
  favorites?: Location[];
  recent?: Location[];
  settings: Settings;
} {
  const result: {
    location?: Location;
    favorites?: Location[];
    recent?: Location[];
    settings: Settings;
  } = { settings: { ...defaultSettings } };
  if (!input || typeof input !== 'object') return result;
  const saved = input as Record<string, unknown>,
    location = locationSchema.safeParse(saved.location);
  if (location.success) result.location = location.data;
  for (const [key, limit] of [
    ['favorites', 12],
    ['recent', 8],
  ] as const) {
    if (Array.isArray(saved[key])) {
      const seen = new Set<string>();
      result[key] = saved[key]
        .flatMap((value) => {
          const parsed = locationSchema.safeParse(value);
          if (!parsed.success || seen.has(locationKey(parsed.data))) return [];
          seen.add(locationKey(parsed.data));
          return [parsed.data];
        })
        .slice(0, limit);
    }
  }
  if (saved.settings && typeof saved.settings === 'object')
    for (const [key, schema] of Object.entries(preferenceFields)) {
      const parsed = schema.safeParse((saved.settings as Record<string, unknown>)[key]);
      if (parsed.success) Object.assign(result.settings, { [key]: parsed.data });
    }
  return result;
}
interface State {
  location: Location;
  favorites: Location[];
  recent: Location[];
  settings: Settings;
  searchOpen: boolean;
  toast: string | null;
  hasSelectedLocation: boolean;
  selectionRevision: number;
  selectionOrigin: 'manual' | 'device';
  locationAccess: LocationAccess;
  searchCountry: string;
  selectLocation: (l: Location, origin?: 'manual' | 'device') => void;
  toggleFavorite: (l: Location) => void;
  moveFavorite: (index: number, direction: number) => void;
  updateSettings: (s: Partial<Settings>) => void;
  setSearchOpen: (v: boolean) => void;
  notify: (message: string) => void;
}
export const useAppStore = create<State>()(
  persist(
    (set) => ({
      location: initialLocation,
      favorites: [],
      recent: [],
      settings: defaultSettings,
      searchOpen: false,
      toast: null,
      hasSelectedLocation: false,
      selectionRevision: 0,
      selectionOrigin: 'manual',
      locationAccess: { status: 'idle', countryCode: null, countrySource: null },
      searchCountry: '',
      selectLocation: (l, origin = 'manual') =>
        set((s) => ({
          location: l,
          hasSelectedLocation: true,
          selectionRevision: s.selectionRevision + 1,
          selectionOrigin: origin,
          recent: [l, ...s.recent.filter((r) => locationKey(r) !== locationKey(l))].slice(0, 8),
        })),
      toggleFavorite: (l) =>
        set((s) => ({
          favorites: s.favorites.some((f) => locationKey(f) === locationKey(l))
            ? s.favorites.filter((f) => locationKey(f) !== locationKey(l))
            : [...s.favorites, l].slice(0, 12),
        })),
      moveFavorite: (index, direction) =>
        set((s) => {
          const next = [...s.favorites],
            other = index + direction;
          if (other < 0 || other >= next.length) return {};
          [next[index], next[other]] = [next[other], next[index]];
          return { favorites: next };
        }),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      notify: (toast) => set({ toast }),
    }),
    {
      name: 'atmos-preferences-v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        location: s.location,
        favorites: s.favorites,
        recent: s.recent,
        settings: s.settings,
        hasSelectedLocation: s.hasSelectedLocation,
        selectionOrigin: s.selectionOrigin,
      }),
      merge: (persisted, current) => {
        const saved = restorePreferences(persisted),
          raw =
            persisted && typeof persisted === 'object'
              ? (persisted as Record<string, unknown>)
              : {};
        const hasSelectedLocation = Boolean(
          saved.location &&
          (typeof raw.hasSelectedLocation === 'boolean'
            ? raw.hasSelectedLocation
            : locationKey(saved.location) !== locationKey(initialLocation) ||
              (saved.recent?.length ?? 0) > 0),
        );
        return {
          ...current,
          ...saved,
          hasSelectedLocation,
          selectionOrigin: raw.selectionOrigin === 'device' ? 'device' : 'manual',
          searchOpen: false,
          toast: null,
        };
      },
    },
  ),
);
