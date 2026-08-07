'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-in fade-in-50 slide-in-from-bottom-1 duration-250 ease-out">
      {children}
    </div>
  );
}
