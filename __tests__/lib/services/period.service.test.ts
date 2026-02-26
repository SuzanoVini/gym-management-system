// __tests__/lib/services/period.service.test.ts

import { calculateCurrentPeriod } from '@/lib/services/period.service';

describe('Period Service', () => {
  describe('calculateCurrentPeriod', () => {
    it('should calculate period 1 (1st-15th) for dates in first half of month', () => {
      // Jan 4, 2026 should be in first period
      const result = calculateCurrentPeriod(new Date(2026, 0, 4)); // month is 0-indexed

      expect(result.startDate).toBe('2026-01-01');
      expect(result.endDate).toBe('2026-01-15');
    });

    it('should calculate period 1 (1st-15th) for date on 15th', () => {
      // Feb 15, 2026 should be in first period
      const result = calculateCurrentPeriod(new Date(2026, 1, 15)); // month is 0-indexed

      expect(result.startDate).toBe('2026-02-01');
      expect(result.endDate).toBe('2026-02-15');
    });

    it('should calculate period 2 (16th-end) for dates in second half of month', () => {
      // Jan 24, 2026 should be in second period
      const result = calculateCurrentPeriod(new Date(2026, 0, 24)); // month is 0-indexed

      expect(result.startDate).toBe('2026-01-16');
      expect(result.endDate).toBe('2026-01-31');
    });

    it('should calculate period 2 (16th-end) for date on 16th', () => {
      // Feb 16, 2026 should be in second period
      const result = calculateCurrentPeriod(new Date(2026, 1, 16)); // month is 0-indexed

      expect(result.startDate).toBe('2026-02-16');
      expect(result.endDate).toBe('2026-02-28');
    });

    it('should handle leap year correctly', () => {
      // Feb 20, 2024 (leap year) should be in second period
      const result = calculateCurrentPeriod(new Date(2024, 1, 20)); // month is 0-indexed

      expect(result.startDate).toBe('2024-02-16');
      expect(result.endDate).toBe('2024-02-29'); // Leap year has 29 days
    });

    it('should handle different month lengths correctly', () => {
      // Test 31-day month (January)
      const jan = calculateCurrentPeriod(new Date(2026, 0, 20)); // month is 0-indexed
      expect(jan.endDate).toBe('2026-01-31');

      // Test 30-day month (April)
      const apr = calculateCurrentPeriod(new Date(2026, 3, 20)); // month is 0-indexed
      expect(apr.endDate).toBe('2026-04-30');

      // Test 28-day month (February, non-leap year)
      const feb = calculateCurrentPeriod(new Date(2026, 1, 20)); // month is 0-indexed
      expect(feb.endDate).toBe('2026-02-28');
    });

    it('should use current date when no date provided', () => {
      const result = calculateCurrentPeriod();

      // Should return valid dates
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Start date should be before end date
      expect(new Date(result.startDate).getTime()).toBeLessThan(new Date(result.endDate).getTime());
    });

    it('should match examples from requirements', () => {
      // Today = Jan 24, 2026 → Period: Jan 16 - Jan 31, 2026
      const jan24 = calculateCurrentPeriod(new Date(2026, 0, 24)); // month is 0-indexed
      expect(jan24.startDate).toBe('2026-01-16');
      expect(jan24.endDate).toBe('2026-01-31');

      // Today = Feb 4, 2026 → Period: Feb 1 - Feb 15, 2026
      const feb4 = calculateCurrentPeriod(new Date(2026, 1, 4)); // month is 0-indexed
      expect(feb4.startDate).toBe('2026-02-01');
      expect(feb4.endDate).toBe('2026-02-15');

      // Today = Feb 20, 2026 → Period: Feb 16 - Feb 28, 2026
      const feb20 = calculateCurrentPeriod(new Date(2026, 1, 20)); // month is 0-indexed
      expect(feb20.startDate).toBe('2026-02-16');
      expect(feb20.endDate).toBe('2026-02-28');
    });
  });
});
