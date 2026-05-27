// Tests for groupForecastDays (task 11.7)
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { groupForecastDays } from '../weather.js';

// Build 10 mock periods: alternating daytime/nighttime
// Daytime temps: 80, 82, 85, 78, 76  (indices 0,2,4,6,8)
// Nighttime temps: 60, 58, 55, 52, 50 (indices 1,3,5,7,9)
function makePeriods() {
  const temps = [80, 60, 82, 58, 85, 55, 78, 52, 76, 50];
  return temps.map((temp, i) => ({
    isDaytime: i % 2 === 0,
    temperatureF: temp,
    startTime: '2024-01-15T06:00:00-06:00',
    shortForecast: 'Sunny',
    icon: '☀',
  }));
}

describe('groupForecastDays', () => {
  it('returns an array of exactly 5 days from 10 periods', () => {
    const days = groupForecastDays(makePeriods());
    expect(days).toHaveLength(5);
  });

  it('first day has highF === 80 and lowF === 60', () => {
    const days = groupForecastDays(makePeriods());
    expect(days[0].highF).toBe(80);
    expect(days[0].lowF).toBe(60);
  });

  it('second day has highF === 82 and lowF === 58', () => {
    const days = groupForecastDays(makePeriods());
    expect(days[1].highF).toBe(82);
    expect(days[1].lowF).toBe(58);
  });

  it('each day has a non-null date, description, and icon', () => {
    const days = groupForecastDays(makePeriods());
    for (const day of days) {
      expect(day.date).toBeTruthy();
      expect(day.description).toBeTruthy();
      expect(day.icon).toBeTruthy();
    }
  });
});
