'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, MapPin, LocateFixed, History, ArrowUpRight, Star } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getLocations } from '@/lib/api';
import { coordinateSearch, flag, locationKey } from '@/lib/weather/format';
import type { Location } from '@/lib/weather/types';
import { locate } from '@/lib/location/controller';
import { getCountries } from '@/lib/location/client';
import { countryName } from '@/lib/location/countries';
export { locate };
export function LocationPicker() {
  const open = useAppStore((s) => s.searchOpen),
    setOpen = useAppStore((s) => s.setSearchOpen),
    recent = useAppStore((s) => s.recent),
    favorites = useAppStore((s) => s.favorites),
    language = useAppStore((s) => s.settings.language),
    country = useAppStore((s) => s.searchCountry);
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState(''),
    [active, setActive] = useState(0),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setActive(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const countries = useQuery({
    queryKey: ['country-catalog'],
    queryFn: ({ signal }) => getCountries(signal),
    enabled: open,
    staleTime: 86400000,
    networkMode: 'always',
  });
  const selectedCountry = countries.data?.countries.find((c) => c.code === country),
    term = debounced.trim().length >= 2 ? debounced.trim() : (selectedCountry?.capital ?? '');
  const point = coordinateSearch(search),
    query = useQuery({
      queryKey: ['geocoding', term, language, country],
      enabled: open && term.length >= 2 && !point,
      staleTime: 86400000,
      retry: 1,
      queryFn: ({ signal }) => getLocations(term, language, signal, country || undefined),
    });
  const list = point
    ? [point]
    : term.length >= 2
      ? (query.data ?? [])
      : favorites.length
        ? favorites
        : recent;
  const choose = (location: Location) => {
    useAppStore.getState().selectLocation(location);
    setOpen(false);
    setSearch('');
  };
  useEffect(() => {
    setActive(0);
  }, [country]);
  useEffect(() => {
    if (open) document.getElementById(`location-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, query.data]);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="location-dialog"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            input.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Search a location</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search any city, postal code, or latitude and longitude. Use the arrow keys to choose a
            result.
          </Dialog.Description>
          <div className="search-field">
            <Search size={22} />
            <input
              ref={input}
              role="combobox"
              aria-label="Search cities, postal codes or coordinates"
              aria-expanded="true"
              aria-controls="location-results"
              aria-autocomplete="list"
              aria-activedescendant={list[active] ? `location-${active}` : undefined}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="City, postal code, or coordinates"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((a) => Math.max(0, Math.min(list.length - 1, a + 1)));
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                }
                if (e.key === 'Enter' && list[active]) {
                  e.preventDefault();
                  choose(list[active]);
                }
              }}
            />
            <Dialog.Close className="icon-button" aria-label="Close location search">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="search-body">
            <button
              className="locate-row"
              onClick={() => {
                void locate();
                setOpen(false);
              }}
            >
              <LocateFixed size={19} />
              <span>
                Use my current location
                <small>Load your nearest locality using your device’s location</small>
              </span>
              <ArrowUpRight size={17} />
            </button>
            <label className="search-country-filter">
              Country
              <select
                aria-label="Filter locations by country"
                value={country}
                onChange={(e) => useAppStore.setState({ searchCountry: e.target.value })}
              >
                <option value="">Everywhere in the world</option>
                {countries.data?.countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {countryName(c.code, language)}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted search-label">
              {term.length >= 2
                ? `${list.length} matches${list.length === 100 ? ' · first 100' : ''}${country ? ` · ${countryName(country, language)}` : ' · worldwide'}`
                : favorites.length
                  ? 'Saved places'
                  : 'Recent searches'}
            </p>
            <div id="location-results" role="listbox" aria-label="Locations">
              {list.map((location, i) => (
                <button
                  id={`location-${i}`}
                  role="option"
                  aria-selected={active === i}
                  key={locationKey(location)}
                  className={`location-result ${active === i ? 'selected' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(location)}
                >
                  <span className="place-icon">
                    {debounced.length >= 2 ? (
                      <MapPin size={19} />
                    ) : favorites.length ? (
                      <Star size={18} />
                    ) : (
                      <History size={18} />
                    )}
                  </span>
                  <span>
                    <strong>
                      {location.name} <em>{flag(location.country_code)}</em>
                    </strong>
                    <small>
                      {[location.admin1, location.country].filter(Boolean).join(', ')}
                      {location.elevation !== undefined
                        ? ` · ${Math.round(location.elevation)} m`
                        : ''}
                    </small>
                  </span>
                  <span className="coordinates">
                    {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
                  </span>
                </button>
              ))}
            </div>
            {query.isFetching && (
              <div className="search-loading">
                <span className="spinner" />
                Searching the world…
              </div>
            )}
            {query.isError && (
              <p role="alert">Search is unavailable. Enter coordinates like 51.2, 3.2.</p>
            )}
            {!query.isFetching && !list.length && (
              <div className="search-empty">
                <MapPin size={26} />
                <p>
                  {term.length >= 2
                    ? 'No places found. Try a spelling variant, another country, or coordinates.'
                    : 'Every forecast starts with a place.'}
                </p>
                <small>Search internationally, or enter latitude, longitude.</small>
              </div>
            )}
          </div>
          <div className="search-footer">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> navigate <kbd>↵</kbd> select
            </span>
            <span>
              <a href="https://open-meteo.com/en/docs/geocoding-api">Open-Meteo / GeoNames</a> · Up
              to 100 matches
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
