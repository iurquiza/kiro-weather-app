# Implementation Plan: weather-app

## Overview

This plan implements the weather-app feature in 13 sequential tasks, progressing from project scaffolding through the PowerShell server, HTML/CSS shell, JavaScript service layer, UI controller, and finally unit, property-based, and integration tests. Each task maps directly to one or more requirements and design components.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] },
    { "wave": 4, "tasks": ["4", "5", "6"] },
    { "wave": 5, "tasks": ["7", "8"] },
    { "wave": 6, "tasks": ["9"] },
    { "wave": 7, "tasks": ["10"] },
    { "wave": 8, "tasks": ["11", "12", "13"] }
  ]
}
```

## Tasks

- [x] 1. Set up project structure and PowerShell HTTP server
  - [x] 1.1 Create the project root with `index.html`, `weather.js`, and `server.ps1` files (empty stubs)
  - [x] 1.2 Implement `server.ps1` using `System.Net.HttpListener` to serve static files on `http://localhost:8080`
    - Serve files from the script's own directory
    - Return `index.html` for root requests (`/` and empty path) with HTTP 200
    - Map `.html` → `text/html`, `.js` → `application/javascript`, `.css` → `text/css`, all others → `application/octet-stream`
    - Return HTTP 404 with a plain-text body for missing files and non-root directory paths
    - Print a startup message when the server starts successfully
    - Catch port-in-use errors, print an error message, and exit without starting
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

- [x] 2. Build the HTML shell and UI skeleton
  - [x] 2.1 Add the `City_Input` text field and submit button to `index.html`
  - [x] 2.2 Add a hidden loading indicator element
  - [x] 2.3 Add a dedicated `#error-region` element above the `Weather_Display` section
  - [x] 2.4 Add the `Weather_Display` section with placeholders for the current-conditions card and forecast table
  - [x] 2.5 Add a `<script type="module" src="weather.js">` tag
  - [x] 2.6 Add minimal CSS for layout: error region does not overlap the weather display area
  - **Validates: Requirements 1.1, 3.4, 3.6**

- [x] 3. Implement core utility functions in `weather.js`
  - [x] 3.1 Implement `fetchWithTimeout(url, timeoutMs)` using `fetch` + `AbortController`; throw `TimeoutError` on timeout
  - [x] 3.2 Define custom error classes: `GeocodingError`, `NWSError`, `TimeoutError`
  - [x] 3.3 Implement `degreesToCardinal(degrees)` — map 0–359° to one of the 16 standard cardinal abbreviations
  - [x] 3.4 Implement Celsius-to-Fahrenheit conversion helper: `celsiusToFahrenheit(c)` — returns `(c * 9/5) + 32` rounded to a whole number
  - [x] 3.5 Implement km/h-to-mph conversion helper: `kmhToMph(kmh)` — returns `kmh * 0.621371` rounded to a whole number
  - **Validates: Requirements 1.8, 2.6, 3.1**

- [x] 4. Implement `WeatherIconMapper`
  - [x] 4.1 Implement `getIcon(description)` with case-insensitive keyword matching in priority order: thunderstorm → snow/blizzard → rain/shower/drizzle → cloud/overcast → partly cloudy/partly sunny/mostly cloudy → default (sunny/clear)
  - [x] 4.2 Return an inline SVG or Unicode symbol for each category; never return `null`, `undefined`, or an empty string
  - **Validates: Requirements 3.2**

- [x] 5. Implement `GeocodingService`
  - [x] 5.1 Implement `geocodeCity(cityName)` — parse optional "City, ST" format, call the Census Geocoder API with `fetchWithTimeout`
  - [x] 5.2 Parse `result.addressMatches[0].coordinates` (`x` = lon, `y` = lat) and the display name from `geographies["Incorporated Places"][0].NAME`
  - [x] 5.3 Throw `GeocodingError` with "City not found" message when `addressMatches` is empty
  - [x] 5.4 Throw `GeocodingError` with "Location service is unavailable" message on HTTP 4xx/5xx
  - [x] 5.5 Let `TimeoutError` propagate from `fetchWithTimeout` on timeout
  - **Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8, 4.1, 4.2, 4.3**

