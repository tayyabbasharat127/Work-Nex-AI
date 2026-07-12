import { useState, useEffect } from 'react';
import { leaveAPI } from '@/lib/api';

// Org-configurable display names per leave type (e.g. ANNUAL -> "EL"), so every
// page shows the same label instead of each re-implementing its own
// capitalize-the-enum logic. Falls back to a title-cased type if the map
// hasn't loaded yet or has no custom name for that type.
export function useLeaveTypeLabels() {
  const [labels, setLabels] = useState({});
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    try {
      const data = await leaveAPI.getTypeLabels();
      setLabels(data || {});
    } catch {
      // No active policy yet, or fetch failed — formatLeaveType() falls back to title-case.
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refetch();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { labels, loading, refetch };
}

export function formatLeaveType(labels, type) {
  if (!type) return '';
  return labels?.[type] || (type.charAt(0) + type.slice(1).toLowerCase());
}
