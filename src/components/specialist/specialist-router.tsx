'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '../ui/states';
const loading = () => <LoadingState />;
const AirQuality = dynamic(() => import('./environmental').then((m) => m.AirQualityView), {
  loading,
});
const Marine = dynamic(() => import('./environmental').then((m) => m.MarineView), { loading });
const Flood = dynamic(() => import('./environmental').then((m) => m.FloodView), { loading });
const Solar = dynamic(() => import('./solar').then((m) => m.SolarView), { loading });
const Models = dynamic(() => import('./models').then((m) => m.ModelsView), { loading });
const Ensemble = dynamic(() => import('./models').then((m) => m.EnsembleView), { loading });
const History = dynamic(() => import('./history-climate').then((m) => m.HistoryView), { loading });
const Climate = dynamic(() => import('./history-climate').then((m) => m.ClimateView), { loading });
const Seasonal = dynamic(() => import('./history-climate').then((m) => m.SeasonalView), {
  loading,
});
const Lab = dynamic(() => import('./lab').then((m) => m.LabView), { loading });
const Astronomy = dynamic(() => import('./astronomy-activities').then((m) => m.AstronomyView), {
  loading,
});
const Activities = dynamic(() => import('./astronomy-activities').then((m) => m.ActivitiesView), {
  loading,
});
const Compare = dynamic(() => import('./compare').then((m) => m.CompareView), { loading });
const Settings = dynamic(() => import('./settings').then((m) => m.SettingsView), { loading });
export function SpecialistRouter({ module }: { module: string }) {
  switch (module) {
    case 'air-quality':
      return <AirQuality />;
    case 'marine':
      return <Marine />;
    case 'flood':
      return <Flood />;
    case 'solar':
      return <Solar />;
    case 'models':
      return <Models />;
    case 'ensemble':
      return <Ensemble />;
    case 'history':
      return <History />;
    case 'climate':
      return <Climate />;
    case 'seasonal':
      return <Seasonal />;
    case 'lab':
      return <Lab />;
    case 'astronomy':
      return <Astronomy />;
    case 'activities':
      return <Activities />;
    case 'compare':
      return <Compare />;
    case 'settings':
      return <Settings />;
    default:
      return null;
  }
}
