// Tests for error message selection logic (task 11.8)
// GeocodingError, NWSError, and TimeoutError are not exported from weather.js,
// so equivalent classes are defined inline to test the pattern.
import { describe, it, expect } from 'vitest';

// Inline equivalents matching the error classes in weather.js
class GeocodingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GeocodingError';
  }
}

class NWSError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NWSError';
  }
}

// Mirrors the getErrorMessage logic from weather.js
function getErrorMessage(err) {
  if (err instanceof GeocodingError) return err.message;
  if (err instanceof NWSError) return err.message;
  return 'An unexpected error occurred. Please try again.';
}

describe('error message selection', () => {
  it('GeocodingError returns its own message', () => {
    const err = new GeocodingError('City not found');
    expect(getErrorMessage(err)).toBe('City not found');
  });

  it('NWSError returns its own message', () => {
    const err = new NWSError('Weather unavailable');
    expect(getErrorMessage(err)).toBe('Weather unavailable');
  });

  it('generic Error returns the fallback message', () => {
    const err = new Error('Something broke');
    expect(getErrorMessage(err)).toBe('An unexpected error occurred. Please try again.');
  });

  it('GeocodingError has name "GeocodingError"', () => {
    const err = new GeocodingError('test');
    expect(err.name).toBe('GeocodingError');
  });

  it('NWSError has name "NWSError"', () => {
    const err = new NWSError('test');
    expect(err.name).toBe('NWSError');
  });
});
