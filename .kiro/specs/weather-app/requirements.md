# Requirements Document

## Introduction

A simple, single-page weather application that allows users to look up current weather conditions and a 5-day forecast for any U.S. city. The app is built with HTML and JavaScript, served from a local HTTP server on localhost:8080 via a PowerShell script. All weather data and location information is sourced exclusively from publicly available U.S. government APIs — the National Weather Service (NWS) API (api.weather.gov) and the U.S. Census Bureau Geocoding API — with no third-party services or API keys required. Weather conditions are accompanied by simple icons to aid quick visual recognition.

## Glossary

- **App**: The single-page HTML/JavaScript weather application served on localhost:8080.
- **User**: A person interacting with the App through a web browser.
- **City_Input**: The text field where the User types a U.S. city name.
- **NWS_API**: The National Weather Service REST API at `https://api.weather.gov`, a free public U.S. government service requiring no API key.
- **Census_Geocoder**: The U.S. Census Bureau Geocoding API at `https://geocoding.geo.census.gov`, used to resolve a city name to geographic coordinates.
- **Weather_Display**: The section of the App that renders current conditions and the 5-day forecast for the selected city.
- **HTTP_Server**: The PowerShell-based local HTTP server that serves the App on `http://localhost:8080`.
- **Coordinates**: A latitude/longitude pair identifying a geographic point.
- **NWS_Point**: The NWS grid metadata object returned by `https://api.weather.gov/points/{lat},{lon}`, providing the forecast office and grid identifiers.
- **Current_Conditions**: The most recent weather observation including temperature, weather description, wind speed, wind direction, and relative humidity.
- **Forecast**: The NWS 7-day forecast periods, from which the first 5 days are displayed.
- **Weather_Icon**: A simple inline SVG or Unicode symbol representing a weather condition category (e.g., sunny, cloudy, rainy, snowy).
- **Error_Message**: A human-readable message displayed to the User when a request fails or produces no results.

---

## Requirements

### Requirement 1: City Name Input and Location Resolution

**User Story:** As a User, I want to type a U.S. city name and have the App resolve it to geographic coordinates, so that the correct location is used for the weather lookup.

#### Acceptance Criteria

1. WHEN the App loads in the browser, THE App SHALL render a City_Input text field and a submit button.
2. WHEN the User presses the Enter key while City_Input is focused, THE App SHALL initiate the same lookup as clicking the submit button.
3. WHEN the User submits an empty City_Input, THE App SHALL display an Error_Message stating that a city name is required without clearing the City_Input field.
4. THE App SHALL accept city names up to 255 characters, with an optional state abbreviation in the format "City, ST" (e.g., "Austin, TX").
5. WHEN the User submits a city name, THE App SHALL send a request to the Census_Geocoder to resolve the city name to Coordinates.
6. WHEN the Census_Geocoder returns one or more matching locations, THE App SHALL use the Coordinates of the first result to proceed with the weather lookup.
7. IF the Census_Geocoder returns zero results, THEN THE App SHALL display an Error_Message stating that the city could not be found.
8. IF the Census_Geocoder request fails or does not complete within 10 seconds, THEN THE App SHALL display an Error_Message stating that the location service is unavailable.
9. WHILE any API request is in progress, THE App SHALL display a loading indicator and disable the submit button until the request completes or fails.
10. WHEN an Error_Message is displayed after a failed lookup, THE App SHALL preserve the City_Input value so the User can correct and resubmit.

---

### Requirement 2: NWS Data Retrieval

**User Story:** As a User, I want the App to fetch current conditions and a 5-day forecast from the NWS API, so that I see accurate, up-to-date government weather data.

#### Acceptance Criteria

1. WHEN Coordinates are obtained, THE App SHALL request the NWS_Point metadata from `https://api.weather.gov/points/{lat},{lon}`.
2. WHEN the NWS_Point is resolved, THE App SHALL request the list of observation stations and retrieve the latest observation from the first station in the list to obtain Current_Conditions.
3. IF the observation station list is empty, THEN THE App SHALL display an Error_Message stating that no observation stations are available for the entered location.
4. WHEN the NWS_Point is resolved, THE App SHALL request the NWS forecast endpoint provided in the NWS_Point response and use the first 10 forecast periods (day/night pairs covering 5 days) to obtain the Forecast.
5. IF any NWS_API request returns a non-200 HTTP status code, THEN THE App SHALL display an Error_Message stating that weather data is unavailable for the entered location.
6. IF any NWS_API request does not complete within 10 seconds, THEN THE App SHALL cancel the request and display an Error_Message stating that the weather service timed out.
7. IF an observation value for temperature, weather description, wind speed, wind direction, or relative humidity is null, THEN THE App SHALL display "N/A" in place of that value.

