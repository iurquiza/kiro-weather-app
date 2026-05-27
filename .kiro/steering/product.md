# Product Overview

This project is a **single-page weather application** that lets users look up current weather conditions and a 5-day forecast for any U.S. city.

## Key Characteristics

- No API keys or third-party services — all data comes from free U.S. government APIs
- Runs entirely in the browser; served locally via a PowerShell HTTP server on `http://localhost:8080`
- Data pipeline: Census Bureau Geocoding API → NWS Point lookup → parallel observation + forecast fetches

## Data Sources

- **U.S. Census Bureau Geocoding API** (`geocoding.geo.census.gov`) — resolves city names to lat/lon coordinates
- **National Weather Service API** (`api.weather.gov`) — provides grid metadata, observation stations, and forecasts

## Core User Flows

1. User types a U.S. city name (optionally "City, ST" format) and submits
2. App geocodes the city, fetches NWS grid metadata, then fetches current conditions and 5-day forecast in parallel
3. Results are displayed with weather icons; errors are shown in a dedicated region without overlapping the weather display
