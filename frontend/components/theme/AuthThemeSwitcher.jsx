'use client';

import { usePathname } from 'next/navigation';
import ThemeSwitcher from './ThemeSwitcher';

export default function AuthThemeSwitcher() {
  const pathname = usePathname();

  if (pathname === '/' || pathname.startsWith('/dashboard')) return null;

  return (
    <div className="fixed right-4 top-4 z-[80] sm:right-6 sm:top-6">
      <ThemeSwitcher compact />
    </div>
  );
}
