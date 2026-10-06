import { addProtocol } from 'maplibre-gl';
let registered = false;
const recent: number[] = [];
function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const id = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(id);
      reject(signal.reason);
    };
    signal.addEventListener('abort', abort, { once: true });
  });
}
export function registerRadarProtocol() {
  if (registered) return;
  registered = true;
  addProtocol('radartile', async (request, controller) => {
    while (true) {
      while (recent.length && recent[0] < Date.now() - 60000) recent.shift();
      if (recent.length < 75) break;
      await pause(Math.max(100, 60010 - (Date.now() - recent[0])), controller.signal);
    }
    recent.push(Date.now());
    const url = request.url.replace('radartile://', 'https://');
    if (new URL(url).hostname !== 'tilecache.rainviewer.com')
      throw new Error('Unsupported radar host');
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? 'Radar tile limit reached. Pause the animation and retry shortly.'
          : 'Radar tile unavailable',
      );
    return { data: await response.arrayBuffer() };
  });
}
