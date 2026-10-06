import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="error-state">
      <h1>Beyond the forecast</h1>
      <p>This page doesn’t exist.</p>
      <Link className="button button-primary" href="/weather">
        Back to your weather
      </Link>
    </div>
  );
}
