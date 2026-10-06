import { z } from 'zod';
import type { RadarProvider, RadarFrame } from './types';
const radarSchema = z.object({
  host: z
    .string()
    .url()
    .refine(
      (h) =>
        new URL(h).protocol === 'https:' &&
        ['tilecache.rainviewer.com', 'tilecache.rainviewer.com:443'].includes(new URL(h).host),
    ),
  radar: z.object({
    past: z.array(
      z.object({
        time: z.number().int().nonnegative(),
        path: z.string().regex(/^\/v2\/radar\/[a-zA-Z0-9_/-]+$/),
      }),
    ),
  }),
});
export function parseRadar(body: unknown): RadarFrame[] {
  const parsed = radarSchema.parse(body);
  return parsed.radar.past
    .map((f) => ({ ...f, host: parsed.host }))
    .sort((a, b) => a.time - b.time);
}
export const rainViewer: RadarProvider = {
  id: 'rainviewer',
  name: 'RainViewer',
  attribution: 'Weather data by RainViewer',
  async getFrames(signal) {
    const r = await fetch('/api/radar', { signal });
    if (!r.ok)
      throw new Error('Observed radar is unavailable. Use the forecast precipitation layer.');
    return (await r.json()) as RadarFrame[];
  },
  getTileUrl(frame) {
    return `${frame.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
  },
};
