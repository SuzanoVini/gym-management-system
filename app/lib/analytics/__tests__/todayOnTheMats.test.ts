import type { Intro } from '@/types';
import { attendanceCounts, classLengthMinutes, slotStatus, todaysSlots } from '../todayOnTheMats';

const now = new Date(2026, 9, 24, 16, 0);
const intro = (over: Partial<Intro>): Intro =>
  ({
    id: Math.random().toString(),
    name: 'Test Person',
    class: 'GB1',
    staff: 'Coach',
    ...over,
  }) as Intro;
const firstSlot = (rows: Intro[]) => {
  const slot = todaysSlots(rows, now)[0];
  if (!slot) {
    throw new Error('Expected a slot');
  }
  return slot;
};

describe('today on the mats', () => {
  it('groups only today by time and class, counts attendance, and sorts by start time', () => {
    const slots = todaysSlots(
      [
        intro({ date: '2026-10-24', time: '6:00 PM', class: 'GB1', attended: 'Yes' }),
        intro({ date: '2026-10-24', time: '6:00 PM', class: 'GB1' }),
        intro({ date: '2026-10-24', time: '7:00 AM', class: 'Women' }),
        intro({ date: '2026-10-24', time: '12:00 PM', class: 'GB2' }),
        intro({ date: '2026-10-23', time: '6:00 PM', class: 'GB1', attended: 'Yes' }),
      ],
      now
    );
    expect(slots.map((slot) => [slot.time, slot.className, slot.intros.length])).toEqual([
      ['7:00 AM', 'Women', 1],
      ['12:00 PM', 'GB2', 1],
      ['6:00 PM', 'GB1', 2],
    ]);
    const evening = slots[2];
    if (!evening) {
      throw new Error('Expected evening slot');
    }
    expect(attendanceCounts(evening)).toEqual({ came: 1, noShow: 0, notMarked: 1 });
  });

  it('returns no slots on a day with no bookings', () => {
    expect(todaysSlots([intro({ date: '2026-10-01', time: '6:00 PM' })], now)).toEqual([]);
  });

  it.each([
    ['Kids 3-5', 40],
    ['Kids 6-8', 45],
    ['Kids 7-9', 45],
    ['Junior', 50],
    ['Teens', 50],
    ['Kids 9-13', 50],
    ['GB1', 60],
  ])('uses the schedule length for %s', (name, minutes) => {
    expect(classLengthMinutes(name)).toBe(minutes);
  });

  it('recognizes before, during, after and unknown times', () => {
    const slot = firstSlot([intro({ date: '2026-10-24', time: '4:30 PM' })]);
    expect(slotStatus(slot, now).status).toBe('upcoming');
    expect(slotStatus(slot, new Date(2026, 9, 24, 16, 30)).status).toBe('in-progress');
    expect(slotStatus(slot, new Date(2026, 9, 24, 17, 30)).status).toBe('finished');
    expect(slotStatus({ ...slot, time: 'TBD' }, now).status).toBe('unknown');
  });

  it('opens attendance marking 20 minutes before the class starts', () => {
    const slot = firstSlot([intro({ date: '2026-10-24', time: '4:30 PM' })]);
    expect(slotStatus(slot, now).canMark).toBe(false);
    expect(slotStatus(slot, new Date(2026, 9, 24, 16, 9)).canMark).toBe(false);
    expect(slotStatus(slot, new Date(2026, 9, 24, 16, 10)).canMark).toBe(true);
    expect(slotStatus(slot, new Date(2026, 9, 24, 17, 30)).canMark).toBe(true);
    expect(slotStatus({ ...slot, time: 'TBD' }, now).canMark).toBe(true);
  });

  it('counts every finished attendance outcome', () => {
    const slot = firstSlot([
      intro({ date: '2026-10-24', time: '2:00 PM', attended: 'Yes' }),
      intro({ date: '2026-10-24', time: '2:00 PM', attended: 'No' }),
      intro({ date: '2026-10-24', time: '2:00 PM' }),
    ]);
    expect(slotStatus(slot, now).status).toBe('finished');
    expect(attendanceCounts(slot)).toEqual({ came: 1, noShow: 1, notMarked: 1 });
  });
});
