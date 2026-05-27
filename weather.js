// weather.js — Main ES module for the weather app
export { degreesToCardinal, celsiusToFahrenheit, kmhToMph, getIcon, geocodeCity, getPoint, getLatestObservation, getForecast, groupForecastDays, handleSubmit };

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

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

// ---------------------------------------------------------------------------
// fetchWithTimeout — fetch with AbortController-based timeout
// ---------------------------------------------------------------------------

/**
 * Fetches a URL with a timeout. Throws TimeoutError if the request does not
 * complete within timeoutMs milliseconds.
 *
 * @param {string} url
 * @param {number} [timeoutMs=10000]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timerId);
    return response;
  } catch (err) {
    clearTimeout(timerId);
    if (err.name === 'AbortError') {
      throw new TimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// degreesToCardinal — map wind direction degrees (0–359) to 16-point cardinal
// ---------------------------------------------------------------------------

/**
 * Converts a wind direction in degrees to one of the 16 standard cardinal
 * abbreviations (N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW,
 * NW, NNW).
 *
 * Algorithm: divide by 22.5 (each sector width), round to nearest integer,
 * mod 16, use as index into the directions array.
 *
 * @param {number} degrees — wind direction in degrees (0–359)
 * @returns {string} — one of the 16 cardinal abbreviations
 */
function degreesToCardinal(degrees) {
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// ---------------------------------------------------------------------------
// celsiusToFahrenheit — convert °C to °F, rounded to a whole number
// ---------------------------------------------------------------------------

/**
 * Converts a temperature in Celsius to Fahrenheit, rounded to the nearest
 * whole number.
 *
 * @param {number} c — temperature in degrees Celsius
 * @returns {number} — temperature in degrees Fahrenheit (integer)
 */
function celsiusToFahrenheit(c) {
  return Math.round((c * 9 / 5) + 32);
}

// ---------------------------------------------------------------------------
// kmhToMph — convert km/h to mph, rounded to a whole number
// ---------------------------------------------------------------------------

/**
 * Converts a wind speed in kilometres per hour to miles per hour, rounded to
 * the nearest whole number.
 *
 * @param {number} kmh — wind speed in km/h
 * @returns {number} — wind speed in mph (integer)
 */
function kmhToMph(kmh) {
  return Math.round(kmh * 0.621371);
}

// ---------------------------------------------------------------------------
// getIcon — map a weather description string to a Unicode weather symbol
// ---------------------------------------------------------------------------

/**
 * Maps a weather description string to a Unicode weather symbol using
 * case-insensitive keyword matching in priority order:
 *   1. thunderstorm → ⛈
 *   2. snow / snowy / blizzard → ❄
 *   3. rain / rainy / shower / drizzle → 🌧
 *   4. cloud / cloudy / overcast → ☁
 *   5. partly cloudy / partly sunny / mostly cloudy → ⛅
 *   6. default (sunny / clear / anything else) → ☀
 *
 * Note: "partly cloudy" is checked BEFORE "cloud" because it contains "cloud".
 * Always returns a non-empty string — never null, undefined, or empty.
 *
 * @param {string} description — weather condition description
 * @returns {string} — Unicode weather symbol
 */
function getIcon(description) {
  const lower = (description || '').toLowerCase();

  if (lower.includes('thunderstorm')) return '⛈';
  if (lower.includes('snow') || lower.includes('snowy') || lower.includes('blizzard')) return '❄';
  if (lower.includes('rain') || lower.includes('rainy') || lower.includes('shower') || lower.includes('drizzle')) return '🌧';
  if (lower.includes('partly cloudy') || lower.includes('partly sunny') || lower.includes('mostly cloudy')) return '⛅';
  if (lower.includes('cloud') || lower.includes('cloudy') || lower.includes('overcast')) return '☁';

  return '☀';
}

// ---------------------------------------------------------------------------
// GeocodingService — resolve a city name to lat/lon via Nominatim (OpenStreetMap)
// ---------------------------------------------------------------------------

/**
 * Resolves a U.S. city name (optionally "City, ST") to geographic coordinates
 * using the Nominatim geocoding API (OpenStreetMap). Nominatim supports CORS
 * from browsers and requires no API key.
 *
 * @param {string} cityName — city name, optionally in "City, ST" format
 * @returns {Promise<{ lat: number, lon: number, city: string, state: string }>}
 * @throws {GeocodingError} when the city is not found or the service returns an HTTP error
 * @throws {TimeoutError} when the request times out (propagated from fetchWithTimeout)
 */
async function geocodeCity(cityName) {
  // Build the search query — pass the full input directly so Nominatim handles
  // both "Austin" and "Austin, TX" formats naturally.
  const query = cityName.trim();

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=us&format=json&addressdetails=1&limit=1`;

  // TimeoutError propagates naturally to the caller.
  const response = await fetchWithTimeout(url, 10000);

  if (!response.ok) {
    throw new GeocodingError('Location service is unavailable. Please try again later.');
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new GeocodingError("City not found. Check the spelling and try again, e.g. 'Austin, TX'.");
  }

  const result = data[0];
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);

  // Extract city and state from the address details
  const addr = result.address || {};
  const city = addr.city || addr.town || addr.village || addr.county || query;
  const state = addr.state || '';

  return { lat, lon, city, state };
}

// ---------------------------------------------------------------------------
// NWSService — fetch NWS grid metadata from /points/{lat},{lon}
// ---------------------------------------------------------------------------

/**
 * Fetches NWS grid metadata for the given coordinates.
 *
 * @param {number} lat — latitude
 * @param {number} lon — longitude
 * @returns {Promise<{ forecastUrl: string, observationStationsUrl: string, city: string, state: string }>}
 * @throws {NWSError} when the NWS API returns a non-200 HTTP status
 * @throws {TimeoutError} when the request times out (propagated from fetchWithTimeout)
 */
async function getPoint(lat, lon) {
  const url = `https://api.weather.gov/points/${lat},${lon}`;

  // TimeoutError propagates naturally — not caught here (task 6.4)
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new NWSError('Weather data is unavailable for this location.');
  }

  const data = await response.json();
  const props = data.properties;

  const forecastUrl = props.forecast;
  const observationStationsUrl = props.observationStations;
  const city = props.relativeLocation.properties.city;
  const state = props.relativeLocation.properties.state;

  return { forecastUrl, observationStationsUrl, city, state };
}

