'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, LocateFixed, Search, MapPin, ArrowUpRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getCountries } from '@/lib/location/client';
import { countryName, languageName } from '@/lib/location/countries';
import { locate } from '@/lib/location/controller';
import { flag } from '@/lib/weather/format';
import { Button } from './ui/button';
export function CountryOverview() {
  const access = useAppStore((s) => s.locationAccess),
    language = useAppStore((s) => s.settings.language),
    [chosen, setChosen] = useState('');
  const query = useQuery({
      queryKey: ['country-catalog'],
      queryFn: ({ signal }) => getCountries(signal),
      staleTime: 86400000,
      retry: false,
      networkMode: 'always',
    }),
    code = chosen || access.countryCode || '',
    country = query.data?.countries.find((c) => c.code === code),
    locating = access.status === 'idle' || access.status === 'locating';
  const search = (capital = false) => {
    useAppStore.setState({ searchCountry: capital ? code : '', searchOpen: true });
  };
  return (
    <div className="country-overview">
      <div className="page-heading">
        <div>
          <p className="date-line">
            <Globe size={14} />
            Weather, everywhere
          </p>
          <h1>
            {code ? `${countryName(code, language)} at a glance` : 'Find your place in the world'}
          </h1>
          <p>
            {locating
              ? 'Allow location access to load the forecast for your nearest locality.'
              : access.status === 'denied'
                ? 'Location access was declined. Explore country information or choose any town worldwide.'
                : 'Precise location is unavailable. Choose a country or search for your forecast.'}
          </p>
        </div>
        <Button onClick={() => search()}>
          <Search size={16} />
          Find a city
        </Button>
      </div>
      <section className="country-hero panel">
        <div className="country-heading">
          <span className="country-flag" aria-hidden="true">
            {code ? flag(code) : <Globe size={48} />}
          </span>
          <div>
            <span className="quality-badge">
              {chosen && chosen !== access.countryCode
                ? 'Selected country'
                : access.countrySource === 'network'
                  ? 'Approximate country from your network'
                  : access.countrySource === 'selected'
                    ? 'Country of your saved place'
                    : 'Country explorer'}
            </span>
            <h2>{code ? countryName(code, language) : 'A world of weather awaits'}</h2>
            <p>
              {country?.continent ?? 'Cities, towns and postal codes across the globe'}
              {country?.capital ? ` · Capital: ${country.capital}` : ''}
            </p>
          </div>
        </div>
        <div className="country-actions">
          <Button onClick={() => void locate()} disabled={locating}>
            <LocateFixed size={16} />
            {locating ? 'Finding your location…' : 'Use my location'}
          </Button>
          <Button variant="outline" onClick={() => search()}>
            <Search size={16} />
            Search worldwide
          </Button>
        </div>
        <label className="country-selector">
          Explore a country
          <select
            aria-label="Explore a country"
            value={code}
            onChange={(e) => setChosen(e.target.value)}
          >
            <option value="">Choose a country or territory</option>
            {query.data?.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {countryName(c.code, language)}
              </option>
            ))}
          </select>
        </label>
        {access.countrySource === 'network' && (
          <p className="country-disclaimer">
            Network country detection is approximate and can change with a VPN. It does not identify
            your nearest town.
          </p>
        )}
      </section>
      {country && (
        <>
          <div className="country-facts">
            <section className="stat-panel panel">
              <span className="stat-label">Capital</span>
              <h2>{country.capital || '—'}</h2>
              <p>{country.continent}</p>
              {country.capital && (
                <Button variant="ghost" onClick={() => search(true)}>
                  Find the capital’s forecast <ArrowUpRight size={14} />
                </Button>
              )}
            </section>
            <section className="stat-panel panel">
              <span className="stat-label">Population · source estimate</span>
              <h2>
                {country.population == null
                  ? '—'
                  : country.population.toLocaleString(language === 'nl' ? 'nl-BE' : 'en-GB')}
              </h2>
              <p>GeoNames country dataset</p>
            </section>
            <section className="stat-panel panel">
              <span className="stat-label">Currency</span>
              <h2>{country.currencyCode || '—'}</h2>
              <p>{country.currency || 'Unavailable'}</p>
            </section>
            <section className="stat-panel panel">
              <span className="stat-label">Country area</span>
              <h2>
                {country.areaKm2 == null ? '—' : country.areaKm2.toLocaleString('en-GB')}
                <small> km²</small>
              </h2>
              <p>Calling code {country.callingCode ? `+${country.callingCode}` : 'unavailable'}</p>
            </section>
          </div>
          <section className="country-details panel">
            <h2>A little more perspective</h2>
            <dl>
              <dt>Languages</dt>
              <dd>
                {country.languages.map((l) => languageName(l, language)).join(', ') ||
                  'Unavailable'}
              </dd>
              <dt>Neighbouring countries</dt>
              <dd>
                {country.neighbours.map((c) => countryName(c, language)).join(', ') ||
                  'No land neighbours listed'}
              </dd>
              <dt>Country code</dt>
              <dd>{country.code}</dd>
            </dl>
            <p>
              <MapPin size={15} />
              Country facts describe the country as a whole. Choose a town or use your device
              location for a precise forecast.
            </p>
          </section>
        </>
      )}
      {query.isPending && (
        <div
          className="skeleton"
          style={{ height: 160 }}
          aria-label="Fetching country information"
        />
      )}
      <div className="data-note">
        <Globe size={15} />
        <span>
          Country information by <a href="https://www.geonames.org/">GeoNames</a> ·{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
          {query.data?.cachedSnapshot ? ' · Saved country dataset' : ''}. Country estimates can lag
          current statistics. Search by{' '}
          <a href="https://open-meteo.com/en/docs/geocoding-api">Open-Meteo / GeoNames</a>.
        </span>
      </div>
    </div>
  );
}
export function CountryNotice() {
  const access = useAppStore((s) => s.locationAccess),
    selected = useAppStore((s) => s.hasSelectedLocation);
  if (!selected || !['denied', 'unavailable'].includes(access.status)) return null;
  return (
    <div className="country-notice" role="status">
      <Globe size={15} />
      <span>
        {access.status === 'denied' ? 'Location access denied.' : 'Device location unavailable.'}{' '}
        {access.countryCode
          ? `${countryName(access.countryCode)} · ${access.countrySource === 'network' ? 'approximate network country' : 'saved place’s country'}.`
          : 'Search any country or city.'}{' '}
        Showing your selected place’s forecast.
      </span>
      <Button variant="ghost" onClick={() => useAppStore.setState({ hasSelectedLocation: false })}>
        Country information
      </Button>
    </div>
  );
}
