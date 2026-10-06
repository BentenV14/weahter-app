'use client';
import { useSyncExternalStore } from 'react';
let epoch = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const snapshot = () => epoch;
const serverSnapshot = () => 0;
function subscribe(listener: () => void) {
  listeners.add(listener);
  const update = () => {
    epoch = Date.now() / 1000;
    listeners.forEach((l) => l());
  };
  if (!timer) {
    update();
    timer = setInterval(update, 60000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}
export function useNow() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