// ---------------------------------------------------------------------------
// ObservationService — fetch the latest observation from the nearest NWS station
// ---------------------------------------------------------------------------

/**
 * Fetches the latest weather observation for the nearest station.
 *
 * @param {string} observationStationsUrl — URL from NWS /points response
 * @returns {Promise<CurrentConditions>}
 * @throws {NWSError} when the station list is unavailable, empty, or the observation fetch fails
 * @throws {TimeoutError} when either request times out (propagated from fetchWithTimeout)
 */
async function getLatestObservation(observationStationsUrl) {
  // Step 1: Fetch the list of observation stations
  const stationsResponse = await fetchWithTimeout(observationStationsUrl);
  if (!stationsResponse.ok) {
    throw new NWSError('Weather data is unavailable for this location.');
  }

  const stationsData = await stationsResponse.json();
  const features = stationsData.features;

  if (!features || features.length === 0) {
    throw new NWSError('No observation stations are available for this location.');
  }

  const stationId = features[0].properties.stationIdentifier;

  // Step 2: Fetch the latest observation for that station
  const obsUrl = `https://api.weather.gov/stations/${stationId}/observations/latest`;
  const obsResponse = await fetchWithTimeout(obsUrl);
  if (!obsResponse.ok) {
    throw new NWSError('Weather data is unavailable for this location.');
  }

  const obsData = await obsResponse.json();
  const props = obsData.properties;

  // Step 3: Build and return a CurrentConditions object
  return {
    temperatureF: props.temperature.value != null ? celsiusToFahrenheit(props.temperature.value) : null,
    description: props.textDescription || null,
    windSpeedMph: props.windSpeed.value != null ? kmhToMph(props.windSpeed.value) : null,
    windDirection: props.windDirection.value != null ? degreesToCardinal(props.windDirection.value) : null,
    relativeHumidity: props.relativeHumidity.value != null ? Math.round(props.relativeHumidity.value) : null,
  };
}

