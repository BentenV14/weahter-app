import { CloudOff, RefreshCw } from 'lucide-react';
import { Button } from './button';
export function LoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={compact ? 'skeleton-card' : 'loading-grid'}
      role="status"
      aria-label="Fetching weather data"
    >
      {Array.from({ length: compact ? 3 : 6 }, (_, i) => (
        <div key={i} className="skeleton">
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
export function ErrorState({
  message,
  onRetry,
  title = 'This forecast is taking a break',
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="error-state" role="alert">
      <CloudOff size={36} />
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <Button onClick={onRetry}>
          <RefreshCw size={15} />
          Try again
        </Button>
      )}
    </div>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function SectionHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
