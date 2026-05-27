# Tech Stack

## Runtime & Language

- **Pure client-side JavaScript** (ES modules, no transpilation)
- No build tools, bundlers, or frameworks — zero dependencies at runtime
- Browser `fetch` API with `AbortController` for all HTTP requests (10-second timeout on every call)

## Server

- **PowerShell 5.1+** (`server.ps1`) using `System.Net.HttpListener`
- Serves static files from its own directory on `http://localhost:8080`
- No Node.js, Python, or other runtimes required

## Testing

- **Vitest** (preferred) or Jest with jsdom — unit and integration tests
- **fast-check** — property-based testing (PBT)
- Tests run in Node.js; DOM interactions tested via jsdom

## Common Commands

```powershell
# Start the local HTTP server
.\server.ps1

# Run tests (single pass, no watch mode)
npx vitest --run

# Install dev dependencies (first-time setup)
npm install
```

## APIs (No Auth Required)

| Service | Base URL |
|---|---|
| Nominatim Geocoder | `https://nominatim.openstreetmap.org/search` |
| NWS Points | `https://api.weather.gov/points/{lat},{lon}` |
| NWS Observations | `https://api.weather.gov/stations/{stationId}/observations/latest` |
| NWS Forecast | `https://api.weather.gov/gridpoints/{wfo}/{x},{y}/forecast` |

> **Note:** Nominatim is used instead of the Census Geocoder to avoid CORS issues. It supports browser requests natively, requires no API key, and returns lat/lon directly. Always pass `countrycodes=us` to restrict results to the U.S.

## Unit Conversions

- Temperature: NWS returns °C → convert with `(C * 9/5) + 32`, round to whole number
- Wind speed: NWS returns km/h → convert with `kmh * 0.621371`, round to whole number
- Wind direction: NWS returns degrees → map to 16-point cardinal abbreviations