// ---------------------------------------------------------------------------
// ForecastService — fetch the NWS 7-day forecast and return the first 10 periods
// ---------------------------------------------------------------------------

/**
 * Fetches the NWS forecast and returns the first 10 periods as ForecastPeriod objects.
 *
 * @param {string} forecastUrl — forecast URL from NWS /points response
 * @returns {Promise<ForecastPeriod[]>} — array of up to 10 forecast periods
 * @throws {NWSError} when the forecast fetch returns a non-200 HTTP status
 * @throws {TimeoutError} when the request times out (propagated from fetchWithTimeout)
 */
async function getForecast(forecastUrl) {
  const response = await fetchWithTimeout(forecastUrl);
  if (!response.ok) {
    throw new NWSError('Weather data is unavailable for this location.');
  }

  const data = await response.json();
  const periods = data.properties.periods.slice(0, 10);

  return periods.map(period => ({
    name: period.name,
    startTime: period.startTime,
    isDaytime: period.isDaytime,
    temperatureF: period.temperature,
    shortForecast: period.shortForecast,
    icon: getIcon(period.shortForecast),
  }));
}

// ---------------------------------------------------------------------------
// groupForecastDays — pair alternating daytime/nighttime periods into ForecastDay objects
// ---------------------------------------------------------------------------

/**
 * Groups an array of 10 alternating daytime/nighttime ForecastPeriod objects
 * into exactly 5 ForecastDay objects (one per day).
 *
 * Input layout: indices 0,2,4,6,8 = daytime; indices 1,3,5,7,9 = nighttime.
 *
 * @param {ForecastPeriod[]} periods — array of exactly 10 ForecastPeriod objects
 * @returns {ForecastDay[]} — array of exactly 5 ForecastDay objects
 */
