'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Check, ChevronDown, Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Laptop },
];

const subscribeToHydration = () => () => {};

export default function ThemeSwitcher({ compact = false }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const focusTimer = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector('[role="menuitemradio"]')?.focus();
    });

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      window.cancelAnimationFrame(focusTimer);
    };
  }, [open]);

  const moveMenuFocus = (event) => {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitemradio"]') ?? []);
    if (!items.length) return;

    const currentIndex = items.indexOf(document.activeElement);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
    else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = items.length - 1;
    else return;

    event.preventDefault();
    items[nextIndex]?.focus();
  };

  const active = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2];
  const ActiveIcon = active.Icon;

  if (!mounted) {
    return <span className={compact ? 'block size-11' : 'block h-11 w-36'} aria-hidden="true" />;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-11 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${compact ? 'w-11' : 'min-w-36 gap-2 px-3'}`}
        aria-label={`Color theme: ${active.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ActiveIcon className="size-5" aria-hidden="true" />
        {!compact && <span className="text-sm font-medium">{active.label}</span>}
        {!compact && <ChevronDown className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Choose color theme"
          onKeyDown={moveMenuFocus}
          className="absolute right-0 top-full z-[100] mt-2 w-40 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          {OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{label}</span>
              {theme === value && <Check className="ml-auto size-4 text-primary" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
