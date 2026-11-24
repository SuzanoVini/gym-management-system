import { useCallback, useEffect, useState } from 'react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { errorHandler } from '@/lib/errorHandler';
import {
  fetchAttendanceCoveredSince,
  fetchLastMemberSyncAt,
  fetchMembers,
  subscribeToMembers,
} from '@/lib/supabase/members';
import type { Member } from '@/types';

export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [attendanceCoveredSince, setAttendanceCoveredSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [memberRows, syncAt, coveredSince] = await Promise.all([
        fetchMembers(),
        fetchLastMemberSyncAt(),
        fetchAttendanceCoveredSince(),
      ]);
      setMembers(memberRows);
      setLastSyncAt(syncAt);
      setAttendanceCoveredSince(coveredSince);
    } catch (err) {
      const loadError = err instanceof Error ? err : new Error('Failed to load members');
      setError(loadError);
      errorHandler.handle(loadError, 'loadMembers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Coverage is refetched too, so a feed outage hides the attendance insight on open tabs.
  const silentRefresh = useCallback(async () => {
    try {
      const [memberRows, syncAt, coveredSince] = await Promise.all([
        fetchMembers(),
        fetchLastMemberSyncAt(),
        fetchAttendanceCoveredSince(),
      ]);
      setMembers(memberRows);
      setLastSyncAt(syncAt);
      setAttendanceCoveredSince(coveredSince);
    } catch (err) {
      errorHandler.handle(err, 'useMembers.silentRefresh');
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useRealtimeRefresh(subscribeToMembers, silentRefresh);

  // An outage writes nothing, so realtime can't signal it: recheck coverage hourly so
  // an open tab drops the attendance insight once the feed goes quiet for 48h.
  useEffect(() => {
    const id = setInterval(
      () => {
        void fetchAttendanceCoveredSince().then(setAttendanceCoveredSince);
      },
      60 * 60 * 1000
    );
    return () => clearInterval(id);
  }, []);

  return { members, lastSyncAt, attendanceCoveredSince, loading, error, refresh: loadMembers };
};
