// Tests for degreesToCardinal (task 3.3)
import { describe, it, expect } from 'vitest';
import { degreesToCardinal } from '../weather.js';

describe('degreesToCardinal', () => {
  // Exact centre of each of the 16 sectors
  const sectors = [
    [0,    'N'],
    [22.5, 'NNE'],
    [45,   'NE'],
    [67.5, 'ENE'],
    [90,   'E'],
    [112.5,'ESE'],
    [135,  'SE'],
    [157.5,'SSE'],
    [180,  'S'],
    [202.5,'SSW'],
    [225,  'SW'],
    [247.5,'WSW'],
    [270,  'W'],
    [292.5,'WNW'],
    [315,  'NW'],
    [337.5,'NNW'],
  ];

  it.each(sectors)('%i° → %s (sector centre)', (degrees, expected) => {
    expect(degreesToCardinal(degrees)).toBe(expected);
  });

  it('returns N for 0°', () => {
    expect(degreesToCardinal(0)).toBe('N');
  });

  it('returns N for 359° (wraps back to N)', () => {
    // 359 / 22.5 = 15.96 → rounds to 16 → 16 % 16 = 0 → N
    expect(degreesToCardinal(359)).toBe('N');
  });

  it('returns S for 180°', () => {
    expect(degreesToCardinal(180)).toBe('S');
  });

  it('returns E for 90°', () => {
    expect(degreesToCardinal(90)).toBe('E');
  });

  it('returns W for 270°', () => {
    expect(degreesToCardinal(270)).toBe('W');
  });

  it('always returns one of the 16 valid abbreviations for any degree 0–359', () => {
    const valid = new Set([
      'N', 'NNE', 'NE', 'ENE',
      'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW',
      'W', 'WNW', 'NW', 'NNW',
    ]);
    for (let deg = 0; deg <= 359; deg++) {
      expect(valid.has(degreesToCardinal(deg))).toBe(true);
    }
  });
});
