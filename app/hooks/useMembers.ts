import { useCallback, useEffect, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { fetchLastMemberSyncAt, fetchMembers } from '@/lib/supabase/members';
import type { Member } from '@/types';

export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [memberRows, syncAt] = await Promise.all([fetchMembers(), fetchLastMemberSyncAt()]);
      setMembers(memberRows);
      setLastSyncAt(syncAt);
    } catch (err) {
      const loadError = err instanceof Error ? err : new Error('Failed to load members');
      setError(loadError);
      errorHandler.handle(loadError, 'loadMembers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return { members, lastSyncAt, loading, error, refresh: loadMembers };
};
