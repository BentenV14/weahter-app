'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Map, Radio, Layers, Sun, Settings, Star, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
export function CommandPalette() {
  const [open, setOpen] = useState(false),
    [filter, setFilter] = useState(''),
    router = useRouter(),
    favorites = useAppStore((s) => s.favorites);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const actions = [
    {
      label: 'Search location',
      icon: Search,
      run: () => useAppStore.getState().setSearchOpen(true),
    },
    { label: 'Open weather map', icon: Map, run: () => router.push('/map') },
    { label: 'Open observed radar', icon: Radio, run: () => router.push('/radar') },
    { label: 'Compare forecast models', icon: Layers, run: () => router.push('/models') },
    { label: 'Change units and preferences', icon: Settings, run: () => router.push('/settings') },
    {
      label: 'Toggle dark mode',
      icon: Sun,
      run: () =>
        useAppStore.getState().updateSettings({
          theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
        }),
    },
    ...favorites.map((f) => ({
      label: `Switch to ${f.name}`,
      icon: Star,
      run: () => useAppStore.getState().selectLocation(f),
    })),
  ].filter((a) => a.label.toLowerCase().includes(filter.toLowerCase()));
  return (
    <>
      <button
        className="command-trigger"
        aria-label="Open command palette"
        onClick={() => setOpen(true)}
      >
        <kbd>⌘ K</kbd>
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="command-dialog">
            <Dialog.Title className="sr-only">Command palette</Dialog.Title>
            <Dialog.Description className="sr-only">
              Find places and open weather tools
            </Dialog.Description>
            <div className="search-field">
              <Search size={20} />
              <input
                aria-label="Filter commands"
                placeholder="Where would you like to go?"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && actions[0]) {
                    actions[0].run();
                    setOpen(false);
                  }
                }}
              />
              <Dialog.Close className="icon-button" aria-label="Close command palette">
                <X size={18} />
              </Dialog.Close>
            </div>
            <div className="command-list">
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => {
                    setOpen(false);
                    a.run();
                  }}
                >
                  <a.icon size={18} />
                  {a.label}
                  <span>↵</span>
                </button>
              ))}
              {!actions.length && <p>No matching commands.</p>}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
