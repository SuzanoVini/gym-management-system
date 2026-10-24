import type { Intro } from '@/types';
import { todaysSlots } from '../TodayOnTheMats';

const intro = (over: Partial<Intro>): Intro =>
  ({
    id: Math.random().toString(),
    name: 'Test Person',
    class: 'GB1',
    staff: 'Coach',
    ...over,
  }) as Intro;

describe('todaysSlots', () => {
  it('groups only today by time and class, counts attendance, and sorts by start time', () => {
    const rows = [
      intro({ date: '2026-10-24', time: '6:00 PM', class: 'GB1', attended: 'Yes' }),
      intro({ date: '2026-10-24', time: '6:00 PM', class: 'GB1' }),
      intro({ date: '2026-10-24', time: '7:00 AM', class: 'Women' }),
      intro({ date: '2026-10-24', time: '12:00 PM', class: 'GB2' }),
      intro({ date: '2026-10-23', time: '6:00 PM', class: 'GB1', attended: 'Yes' }),
    ];
    expect(todaysSlots(rows, '2026-10-24')).toEqual([
      { time: '7:00 AM', className: 'Women', booked: 1, attended: 0 },
      { time: '12:00 PM', className: 'GB2', booked: 1, attended: 0 },
      { time: '6:00 PM', className: 'GB1', booked: 2, attended: 1 },
    ]);
  });

  it('returns nothing on a day with no bookings', () => {
    expect(todaysSlots([intro({ date: '2026-10-01', time: '6:00 PM' })], '2026-10-24')).toEqual([]);
  });
});
