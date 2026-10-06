import type { LucideIcon } from 'lucide-react';
export function WeatherMetricCard({
  title,
  value,
  unit,
  detail,
  icon: Icon,
  children,
}: {
  title: string;
  value: string;
  unit?: string;
  detail: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <section className="metric-card panel">
      <div className="metric-label">
        <Icon size={17} />
        <h3>{title}</h3>
      </div>
      <div className="metric-reading">
        {value}
        <span>{unit}</span>
      </div>
      {children}
      <p>{detail}</p>
    </section>
  );
}
export function WindCompass({ direction }: { direction: number | null }) {
  return (
    <div
      className="wind-compass"
      aria-label={
        direction === null ? 'Wind direction unavailable' : `Wind from ${direction} degrees`
      }
    >
      <span className="north">N</span>
      <span className="east">E</span>
      <span className="south">S</span>
      <span className="west">W</span>
      <div className="compass-arrow" style={{ transform: `rotate(${direction ?? 0}deg)` }}>
        <i />
        <b />
      </div>
    </div>
  );
}
