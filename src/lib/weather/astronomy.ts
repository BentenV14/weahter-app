import * as SunCalc from 'suncalc';
import { fromZonedTime, getTimezoneOffset } from 'date-fns-tz';
import { localDate } from './format';
import type { Location, WeatherRow } from './types';
export function astronomy(location: Location, timezone: string, epoch: number) {
  const date = fromZonedTime(`${localDate(epoch, timezone)}T12:00:00`, timezone),
    offset = getTimezoneOffset(timezone, date) / 60000,
    sun = SunCalc.getTimes(
      date,
      location.latitude,
      location.longitude,
      location.elevation ?? 0,
      offset,
    ),
    moon = SunCalc.getMoonIllumination(date),
    moonTimes = SunCalc.getMoonTimes(date, location.latitude, location.longitude, offset),
    midnight = fromZonedTime(`${localDate(epoch, timezone)}T00:00:00`, timezone);
  const path: WeatherRow[] = Array.from({ length: 97 }, (_, i) => {
    const time = midnight.getTime() / 1000 + i * 900,
      position = SunCalc.getPosition(new Date(time * 1000), location.latitude, location.longitude);
    return { time, altitude: position.altitude, azimuth: position.azimuth };
  });
  const phase =
    moon.phase < 0.03 || moon.phase > 0.97
      ? 'New moon'
      : moon.phase < 0.22
        ? 'Waxing crescent'
        : moon.phase < 0.28
          ? 'First quarter'
          : moon.phase < 0.47
            ? 'Waxing gibbous'
            : moon.phase < 0.53
              ? 'Full moon'
              : moon.phase < 0.72
                ? 'Waning gibbous'
                : moon.phase < 0.78
                  ? 'Last quarter'
                  : 'Waning crescent';
  return { sun, moon, moonTimes, path, phase };
}
