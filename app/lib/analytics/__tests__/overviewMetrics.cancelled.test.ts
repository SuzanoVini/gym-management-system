import type { Intro } from '@/types';
import { computeCoreMetrics, computeFunnelData } from '../overviewMetrics';

const intro = (name: string, extra: Partial<Intro> = {}) => ({ id: name, name, ...extra }) as Intro;

describe('cancelled intros in overview metrics', () => {
  it('counts cancellations and leaves them out of the attendance denominator', () => {
    const metrics = computeCoreMetrics({
      intros: [
        intro('a', { attended: 'Yes' }),
        intro('b', { attended: 'No' }),
        intro('c', { status: 'Cancelled' }),
        intro('d', { status: 'Cancelled' }),
      ],
      signups: [],
      cancellations: [],
    });
    expect(metrics.totalIntros).toBe(4);
    expect(metrics.cancelledIntros).toBe(2);

    const [booked, attended] = computeFunnelData(metrics);
    expect(booked).toMatchObject({ stage: 'Intros not cancelled', count: 2 });
    expect(attended?.countLabel).toBe('1 (50%)');
  });
});
