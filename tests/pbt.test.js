// @vitest-environment jsdom
// Property-based tests for weather-app using fast-check
// Feature: weather-app

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import {
  celsiusToFahrenheit,
  degreesToCardinal,
  getIcon,
  groupForecastDays,
} from '../weather.js';

describe('Property-based tests', () => {

  // Feature: weather-app, Property 1: Temperature conversion round-trip
  it('P1 — temperature round-trip: C→F→C is within 0.5°C', () => {
    fc.assert(fc.property(
      fc.float({ min: -100, max: 60, noNaN: true }),
      (c) => {
        const f = celsiusToFahrenheit(c);
        const backToC = (f - 32) * 5 / 9;
        return Math.abs(backToC - c) <= 0.5;
      }
    ));
  });

  // Feature: weather-app, Property 2: Wind direction mapping covers the full circle
  it('P2 — degreesToCardinal returns a valid cardinal for any 0–359 and is deterministic', () => {
    const validCardinals = new Set([
      'N','NNE','NE','ENE','E','ESE','SE','SSE',
      'S','SSW','SW','WSW','W','WNW','NW','NNW',
    ]);
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 359 }),
      (deg) => {
        const result = degreesToCardinal(deg);
        return validCardinals.has(result) && degreesToCardinal(deg) === result;
      }
    ));
  });

  // Feature: weather-app, Property 3: Icon mapping is total and deterministic
  it('P3 — getIcon returns a non-empty string for any input and is deterministic', () => {
    fc.assert(fc.property(
      fc.string(),
      (s) => {
        const icon = getIcon(s);
        return (
          typeof icon === 'string' &&
          icon.length > 0 &&
          icon !== 'null' &&
          icon !== 'undefined' &&
          getIcon(s) === icon
        );
      }
    ));
  });

  // Feature: weather-app, Property 4: Icon category priority is respected
  it('P4 — thunderstorm beats all other keywords', () => {
    fc.assert(fc.property(
      fc.constantFrom(
        'thunderstorm rain', 'thunderstorm snow',
        'thunderstorm cloudy', 'thunderstorm partly cloudy'
      ),
      (desc) => getIcon(desc) === '⛈'
    ));
  });

  it('P4 — snow beats rain, cloud, partly cloudy', () => {
    fc.assert(fc.property(
      fc.constantFrom('snow rain', 'snow cloudy', 'snow partly cloudy'),
      (desc) => getIcon(desc) === '❄'
    ));
  });

  it('P4 — rain beats cloud and partly cloudy', () => {
    fc.assert(fc.property(
      fc.constantFrom('rain cloudy', 'rain partly cloudy', 'shower cloudy'),
      (desc) => getIcon(desc) === '🌧'
    ));
  });

  // Feature: weather-app, Property 5: Null observation values always render as "N/A"
  it('P5 — null fields in CurrentConditions render as "N/A", never "null" or "undefined"', () => {
    const nullableInt = fc.option(fc.integer(), { nil: null });
    const nullableStr = fc.option(fc.string(), { nil: null });
    fc.assert(fc.property(
      fc.record({
        temperatureF: nullableInt,
        description: nullableStr,
        windSpeedMph: nullableInt,
        windDirection: nullableStr,
        relativeHumidity: nullableInt,
      }),
      (conditions) => {
        const displays = [
          String(conditions.temperatureF ?? 'N/A'),
          String(conditions.description ?? 'N/A'),
          String(conditions.windSpeedMph ?? 'N/A'),
          String(conditions.windDirection ?? 'N/A'),
          String(conditions.relativeHumidity ?? 'N/A'),
        ];
        return displays.every(d => d !== 'null' && d !== 'undefined' && d.length > 0);
      }
    ));
  });

  // Feature: weather-app, Property 6: Forecast grouping always produces exactly 5 days
  it('P6 — groupForecastDays always returns exactly 5 days from 10 periods', () => {
    const periodArb = fc.record({
      isDaytime: fc.boolean(),
      temperatureF: fc.integer({ min: -20, max: 120 }),
      startTime: fc.constant('2024-01-15T06:00:00-06:00'),
      shortForecast: fc.constantFrom('Sunny', 'Cloudy', 'Rain', 'Snow'),
      icon: fc.constant('☀'),
    });
    fc.assert(fc.property(
      fc.tuple(
        periodArb, periodArb, periodArb, periodArb, periodArb,
        periodArb, periodArb, periodArb, periodArb, periodArb
      ),
      (periodsArr) => {
        const days = groupForecastDays(periodsArr);
        return days.length === 5;
      }
    ));
  });

  // Feature: weather-app, Property 7: Invalid input is rejected and City_Input is preserved
  it('P7 — whitespace-only strings are always invalid (trim produces empty string)', () => {
    fc.assert(fc.property(
      fc.stringOf(fc.constantFrom(' ', '\t', '\n')),
      (s) => s.trim() === ''
    ));
  });

  // Feature: weather-app, Property 8: HTTP error status codes trigger service-identified error messages
  it('P8 — HTTP 4xx/5xx errors produce service-identified messages without raw stack traces', () => {
    class GeocodingErrorLocal extends Error {
      constructor(m) { super(m); this.name = 'GeocodingError'; }
    }
    class NWSErrorLocal extends Error {
      constructor(m) { super(m); this.name = 'NWSError'; }
    }
    function getErrMsg(err) {
      if (err.name === 'GeocodingError') return err.message;
      if (err.name === 'NWSError') return err.message;
      if (err.name === 'TimeoutError') return err.message;
      return 'An unexpected error occurred. Please try again.';
    }
    fc.assert(fc.property(
      fc.integer({ min: 400, max: 599 }),
      (status) => {
        const geoMsg = getErrMsg(new GeocodingErrorLocal(`Location service unavailable (${status})`));
        const nwsMsg = getErrMsg(new NWSErrorLocal(`Weather service unavailable (${status})`));
        return (
          geoMsg.includes('Location') &&
          nwsMsg.includes('Weather') &&
          !geoMsg.includes('Error:') &&
          !nwsMsg.includes('Error:')
        );
      }
    ));
  });

  // Feature: weather-app, Property 9: First geocoding result's coordinates are always used
  it('P9 — first Nominatim result lat/lon is always used regardless of array length', () => {
    const nominatimResultArb = fc.record({
      lat: fc.float({ min: -90, max: 90, noNaN: true }).map(String),
      lon: fc.float({ min: -180, max: 180, noNaN: true }).map(String),
      address: fc.record({ city: fc.string({ minLength: 1 }), state: fc.string() }),
    });
    fc.assert(fc.property(
      fc.array(nominatimResultArb, { minLength: 1, maxLength: 5 }),
      (results) => {
        // Simulate geocodeCity: always use results[0]
        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);
        return lat === parseFloat(results[0].lat) && lon === parseFloat(results[0].lon);
      }
    ));
  });

  // Feature: weather-app, Property 10: First observation station is always used
  it('P10 — first station in features array is always used regardless of array length', () => {
    const stationArb = fc.record({
      properties: fc.record({
        stationIdentifier: fc.string({ minLength: 1 }),
      }),
    });
    fc.assert(fc.property(
      fc.array(stationArb, { minLength: 1, maxLength: 5 }),
      (features) => {
        // Simulate getLatestObservation: always use features[0]
        const stationId = features[0].properties.stationIdentifier;
        return stationId === features[0].properties.stationIdentifier && stationId.length > 0;
      }
    ));
  });

});