function groupForecastDays(periods) {
  const days = [];
  for (let i = 0; i < 5; i++) {
    const daytime = periods[i * 2];
    const nighttime = periods[i * 2 + 1];
    days.push({
      date: new Date(daytime.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      highF: daytime.temperatureF,
      lowF: nighttime.temperatureF,
      description: daytime.shortForecast,
      icon: daytime.icon,
    });
  }
  return days;
}

// ---------------------------------------------------------------------------
// UIController — orchestrates the full lookup flow and manages DOM state
// ---------------------------------------------------------------------------

/**
 * Maps an error to a user-friendly message, hiding raw status codes and stack traces.
 *
 * @param {Error} err
 * @returns {string}
 */
function getErrorMessage(err) {
  if (err instanceof GeocodingError) return err.message;
  if (err instanceof NWSError) return err.message;
  if (err instanceof TimeoutError) return err.message;
  return 'An unexpected error occurred. Please try again.';
}

// 10.1 — Loading state helpers

/**
 * Shows the loading indicator and disables the submit button.
 */
function showLoading() {
  document.getElementById('loading-indicator').style.display = 'block';
  document.getElementById('submit-btn').disabled = true;
}

/**
 * Hides the loading indicator and re-enables the submit button.
 */
function hideLoading() {
  document.getElementById('loading-indicator').style.display = 'none';
  document.getElementById('submit-btn').disabled = false;
}

// 10.2 — Error display helpers

/**
 * Displays a user-friendly error message in the dedicated error region.
 *
 * @param {string} message
 */
function showError(message) {
  document.getElementById('error-region').textContent = message;
}

/**
 * Clears any previously displayed error message.
 */
function clearError() {
  document.getElementById('error-region').textContent = '';
}

// 10.3 — Display clear helper

/**
 * Clears the current conditions and forecast container elements.
 */
function clearDisplay() {
  document.getElementById('current-conditions').innerHTML = '';
  document.getElementById('forecast-container').innerHTML = '';
}

// 10.4 — Render current conditions

/**
 * Renders the current weather conditions into #current-conditions.
 * Any null field is displayed as "N/A".
 *
 * @param {CurrentConditions} conditions
 * @param {string} cityName — resolved city + state string (e.g. "Austin, TX")
 */
function renderCurrentConditions(conditions, cityName) {
  const tempDisplay = (conditions.temperatureF ?? 'N/A') + '°F';
  const descDisplay = conditions.description ?? 'N/A';
  const windDisplay = (conditions.windSpeedMph ?? 'N/A') + ' mph ' + (conditions.windDirection ?? 'N/A');
  const humidityDisplay = (conditions.relativeHumidity ?? 'N/A') + '%';
  const iconDisplay = getIcon(conditions.description || '');

  document.getElementById('current-conditions').innerHTML = `
    <p><strong>${cityName}</strong></p>
    <p>Temperature: ${tempDisplay}</p>
    <p>Description: ${descDisplay}</p>
    <p>Wind: ${windDisplay}</p>
    <p>Humidity: ${humidityDisplay}</p>
    <p>Conditions: ${iconDisplay}</p>
  `;
}

// 10.5 — Render forecast table

/**
 * Renders a 5-day forecast table into #forecast-container.
 *
 * @param {ForecastPeriod[]} periods — array of 10 alternating day/night periods
 */
function renderForecast(periods) {
  const days = groupForecastDays(periods);

  const rows = days.map(day => `
    <tr>
      <td>${day.date}</td>
      <td>${day.highF}°F</td>
      <td>${day.lowF}°F</td>
      <td>${day.description}</td>
      <td>${day.icon}</td>
    </tr>
  `).join('');

  document.getElementById('forecast-container').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>High (°F)</th>
          <th>Low (°F)</th>
          <th>Description</th>
          <th>Icon</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// 10.6 — Main submit handler

/**
 * Handles the weather lookup flow when the user submits a city name.
 * Uses Promise.allSettled so a forecast failure does not suppress current conditions.
 */
async function handleSubmit() {
  const cityInput = document.getElementById('city-input');

  // Validate: reject empty or whitespace-only input, preserve the field value
  if (!cityInput.value || !cityInput.value.trim()) {
    showError('Please enter a city name.');
    return;
  }

  clearError();
  clearDisplay();
  showLoading();

  try {
    const geo = await geocodeCity(cityInput.value.trim());
    const point = await getPoint(geo.lat, geo.lon);

    const [obsResult, forecastResult] = await Promise.allSettled([
      getLatestObservation(point.observationStationsUrl),
      getForecast(point.forecastUrl),
    ]);

    // 10.4 / 10.8 — current conditions (independent of forecast)
    if (obsResult.status === 'fulfilled') {
      renderCurrentConditions(obsResult.value, geo.city + ', ' + geo.state);
    } else {
      showError(getErrorMessage(obsResult.reason));
    }

    // 10.5 / 10.8 — forecast (failure shown only in forecast area)
    if (forecastResult.status === 'fulfilled') {
      renderForecast(forecastResult.value);
    } else {
      document.getElementById('forecast-container').innerHTML =
        `<p class="forecast-error">${getErrorMessage(forecastResult.reason)}</p>`;
    }
  } catch (err) {
    showError(getErrorMessage(err));
  } finally {
    hideLoading();
  }
}

// 10.7 — Attach event listeners

document.getElementById('submit-btn').addEventListener('click', handleSubmit);
document.getElementById('city-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSubmit();
});
