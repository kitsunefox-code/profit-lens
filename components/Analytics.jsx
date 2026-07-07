'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Privacy-friendly page-view ping. No cookies, no user data — just the path.
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hostname === 'localhost') return;
    fetch('/.netlify/functions/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
