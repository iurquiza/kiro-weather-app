// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { geocodeCity, getPoint, getLatestObservation, getForecast, handleSubmit } from '../weather.js';

// ---------------------------------------------------------------------------
// Test data constants
// ---------------------------------------------------------------------------

const NOMINATIM_RESPONSE = [
  { lat: '30.2672', lon: '-97.7431', address: { city: 'Austin', state: 'Texas' } },
];

const NWS_POINT_RESPONSE = {
  properties: {
    forecast: 'https://api.weather.gov/gridpoints/EWX/68,91/forecast',
    observationStations: 'https://api.weather.gov/gridpoints/EWX/68,91/stations',
    relativeLocation: { properties: { city: 'Austin', state: 'TX' } },
  },
};

const STATIONS_RESPONSE = {
  features: [{ properties: { stationIdentifier: 'KAUS' } }],
};

const OBSERVATION_RESPONSE = {
  properties: {
    temperature: { value: 25 },
    textDescription: 'Sunny',
    windSpeed: { value: 16.09 },
    windDirection: { value: 180 },
    relativeHumidity: { value: 60 },
  },
};

const FORECAST_PERIODS = Array.from({ length: 10 }, (_, i) => ({
  name: i % 2 === 0 ? 'Monday' : 'Monday Night',
  startTime: '2024-01-15T06:00:00-06:00',
  isDaytime: i % 2 === 0,
  temperature: i % 2 === 0 ? 75 : 55,
  shortForecast: 'Sunny',
  icon: '☀',
}));

const FORECAST_RESPONSE = { properties: { periods: FORECAST_PERIODS } };

// ---------------------------------------------------------------------------
// Helper: create a mock Response-like object
// ---------------------------------------------------------------------------

function mockResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.innerHTML = `
    <input id="city-input" type="text" />
    <button id="submit-btn" type="button">Get Weather</button>
    <div id="loading-indicator" style="display:none">Loading...</div>
    <div id="error-region"></div>
    <div id="weather-display">
      <div id="current-conditions"></div>
      <div id="forecast-container"></div>
    </div>
  `;
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 13.1 — Happy path: full pipeline renders Weather_Display correctly
// ---------------------------------------------------------------------------

