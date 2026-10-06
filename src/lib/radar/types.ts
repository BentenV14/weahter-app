export interface RadarFrame {
  time: number;
  path: string;
  host: string;
}
export interface RadarProvider {
  id: string;
  name: string;
  attribution: string;
  getFrames(signal?: AbortSignal): Promise<RadarFrame[]>;
  getTileUrl(frame: RadarFrame): string;
}
