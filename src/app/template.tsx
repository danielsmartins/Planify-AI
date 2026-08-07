'use client';

import type { ReactNode } from 'react';

export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in zoom-in-99 duration-200 ease-out">
      {children}
    </div>
  );
}