describe('13.1 Happy path', () => {
  it('geocoding → NWS point → observation + forecast → full Weather_Display rendered correctly', async () => {
    // fetch call order: Nominatim → NWS point → stations → observation → forecast
    fetch
      .mockReturnValueOnce(mockResponse(NOMINATIM_RESPONSE))
      .mockReturnValueOnce(mockResponse(NWS_POINT_RESPONSE))
      .mockReturnValueOnce(mockResponse(STATIONS_RESPONSE))
      .mockReturnValueOnce(mockResponse(OBSERVATION_RESPONSE))
      .mockReturnValueOnce(mockResponse(FORECAST_RESPONSE));

    // Set the city input value and trigger the full submit flow
    document.getElementById('city-input').value = 'Austin';
    await handleSubmit();

    // --- Current conditions ---
    const currentEl = document.getElementById('current-conditions');
    const currentHTML = currentEl.innerHTML;

    // City name rendered
    expect(currentHTML).toContain('Austin');

    // Temperature: 25°C → 77°F
    expect(currentHTML).toContain('77°F');

    // Description
    expect(currentHTML).toContain('Sunny');

    // Wind: 16.09 km/h → 10 mph, 180° → S
    expect(currentHTML).toContain('10 mph');
    expect(currentHTML).toContain('S');

    // Humidity: 60%
    expect(currentHTML).toContain('60%');

    // Weather icon for "Sunny" → ☀
    expect(currentHTML).toContain('☀');

    // --- Forecast table ---
    const forecastEl = document.getElementById('forecast-container');
    const forecastHTML = forecastEl.innerHTML;

    // Table structure present
    expect(forecastEl.querySelector('table')).not.toBeNull();
    expect(forecastEl.querySelectorAll('tbody tr')).toHaveLength(5);

    // Each row has high and low temperatures
    const rows = forecastEl.querySelectorAll('tbody tr');
    rows.forEach(row => {
      expect(row.innerHTML).toContain('°F');
    });

    // No error shown in #error-region
    expect(document.getElementById('error-region').textContent).toBe('');

    // Loading indicator hidden after completion
    expect(document.getElementById('loading-indicator').style.display).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// 13.2 — Geocoding zero results → GeocodingError
// ---------------------------------------------------------------------------

describe('13.2 Geocoding zero results', () => {
  it('throws GeocodingError with "not found" message when Nominatim returns empty array', async () => {
    fetch.mockReturnValueOnce(mockResponse([]));

    await expect(geocodeCity('Xyzzy')).rejects.toThrow(/not found/i);
  });

  it('error message does not contain raw HTTP status codes', async () => {
    fetch.mockReturnValueOnce(mockResponse([]));

    let errorMessage = '';
    try {
      await geocodeCity('Xyzzy');
    } catch (err) {
      errorMessage = err.message;
    }

    expect(errorMessage).not.toMatch(/\b[45]\d{2}\b/);
  });
});

// ---------------------------------------------------------------------------
// 13.3 — NWS point returns HTTP 500 → NWSError
// ---------------------------------------------------------------------------

describe('13.3 NWS point HTTP 500', () => {
  it('throws NWSError with "unavailable" message when NWS /points returns 500', async () => {
    fetch
      .mockReturnValueOnce(mockResponse(NOMINATIM_RESPONSE))
      .mockReturnValueOnce(mockResponse({}, 500));

    const geo = await geocodeCity('Austin');
    await expect(getPoint(geo.lat, geo.lon)).rejects.toThrow(/unavailable/i);
  });
});

// ---------------------------------------------------------------------------
// 13.4 — Empty observation station list → NWSError
// ---------------------------------------------------------------------------

describe('13.4 Empty observation station list', () => {
  it('throws NWSError with "No observation stations" when features array is empty', async () => {
    fetch.mockReturnValueOnce(mockResponse({ features: [] }));

    await expect(
      getLatestObservation('https://api.weather.gov/gridpoints/EWX/68,91/stations')
    ).rejects.toThrow(/No observation stations/i);
  });
});

// ---------------------------------------------------------------------------
// 13.5 — Forecast fails, observation succeeds
// ---------------------------------------------------------------------------

describe('13.5 Forecast fails, observation succeeds', () => {
  it('observation is fulfilled and forecast is rejected independently', async () => {
    fetch
      .mockReturnValueOnce(mockResponse(NOMINATIM_RESPONSE))
      .mockReturnValueOnce(mockResponse(NWS_POINT_RESPONSE))
      .mockReturnValueOnce(mockResponse(STATIONS_RESPONSE))
      .mockReturnValueOnce(mockResponse(OBSERVATION_RESPONSE))
      .mockReturnValueOnce(mockResponse({}, 500));

    const geo = await geocodeCity('Austin');
    const point = await getPoint(geo.lat, geo.lon);

    const [obsResult, forecastResult] = await Promise.allSettled([
      getLatestObservation(point.observationStationsUrl),
      getForecast(point.forecastUrl),
    ]);

    expect(obsResult.status).toBe('fulfilled');
    expect(obsResult.value.temperatureF).toBe(77);

    expect(forecastResult.status).toBe('rejected');
    expect(forecastResult.reason.message).toMatch(/unavailable/i);
  });
});

// ---------------------------------------------------------------------------
// 13.6 — Timeout on geocoding fetch → TimeoutError
// ---------------------------------------------------------------------------

describe('13.6 Timeout on geocoding fetch', () => {
  it('throws TimeoutError when fetch rejects with a DOMException AbortError', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    fetch.mockReturnValueOnce(Promise.reject(abortError));

    await expect(geocodeCity('Austin')).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
