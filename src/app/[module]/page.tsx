import { notFound } from 'next/navigation';
import { WeatherApp } from '@/components/weather-app';
const modules = [
  'weather',
  'hourly',
  'daily',
  'map',
  'radar',
  'models',
  'ensemble',
  'air-quality',
  'marine',
  'flood',
  'solar',
  'history',
  'climate',
  'seasonal',
  'lab',
  'astronomy',
  'activities',
  'compare',
  'settings',
];
export function generateStaticParams() {
  return modules.map((module) => ({ module }));
}
export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return {
    title:
      module === 'weather'
        ? 'Your forecast'
        : module.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}
export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!modules.includes(module)) notFound();
  return <WeatherApp module={module} />;
}
