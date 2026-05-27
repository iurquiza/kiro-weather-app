# Project Structure

## Root Layout

```
KiroProjects/
├── index.html          # Single HTML page — UI shell, all DOM structure
├── weather.js          # Main JS module — all app logic (ES module)
├── server.ps1          # PowerShell static file server (localhost:8080)
├── package.json        # Dev dependencies only (Vitest, fast-check)
└── .kiro/
    ├── hooks/          # Kiro agent hooks (e.g., auto-commit on agent stop)
    ├── specs/
    │   └── weather-app/
    │       ├── requirements.md
    │       ├── design.md
    │       ├── tasks.md
    │       └── .config.kiro
    └── steering/       # AI assistant guidance files (this directory)
```

## Code Organization (`weather.js`)

All JavaScript lives in a single ES module, organized into logical sections:

| Section | Responsibility |
|---|---|
| `GeocodingService` | Resolves city name → lat/lon via Census Geocoder |
| `NWSService` | Fetches NWS grid metadata from `/points/{lat},{lon}` |
| `ObservationService` | Fetches latest observation from the nearest NWS station |
| `ForecastService` | Fetches 7-day forecast; returns first 10 periods |
| `WeatherIconMapper` | Maps weather description strings to inline SVG/Unicode icons |
| `UIController` | Orchestrates the full lookup flow; manages all DOM state |
| `fetchWithTimeout` | Utility wrapper: `fetch` + `AbortController` with 10s default |
| Error classes | `GeocodingError`, `NWSError`, `TimeoutError` (extend `Error`) |

## Conventions

- **No global state** — all state is managed through `UIController`
- **Error display** — always use the dedicated `#error-region` element; never overlap the `Weather_Display` area
- **Null safety** — any `null` observation value must render as `"N/A"`, never `"null"`, `"undefined"`, or empty
- **Parallel fetches** — observation and forecast are fetched concurrently via `Promise.allSettled` after the NWS point resolves; a forecast failure must not suppress current conditions
- **No inline event handlers** — attach all event listeners in JS (`handleSubmit` on button click and Enter keydown)
- **Test file location** — place test files alongside source or in a `tests/` directory; use `.test.js` suffix
- **Property-based test tags** — tag each PBT with `// Feature: weather-app, Property {N}: {description}`