- [x] 6. Implement `NWSService`
  - [x] 6.1 Implement `getPoint(lat, lon)` — call `https://api.weather.gov/points/{lat},{lon}` with `fetchWithTimeout`
  - [x] 6.2 Return `{ forecastUrl, observationStationsUrl, city, state }` from `properties`
  - [x] 6.3 Throw `NWSError` with "Weather data is unavailable for this location" on non-200 HTTP status
  - [x] 6.4 Let `TimeoutError` propagate from `fetchWithTimeout` on timeout
  - **Validates: Requirements 2.1, 2.5, 2.6, 4.1, 4.2**

- [x] 7. Implement `ObservationService`
  - [x] 7.1 Implement `getLatestObservation(observationStationsUrl)` — fetch the station list, take `features[0].properties.stationIdentifier`
  - [x] 7.2 Throw `NWSError` with "No observation stations are available" when `features` is empty
  - [x] 7.3 Fetch `https://api.weather.gov/stations/{stationId}/observations/latest` with `fetchWithTimeout`
  - [x] 7.4 Build and return a `CurrentConditions` object: convert temperature (°C → °F), wind speed (km/h → mph), derive cardinal direction, preserve `null` for any missing value
  - [x] 7.5 Throw `NWSError` on non-200 HTTP status from either fetch
  - **Validates: Requirements 2.2, 2.3, 2.5, 2.6, 2.7, 3.1**

- [x] 8. Implement `ForecastService`
  - [x] 8.1 Implement `getForecast(forecastUrl)` — call the forecast URL with `fetchWithTimeout`
  - [x] 8.2 Return the first 10 `properties.periods` as `ForecastPeriod[]`, mapping each period's `shortForecast` through `WeatherIconMapper.getIcon`
  - [x] 8.3 Throw `NWSError` on non-200 HTTP status
  - [x] 8.4 Let `TimeoutError` propagate from `fetchWithTimeout` on timeout
  - **Validates: Requirements 2.4, 2.5, 2.6**

- [x] 9. Implement forecast grouping helper
  - [x] 9.1 Implement `groupForecastDays(periods)` — pair alternating daytime/nighttime periods into `ForecastDay` objects
  - [x] 9.2 Return exactly 5 `ForecastDay` entries from 10 input periods; each entry has `date`, `highF`, `lowF`, `description`, and `icon` derived from the daytime period
  - **Validates: Requirements 2.4, 3.3**

- [x] 10. Implement `UIController` and wire up the full lookup flow
  - [x] 10.1 Implement `showLoading()` / `hideLoading()` — show/hide the loading indicator and disable/enable the submit button
  - [x] 10.2 Implement `showError(message)` / `clearError()` — render/clear messages in `#error-region` without raw status codes or stack traces
  - [x] 10.3 Implement `clearDisplay()` — clear previously displayed conditions and forecast before a new lookup
  - [x] 10.4 Implement `renderCurrentConditions(conditions, cityName)` — display city/state, temperature (°F, whole number), description, wind (mph + cardinal), humidity (%), and the mapped weather icon; render "N/A" for any `null` field
  - [x] 10.5 Implement `renderForecast(periods)` — call `groupForecastDays`, render a 5-row table with date, high °F, low °F, description, and icon columns
  - [x] 10.6 Implement `handleSubmit()` — validate input (reject empty/whitespace-only, preserve `City_Input` value on error), call services in order (geocode → NWS point → parallel observation + forecast via `Promise.allSettled`), handle each error type with the correct user message
  - [x] 10.7 Attach `handleSubmit` to the submit button click and to the `keydown` Enter event on `City_Input`
  - [x] 10.8 If the forecast fetch fails independently, show current conditions and display the forecast error only in the forecast table area
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.9, 1.10, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3**

- [x] 11. Write unit tests
  - [x] 11.1 Set up Vitest (or Jest) with jsdom; add test script to `package.json`
  - [x] 11.2 Unit test `degreesToCardinal` — boundary values at each of the 16 sector edges
  - [x] 11.3 Unit test `celsiusToFahrenheit` — known values (0°C = 32°F, 100°C = 212°F, –40°C = –40°F) and rounding
  - [x] 11.4 Unit test `kmhToMph` — known values and rounding
  - [x] 11.5 Unit test `WeatherIconMapper.getIcon` — one test per category, empty string, mixed-case input, multi-word description
  - [x] 11.6 Unit test input validation — empty string, whitespace-only, valid city, "City, ST" format
  - [x] 11.7 Unit test `groupForecastDays` — 10 periods → 5 days, correct high/low pairing
  - [x] 11.8 Unit test error message selection — each error type maps to the correct user-facing string
  - **Validates: Requirements 1.3, 2.7, 3.1, 3.2, 3.3**