---

### Requirement 3: Weather Display with Icons and 5-Day Forecast

**User Story:** As a User, I want to see current conditions and a 5-day forecast with weather icons displayed clearly on the page, so that I can quickly understand the weather at my chosen city.

#### Acceptance Criteria

1. WHEN Current_Conditions are successfully retrieved, THE Weather_Display SHALL show the resolved city name and state, temperature as a whole number in degrees Fahrenheit, weather description, wind speed as a whole number in mph with cardinal direction abbreviation, and relative humidity as a percentage.
2. WHEN Current_Conditions are successfully retrieved, THE Weather_Display SHALL show a Weather_Icon selected by matching the weather description against these categories in order: thunderstorm, snowy, rainy, cloudy, partly cloudy, sunny/clear; the icon for the first matching category SHALL be displayed.
3. WHEN the Forecast is successfully retrieved, THE Weather_Display SHALL render a table with one row per day for days 1–5 after the current date, with columns for date, high temperature (°F), low temperature (°F), weather description, and a Weather_Icon.
4. WHILE an API request is in progress, THE Weather_Display SHALL show a loading indicator in place of weather data.
5. WHEN a new city lookup is initiated, THE Weather_Display SHALL clear previously displayed conditions and forecast before showing new results.
6. WHEN an Error_Message is displayed, THE App SHALL render it in a dedicated UI region that does not overlap the Weather_Display area, in plain English without raw API error codes or stack traces.
7. WHEN a new city lookup is initiated, THE App SHALL clear any previously displayed Error_Message.
8. IF the Forecast retrieval fails independently of Current_Conditions retrieval, THEN THE Weather_Display SHALL show Current_Conditions and display an Error_Message in the forecast table area stating that the forecast is unavailable.

> **Prototype checkpoint:** Once current-conditions display is working end-to-end (city input → geocoding → NWS observation → display), the prototype SHALL be opened in a web browser for user testing before the forecast table and icons are added.

---

### Requirement 4: Error Handling

**User Story:** As a User, I want clear feedback when something goes wrong, so that I understand why weather data was not displayed and what I can do next.

#### Acceptance Criteria

1. IF any API request returns an HTTP status code in the range 400–599, THEN THE App SHALL display an Error_Message that identifies the failing service (e.g., "Location service", "Weather service") in plain English.
2. IF an API request fails without returning an HTTP status code (e.g., network timeout or DNS failure), THEN THE App SHALL display an Error_Message stating that the named service is unavailable and suggest the User try again later.
3. WHEN an Error_Message results from a geocoding failure (city not found or invalid input), THE App SHALL include a suggestion for the User to check the city name spelling and try again.

---

### Requirement 5: Local HTTP Server

**User Story:** As a developer, I want a PowerShell script to start a local HTTP server on localhost:8080, so that the App can be served and accessed in a browser without additional tooling.

#### Acceptance Criteria

1. THE HTTP_Server SHALL serve all files from the directory containing the PowerShell script on `http://localhost:8080`.
2. WHEN a browser requests `http://localhost:8080` or `http://localhost:8080/`, THE HTTP_Server SHALL respond with the contents of `index.html` with HTTP status 200.
3. THE HTTP_Server SHALL set the `Content-Type` response header to `text/html` for `.html` files, `application/javascript` for `.js` files, `text/css` for `.css` files, and `application/octet-stream` for all other file types.
4. WHEN the HTTP_Server starts successfully, THE HTTP_Server SHALL print a message to the console indicating the server is listening on `http://localhost:8080`.
5. IF port 8080 is already in use when the HTTP_Server starts, THEN THE HTTP_Server SHALL print an error message indicating the port is unavailable and exit without starting.
6. IF a browser requests a file that does not exist in the script's directory, THEN THE HTTP_Server SHALL respond with HTTP status 404 and a response body indicating the requested file was not found.
7. IF a browser requests a directory path other than the root path, THEN THE HTTP_Server SHALL respond with HTTP status 404 and a response body indicating the path was not found.
