'use client';

import { api } from '@/lib/api';
import { useEffect,useState } from 'react';

type Permissions = Awaited<ReturnType<typeof api.getCampusRoomPermissions>>['data'];

export function useCampusPermissions(slug?: string) {
  const [result, setResult] = useState<{ slug: string; permissions: Permissions } | null>(null);
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    api.getCampusRoomPermissions(slug).then(response => {
      if (!cancelled) setResult({ slug, permissions: response.data });
    }).catch(() => { if (!cancelled) setResult(null); });
    return () => { cancelled = true; };
  }, [slug]);
  return result && result.slug === slug ? result.permissions : null;
}