- [ ] 12. Write property-based tests using fast-check
  - [x] 12.1 **P1** — Temperature conversion round-trip: for any °C in [–100, 60], converting to °F and back is within 0.5°C
    - `fc.float({ min: -100, max: 60 })`
    - **Validates: Requirements 3.1**
  - [x] 12.2 **P2** — Wind direction mapping covers the full circle: for any integer in [0, 359], `degreesToCardinal` returns one of the 16 valid abbreviations and is deterministic
    - `fc.integer({ min: 0, max: 359 })`
    - **Validates: Requirements 3.1**
  - [x] 12.3 **P3** — Icon mapping is total and deterministic: for any string, `getIcon` returns a non-empty string and never `null`/`undefined`
    - `fc.string()`
    - **Validates: Requirements 3.2**
  - [x] 12.4 **P4** — Icon category priority is respected: descriptions containing keywords from multiple categories always return the highest-priority category's icon
    - `fc.constantFrom(...)` with combined keyword descriptions
    - **Validates: Requirements 3.2**
  - [x] 12.5 **P5** — Null observation values always render as "N/A": any combination of null fields in `CurrentConditions` produces "N/A" in the rendered HTML and never "null", "undefined", or empty
    - `fc.record(...)` with nullable fields
    - **Validates: Requirements 2.7**
  - [x] 12.6 **P6** — Forecast grouping always produces exactly 5 days: any array of exactly 10 alternating daytime/nighttime periods produces exactly 5 `ForecastDay` entries with non-null fields
    - `fc.array(forecastPeriodArb, { minLength: 10, maxLength: 10 })`
    - **Validates: Requirements 2.4, 3.3**
  - [x] 12.7 **P7** — Invalid input is rejected and `City_Input` is preserved: whitespace-only input or any error-causing input leaves the field value unchanged
    - `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` + error mocks
    - **Validates: Requirements 1.3, 1.10**
  - [x] 12.8 **P8** — HTTP error status codes trigger service-identified error messages: any status in [400, 599] produces a message naming the failing service without raw codes or stack traces
    - `fc.integer({ min: 400, max: 599 })`
    - **Validates: Requirements 2.5, 4.1**
  - [ ] 12.9 **P9** — First geocoding result's coordinates are always used: any multi-match Census response always passes the first match's `x`/`y` to the NWS point lookup
    - `fc.array(addressMatchArb, { minLength: 1 })`
    - **Validates: Requirements 1.6**
  - [~] 12.10 **P10** — First observation station is always used: any multi-station NWS response always uses the first station's `stationIdentifier`
    - `fc.array(stationArb, { minLength: 1 })`
    - **Validates: Requirements 2.2**

- [ ] 13. Write integration tests
  - [~] 13.1 Happy path: geocoding → NWS point → observation + forecast → full `Weather_Display` rendered correctly
  - [~] 13.2 Geocoding zero results → error message shown in `#error-region`, `City_Input` value preserved
  - [~] 13.3 NWS point returns HTTP 500 → "weather unavailable" error shown
  - [~] 13.4 Empty observation station list → "no stations" error shown
  - [~] 13.5 Forecast fetch fails, observation succeeds → current conditions shown, forecast error displayed in forecast table area only
  - [~] 13.6 Timeout on any fetch → correct timeout error message shown, `City_Input` preserved
  - **Validates: Requirements 1.3, 1.9, 1.10, 2.3, 2.5, 2.6, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2**

## Notes

- Tasks 1–10 should be completed in order, as each builds on the previous.
- Tasks 11–13 (tests) depend on tasks 3–10 being complete but can be written incrementally alongside implementation.
- The prototype checkpoint in Requirement 3 (end-to-end current-conditions display) is reached after task 10 is complete. Open the app in a browser before proceeding to finalize the forecast table and icons.
- The PowerShell server (task 1) requires no external runtimes — only PowerShell 5.1+ (built into Windows).
- Property-based tests (task 12) require `fast-check` as a dev dependency; unit/integration tests (tasks 11, 13) require Vitest or Jest with jsdom.
