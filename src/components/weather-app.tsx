'use client';
import dynamic from 'next/dynamic';
import { Dashboard } from './weather/dashboard';
import { HourlyView, DailyView } from './weather/forecast-views';
import { LoadingState } from './ui/states';
import { useAppStore } from '@/lib/store';
import { CountryOverview } from './country-overview';
const Specialist = dynamic(
  () => import('./specialist/specialist-router').then((m) => m.SpecialistRouter),
  { loading: () => <LoadingState /> },
);
const WeatherMap = dynamic(() => import('./map/weather-map').then((m) => m.WeatherMap), {
  ssr: false,
  loading: () => <LoadingState />,
});
export function WeatherApp({ module }: { module: string }) {
  const selected = useAppStore((s) => s.hasSelectedLocation);
  if (!selected && module !== 'settings') return <CountryOverview />;
  if (module === 'weather') return <Dashboard />;
  if (module === 'hourly') return <HourlyView />;
  if (module === 'daily') return <DailyView />;
  if (module === 'map' || module === 'radar') return <WeatherMap radar={module === 'radar'} />;
  return <Specialist module={module} />;
}
