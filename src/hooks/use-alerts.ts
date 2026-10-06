'use client';
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useForecast } from './use-weather';
import { rows } from '@/lib/weather/types';
import { evaluateAlerts } from '@/lib/weather/alerts';
import { locationKey, localDate } from '@/lib/weather/format';
export function useAlerts() {
  const settings = useAppStore((s) => s.settings),
    location = useAppStore((s) => s.location),
    query = useForecast();
  useEffect(() => {
    if (
      !settings.alerts ||
      !query.data ||
      query.data.offline ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    )
      return;
    const data = query.data.weather,
      hours = rows(data.hourly).filter((h) => h.time >= Date.now() / 1000 - 3600);
    for (const rule of evaluateAlerts(hours, settings)) {
      const key = `atmos-alert:${locationKey(location)}:${localDate(Date.now() / 1000, data.timezone)}:${rule.id}`;
      try {
        if (localStorage.getItem(key)) continue;
        new Notification(`Weather insight · ${rule.title}`, {
          body: `${location.name}: ${rule.message} App-generated advisory.`,
          icon: '/icon-192.png',
          tag: key,
        });
        localStorage.setItem(key, 'sent');
      } catch {
        /* Notifications can be unavailable on mobile; preferences stay saved. */
      }
    }
  }, [query.data, settings, location]);
}
