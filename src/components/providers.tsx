'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { coordinateSearch, locationKey } from '@/lib/weather/format';
import { locate } from '@/lib/location/controller';
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false, gcTime: 3600000 } },
      }),
  );
  const [initialized, setInitialized] = useState(false);
  const theme = useAppStore((s) => s.settings.theme),
    toast = useAppStore((s) => s.toast);
  useEffect(() => {
    let mounted = true;
    const query = new URLSearchParams(window.location.search);
    const initialize = async () => {
      await useAppStore.persist.rehydrate();
      const lat = query.get('lat'),
        lon = query.get('lon');
      const point = lat !== null && lon !== null ? coordinateSearch(`${lat},${lon}`) : null;
      const deviceLocation = query.get('location') === 'device';
      if (point && !deviceLocation) {
        const previous = useAppStore.getState().location,
          same = locationKey(previous) === locationKey(point);
        useAppStore.getState().selectLocation({
          ...(same ? previous : {}),
          ...point,
          name: query.get('name')?.slice(0, 150) || point.name,
        });
      }
      if (!mounted) return;
      if (!point || deviceLocation) void locate(true);
      if (mounted) setInitialized(true);
      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
        void navigator.serviceWorker.register('/sw.js').catch(() => {});
    };
    void initialize();
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.style.colorScheme = document.documentElement.dataset.theme;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => useAppStore.setState({ toast: null }), 4500);
    return () => clearTimeout(timeout);
  }, [toast]);
  return (
    <QueryClientProvider client={client}>
      {initialized ? (
        children
      ) : (
        <div className="boot-state" role="status" aria-label="Opening your weather forecast">
          <span className="brand-symbol">☀</span>
          <strong>atmos.</strong>
          <span className="spinner" />
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            aria-label="Dismiss message"
            onClick={() => useAppStore.setState({ toast: null })}
          >
            ×
          </button>
        </div>
      )}
    </QueryClientProvider>
  );
}
