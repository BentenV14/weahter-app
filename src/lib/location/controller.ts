'use client';
import { useAppStore } from '../store';
import { resolveDeviceLocation, detectCountry, LocationAccessError } from './detection';
import { locationKey } from '../weather/format';
let attempt: Promise<void> | null = null;
let requestedRevision = 0;
export function locate(automatic = false): Promise<void> {
  if (automatic && navigator.onLine === false) {
    const saved = useAppStore.getState(),
      selected =
        saved.hasSelectedLocation ||
        saved.recent.some((place) => locationKey(place) === locationKey(saved.location)),
      code = selected ? (saved.location.country_code ?? null) : null;
    useAppStore.setState({
      hasSelectedLocation: selected,
      locationAccess: {
        status: 'unavailable',
        countryCode: code,
        countrySource: code ? 'selected' : null,
      },
    });
    return Promise.resolve();
  }
  if (attempt) {
    if (!automatic) requestedRevision = useAppStore.getState().selectionRevision;
    return attempt;
  }
  requestedRevision = useAppStore.getState().selectionRevision;
  const language = useAppStore.getState().settings.language;
  useAppStore.setState({
    locationAccess: { status: 'locating', countryCode: null, countrySource: null },
  });
  const operation = async () => {
    try {
      const place = await resolveDeviceLocation(language),
        state = useAppStore.getState();
      if (state.selectionRevision === requestedRevision) state.selectLocation(place, 'device');
      useAppStore.setState({
        locationAccess: {
          status: 'granted',
          countryCode: place.country_code ?? null,
          countrySource: null,
        },
      });
      if (!automatic)
        state.notify(
          `Using ${place.name === 'Your location' ? 'your device location' : place.name}.`,
        );
    } catch (error) {
      const denied = error instanceof LocationAccessError && error.code === 1,
        previous = useAppStore.getState(),
        savedCountry = previous.hasSelectedLocation
          ? (previous.location.country_code ?? null)
          : null,
        showCountry =
          automatic &&
          navigator.onLine !== false &&
          previous.selectionRevision === requestedRevision;
      useAppStore.setState({
        ...(showCountry ? { hasSelectedLocation: false } : {}),
        locationAccess: {
          status: denied ? 'denied' : 'unavailable',
          countryCode: null,
          countrySource: null,
        },
      });
      if (!automatic)
        useAppStore
          .getState()
          .notify(
            denied
              ? 'Location access denied. Country information is available; you can search any place.'
              : 'Your location could not be determined. You can search any place.',
          );
      try {
        const code = await detectCountry();
        useAppStore.setState({
          locationAccess: {
            status: denied ? 'denied' : 'unavailable',
            countryCode: code,
            countrySource: 'network',
          },
        });
      } catch {
        const saved = useAppStore.getState(),
          code = saved.hasSelectedLocation ? (saved.location.country_code ?? null) : savedCountry;
        useAppStore.setState({
          locationAccess: {
            status: denied ? 'denied' : 'unavailable',
            countryCode: code,
            countrySource: code ? 'selected' : null,
          },
        });
      }
    }
  };
  attempt = operation().finally(() => {
    attempt = null;
  });
  return attempt;
}
