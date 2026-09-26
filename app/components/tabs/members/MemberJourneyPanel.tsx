import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import InfoTip from '@/components/ui/InfoTip';
import { buildJourneyEvents, type JourneyEvent } from '@/lib/members/memberJourney';
import type { DisplayMember } from '@/lib/members/memberRoster';
import { fetchMemberJourneyRecords } from '@/lib/supabase/memberJourney';
import type { Cancellation, Hold, Intro, Signup } from '@/types';

export default function MemberJourneyPanel({
  member,
  onClose,
}: {
  member: DisplayMember;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<JourneyEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMemberJourneyRecords(member.name, member.name_normalized).then(
      ([intros, signups, holds, cancellations]) => {
        if (!cancelled) {
          setEvents(
            buildJourneyEvents(
              (intros.data ?? []) as Intro[],
              (signups.data ?? []) as Signup[],
              (holds.data ?? []) as Hold[],
              (cancellations.data ?? []) as Cancellation[]
            )
          );
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [member.name, member.name_normalized]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-journey-title"
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 id="member-journey-title" className="font-semibold text-gray-900">
              {member.name}
            </h2>
            <p className="text-xs text-gray-500">
              {member.membership_type || 'No plan'} - {member.derivedStatus}
              {member.derivedStatus === 'Expired' && (
                <InfoTip label="Their membership reached its end date without being renewed, and no cancellation was ever recorded. The roster counts them alongside Alumni; the distinction is only shown here." />
              )}
              {member.join_date ? ` - Since ${member.join_date}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5">
          {events === null ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500">No records found for this member.</p>
          ) : (
            <div className="border-l-2 border-gray-200 pl-4 space-y-4">
              {events.map((event) => (
                <div key={`${event.date}-${event.label}`} className="relative">
                  <div
                    className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${event.color} border-2 border-white`}
                  />
                  <p className="text-[10px] text-gray-400">{event.date}</p>
                  <p className="text-sm font-medium text-gray-800">{event.label}</p>
                  {event.sublabel && <p className="text-xs text-gray-500">{event.sublabel}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
