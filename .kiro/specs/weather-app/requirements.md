# Requirements Document

## Introduction

A simple, single-page weather application that allows users to look up current weather conditions for any city in the United States. The app is built with HTML and JavaScript, served from a local HTTP server on localhost:8080 via a PowerShell script. All weather data and city/location information is sourced exclusively from publicly available U.S. government APIs — specifically the National Weather Service (NWS) API (api.weather.gov) and the U.S. Census Bureau Geocoding API — with no third-party services or API keys required.

## Glossary

- **App**: The single-page HTML/JavaScript weather application served on localhost:8080.
- **User**: A person interacting with the App through a web browser.
- **City_Input**: The text field where the User types a U.S. city name.
- **NWS_API**: The National Weather Service REST API available at `https://api.weather.gov`, a free, public U.S. government service requiring no API key.
- **Census_Geocoder**: The U.S. Census Bureau Geocoding API at `https://geocoding.geo.census.gov`, used to resolve a city name to geographic coordinates.
- **Weather_Display**: The section of the App that renders current weather conditions for the selected city.
- **HTTP_Server**: The PowerShell-based local HTTP server that serves the App on `http://localhost:8080`.
- **Coordinates**: A latitude/longitude pair used to identify a geographic point.
- **NWS_Point**: The NWS grid metadata object returned by `https://api.weather.gov/points/{lat},{lon}`, which provides the forecast office and grid identifiers.
- **NWS_Observation_Station**: The nearest weather observation station returned by the NWS API, used to retrieve current conditions.
- **Current_Conditions**: The most recent weather observation including temperature, weather description, wind speed, wind direction, and relative humidity.
- **Error_Message**: A human-readable message displayed to the User when a request fails or produces no results.

---

## Requirements

### Requirement 1: City Name Input

**User Story:** As a User, I want to type a U.S. city name into a text field and submit it, so that I can look up current weather conditions for that city.

#### Acceptance Criteria

1. WHEN the App loads in the browser, THE App SHALL render a City_Input text field that accepts up to 100 characters.
2. WHEN the App loads in the browser, THE App SHALL render a submit button adjacent to the City_Input field.
3. WHEN the User presses the Enter key while the City_Input field is focused, THE App SHALL initiate the same lookup action as clicking the submit button.
4. WHEN the User submits an empty City_Input, THE App SHALL display an Error_Message stating that a city name is required.
5. THE App SHALL accept city names with optional state abbreviation in the format "City, ST" (e.g., "Austin, TX").
6. WHEN the User submits a City_Input value that does not match the format of a plain city name or "City, ST", THE App SHALL display an Error_Message stating that the input format is invalid.
7. WHEN the User enters more than 100 characters in the City_Input field, THE App SHALL prevent input beyond 100 characters.

---

### Requirement 2: City Geocoding via U.S. Census Bureau

**User Story:** As a User, I want the App to resolve the city name I entered to geographic coordinates, so that the correct location is used for the weather lookup.

#### Acceptance Criteria

1. WHEN the User submits a city name, THE App SHALL send a request to the Census_Geocoder to resolve the city name to Coordinates.
2. WHEN the Census_Geocoder returns one or more matching locations, THE App SHALL use the Coordinates of the first result to proceed with the weather lookup.
3. IF the Census_Geocoder returns zero results for the submitted city name, THEN THE App SHALL hide the loading indicator and display an Error_Message stating that the city could not be found.
4. IF the Census_Geocoder request fails due to a network error, THEN THE App SHALL hide the loading indicator and display an Error_Message stating that the location service is unavailable.
5. WHILE a Census_Geocoder request is in progress, THE App SHALL display a loading indicator to the User until the request completes or fails.
6. IF the Census_Geocoder request does not complete within 10 seconds, THEN THE App SHALL cancel the request, hide the loading indicator, and display an Error_Message stating that the location service timed out.

---

### Requirement 3: NWS Grid Point Resolution

**User Story:** As a User, I want the App to identify the correct NWS forecast grid for my city's coordinates, so that accurate government weather data is retrieved.

#### Acceptance Criteria

1. WHEN Coordinates are obtained from the Census_Geocoder, THE App SHALL send a request to the NWS_API `/points/{lat},{lon}` endpoint to retrieve the NWS_Point metadata.
2. WHEN the NWS_API returns an HTTP 200 response containing a grid identifier, gridX, gridY, and observation stations URL, THE App SHALL extract all four fields from the NWS_Point response for use in subsequent requests.
3. IF the NWS_API `/points` request returns a non-200 HTTP status code, THEN THE App SHALL display an Error_Message stating that weather data is unavailable for the entered location.
4. IF the NWS_API `/points` request fails without receiving an HTTP response (e.g., network timeout or DNS failure), THEN THE App SHALL display an Error_Message stating that the weather service is unavailable.

