// Tests for celsiusToFahrenheit and kmhToMph (tasks 11.3 & 11.4)
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { celsiusToFahrenheit, kmhToMph } from '../weather.js';

describe('celsiusToFahrenheit', () => {
  it('converts 0°C to 32°F (freezing point)', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
  });

  it('converts 100°C to 212°F (boiling point)', () => {
    expect(celsiusToFahrenheit(100)).toBe(212);
  });

  it('converts -40°C to -40°F (crossover point)', () => {
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });

  it('converts 37°C to 99°F (body temperature, rounds correctly)', () => {
    // 37 * 9/5 + 32 = 98.6 → rounds to 99
    expect(celsiusToFahrenheit(37)).toBe(99);
  });
});

describe('kmhToMph', () => {
  it('converts 0 km/h to 0 mph', () => {
    expect(kmhToMph(0)).toBe(0);
  });

  it('converts 100 km/h to 62 mph', () => {
    // 100 * 0.621371 = 62.1371 → rounds to 62
    expect(kmhToMph(100)).toBe(62);
  });

  it('converts 160 km/h to 99 mph', () => {
    // 160 * 0.621371 = 99.41936 → rounds to 99
    expect(kmhToMph(160)).toBe(99);
  });
});
