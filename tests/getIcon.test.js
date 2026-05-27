// Tests for getIcon (task 11.5)
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getIcon } from '../weather.js';

describe('getIcon', () => {
  it('returns ⛈ for "Thunderstorm"', () => {
    expect(getIcon('Thunderstorm')).toBe('⛈');
  });

  it('returns ❄ for "Heavy Snow"', () => {
    expect(getIcon('Heavy Snow')).toBe('❄');
  });

  it('returns ❄ for "Blizzard"', () => {
    expect(getIcon('Blizzard')).toBe('❄');
  });

  it('returns 🌧 for "Rain Showers"', () => {
    expect(getIcon('Rain Showers')).toBe('🌧');
  });

  it('returns 🌧 for "Drizzle"', () => {
    expect(getIcon('Drizzle')).toBe('🌧');
  });

  it('returns ⛅ for "Partly Cloudy"', () => {
    expect(getIcon('Partly Cloudy')).toBe('⛅');
  });

  it('returns ⛅ for "Mostly Cloudy"', () => {
    expect(getIcon('Mostly Cloudy')).toBe('⛅');
  });

  it('returns ☁ for "Cloudy"', () => {
    expect(getIcon('Cloudy')).toBe('☁');
  });

  it('returns ☁ for "Overcast"', () => {
    expect(getIcon('Overcast')).toBe('☁');
  });

  it('returns ☀ for "Sunny"', () => {
    expect(getIcon('Sunny')).toBe('☀');
  });

  it('returns ☀ for empty string (default)', () => {
    expect(getIcon('')).toBe('☀');
  });

  it('is case-insensitive: "THUNDERSTORM" returns ⛈', () => {
    expect(getIcon('THUNDERSTORM')).toBe('⛈');
  });

  it('rain has higher priority than partly cloudy: "partly cloudy with rain" returns 🌧', () => {
    expect(getIcon('partly cloudy with rain')).toBe('🌧');
  });
});