---

### Requirement 4: Current Weather Observation Retrieval

**User Story:** As a User, I want the App to fetch the latest weather observation from the nearest station, so that I see current conditions rather than a forecast.

#### Acceptance Criteria

1. WHEN the NWS_Point is resolved, THE App SHALL request the list of NWS_Observation_Stations from the URL provided in the NWS_Point response.
2. WHEN the station list is returned, THE App SHALL request the latest observation from the first NWS_Observation_Station in the list.
3. WHEN the latest observation is returned, THE App SHALL extract temperature (in Fahrenheit), weather description (textDescription), wind speed (in mph), wind direction, and relative humidity from the observation.
4. IF the observation value for any of temperature, textDescription, wind speed, wind direction, or relative humidity is null, THEN THE App SHALL display "N/A" in place of that value.
5. IF the station list request or the observation request fails due to a network error or returns an HTTP 4xx or 5xx status code, THEN THE App SHALL display an Error_Message stating that current conditions could not be retrieved.
6. IF the station list returned by the NWS_API contains zero stations, THEN THE App SHALL display an Error_Message stating that no observation stations are available for the entered location.

---

### Requirement 5: Weather Display

**User Story:** As a User, I want to see the current weather conditions displayed clearly on the page, so that I can quickly understand the weather at my chosen city.

#### Acceptance Criteria

1. WHEN Current_Conditions are successfully retrieved, THE Weather_Display SHALL show the resolved city name and state.
2. WHEN Current_Conditions are successfully retrieved, THE Weather_Display SHALL show the current temperature in degrees Fahrenheit, or "N/A" if the temperature value is null.
3. WHEN Current_Conditions are successfully retrieved, THE Weather_Display SHALL show the weather description (e.g., "Mostly Cloudy", "Sunny").
4. WHEN Current_Conditions are successfully retrieved, THE Weather_Display SHALL show wind speed in miles per hour and wind direction as a cardinal abbreviation (e.g., "N", "NE", "SW").
5. WHEN Current_Conditions are successfully retrieved, THE Weather_Display SHALL show relative humidity as a percentage.
6. WHEN a new city lookup is initiated, THE Weather_Display SHALL clear the previously displayed conditions before showing new results.
7. IF the value for wind speed, wind direction, or relative humidity is null, THEN THE Weather_Display SHALL display "N/A" in place of that value.

---

### Requirement 6: Error Handling and User Feedback

**User Story:** As a User, I want clear feedback when something goes wrong, so that I understand why weather data was not displayed and what I can do next.

#### Acceptance Criteria

1. WHEN an Error_Message is displayed, THE App SHALL render it in a dedicated UI region that does not overlap the Weather_Display area.
2. WHEN a new city lookup is initiated, THE App SHALL clear any previously displayed Error_Message.
3. IF any API request returns an HTTP status code in the range 400–599, THEN THE App SHALL display an Error_Message describing the failure.
4. THE App SHALL display all Error_Messages in plain English without exposing raw API error codes or stack traces to the User.
5. IF an API request fails without returning an HTTP status code (e.g., network timeout or DNS failure), THE App SHALL display an Error_Message stating that the service is unavailable.
6. WHEN an Error_Message is displayed, THE App SHALL include a suggestion for the User to check the city name spelling and try again.

---

### Requirement 7: Local HTTP Server

**User Story:** As a developer, I want a PowerShell script to start a local HTTP server on localhost:8080, so that the App can be served and accessed in a browser without additional tooling.

#### Acceptance Criteria

1. THE HTTP_Server SHALL serve all files from the directory containing the PowerShell script on `http://localhost:8080`.
2. WHEN a browser requests `http://localhost:8080` or `http://localhost:8080/`, THE HTTP_Server SHALL respond with the contents of `index.html` from the script's directory with HTTP status 200.
3. THE HTTP_Server SHALL set the `Content-Type` response header to `text/html` for `.html` files, `application/javascript` for `.js` files, and `text/css` for `.css` files.
4. WHEN the PowerShell process is terminated by the user, THE HTTP_Server SHALL stop accepting new connections and release port 8080.
5. WHEN the HTTP_Server starts successfully, THE HTTP_Server SHALL print a message to the console indicating the server is listening on `http://localhost:8080`.
6. IF port 8080 is already in use when the HTTP_Server starts, THEN THE HTTP_Server SHALL print an error message indicating the port is unavailable and exit without starting.
7. IF a browser requests a file that does not exist in the script's directory, THEN THE HTTP_Server SHALL respond with HTTP status 404 and a response body indicating the file was not found.
