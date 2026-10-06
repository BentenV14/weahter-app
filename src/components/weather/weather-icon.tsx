import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudOff,
} from 'lucide-react';
import { weatherCode } from '@/lib/weather/codes';
const icons = {
  sun: Sun,
  moon: Moon,
  'cloud-sun': CloudSun,
  'cloud-moon': CloudMoon,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
  unknown: CloudOff,
};
export function WeatherIcon({
  code,
  day = true,
  size = 28,
  className = '',
}: {
  code: number | null | undefined;
  day?: boolean;
  size?: number;
  className?: string;
}) {
  const info = weatherCode(code, day),
    Icon = icons[info.icon];
  return (
    <Icon
      size={size}
      strokeWidth={1.6}
      className={`weather-icon ${info.icon} ${className}`}
      aria-label={info.accessibility}
      role="img"
    />
  );
}
export function WeatherArt({
  code,
  day = true,
}: {
  code: number | null | undefined;
  day?: boolean;
}) {
  const info = weatherCode(code, day),
    cloudy = !['sun', 'moon'].includes(info.icon);
  return (
    <svg className="weather-art" viewBox="0 0 260 220" role="img" aria-label={info.accessibility}>
      <defs>
        <radialGradient id="sun-glow">
          <stop offset="0" stopColor="#f9cb8a" stopOpacity=".25" />
          <stop offset="1" stopColor="#f9cb8a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sun-fill" x2=".4" y2="1">
          <stop stopColor="#ffe2b0" />
          <stop offset="1" stopColor="#e8a457" />
        </linearGradient>
        <linearGradient id="cloud-fill" x2="0" y2="1">
          <stop stopColor="#e8edf5" />
          <stop offset="1" stopColor="#a9bbd3" />
        </linearGradient>
      </defs>
      <circle cx="137" cy="95" r="100" fill="url(#sun-glow)" />
      {day ? (
        <>
          <g stroke="#f7c78b" strokeWidth="2" strokeLinecap="round" opacity=".7">
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d="M137 28 v-9" transform={`rotate(${i * 30} 137 95)`} />
            ))}
          </g>
          <circle cx="137" cy="95" r="49" fill="url(#sun-fill)" />
        </>
      ) : (
        <path d="M160 48a50 50 0 1 0 39 81 50 50 0 0 1-39-81" fill="#d6dff1" />
      )}
      {cloudy && (
        <path
          d="M64 161c-33 0-37-43-6-48 3-34 48-49 68-20 31-15 65 7 63 36 32 8 24 48-7 48H65Z"
          fill="url(#cloud-fill)"
        />
      )}
      {['rain', 'drizzle', 'storm'].includes(info.icon) && (
        <g stroke="#8dc4eb" strokeWidth="5" strokeLinecap="round">
          <path d="m82 187-5 12M115 186l-5 15M152 187l-5 12" />
        </g>
      )}
      {info.icon === 'snow' && (
        <g fill="#d9edff">
          <circle cx="85" cy="192" r="4" />
          <circle cx="121" cy="200" r="4" />
          <circle cx="153" cy="189" r="4" />
        </g>
      )}
    </svg>
  );
}
