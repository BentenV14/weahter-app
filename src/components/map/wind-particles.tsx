'use client';
import { useEffect, useRef } from 'react';
import type { Map } from 'maplibre-gl';
import type { WeatherResponse } from '@/lib/weather/types';
export function WindParticles({
  map,
  data,
  time,
  density,
  speed,
  opacity,
}: {
  map: Map | null;
  data: WeatherResponse[];
  time: number;
  density: number;
  speed: number;
  opacity: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (
      !map ||
      !canvas.current ||
      !data.length ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const el = canvas.current,
      context = el.getContext('2d');
    if (!context) return;
    let animation = 0;
    const particles = Array.from({ length: density }, () => ({
      x: Math.random() * el.clientWidth,
      y: Math.random() * el.clientHeight,
      life: Math.random() * 80,
    }));
    const render = () => {
      if (el.width !== el.clientWidth || el.height !== el.clientHeight) {
        el.width = el.clientWidth;
        el.height = el.clientHeight;
      }
      context.clearRect(0, 0, el.width, el.height);
      context.strokeStyle = `rgba(213,236,246,${opacity})`;
      context.lineWidth = 1.4;
      const samples = data.flatMap((d) => {
        const s = d.hourly;
        if (!s) return [];
        const index = s.time.reduce(
            (best, t, i) => (Math.abs(t - time) < Math.abs(s.time[best] - time) ? i : best),
            0,
          ),
          wind = s.wind_speed_10m?.[index],
          direction = s.wind_direction_10m?.[index];
        if (wind == null || direction == null) return [];
        const p = map.project([d.longitude, d.latitude]);
        return [{ x: p.x, y: p.y, wind, direction }];
      });
      if (samples.length)
        for (const p of particles) {
          const near = samples.reduce((best, s) =>
              (s.x - p.x) ** 2 + (s.y - p.y) ** 2 < (best.x - p.x) ** 2 + (best.y - p.y) ** 2
                ? s
                : best,
            ),
            angle = ((near.direction + 180) * Math.PI) / 180,
            velocity = Math.max(0.15, near.wind / 18) * speed,
            dx = Math.sin(angle) * velocity,
            dy = -Math.cos(angle) * velocity;
          context.beginPath();
          context.moveTo(p.x, p.y);
          context.lineTo(p.x + dx * 4, p.y + dy * 4);
          context.stroke();
          p.x += dx;
          p.y += dy;
          p.life++;
          if (p.life > 100 || p.x < 0 || p.y < 0 || p.x > el.width || p.y > el.height) {
            p.x = Math.random() * el.width;
            p.y = Math.random() * el.height;
            p.life = 0;
          }
        }
      animation = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animation);
  }, [map, data, time, density, speed, opacity]);
  return <canvas className="wind-canvas" ref={canvas} aria-hidden="true" />;
}
