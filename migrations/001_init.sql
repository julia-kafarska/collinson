-- Schema from PRD §8. Units are in the column comments.

CREATE TABLE locations (
  id                  bigint PRIMARY KEY,          -- GeoNames id from Open-Meteo geocoding
  name                text NOT NULL,
  country             text,
  region              text,
  latitude            double precision NOT NULL,
  longitude           double precision NOT NULL,
  elevation           real,                        -- m
  timezone            text NOT NULL,               -- IANA name, e.g. Europe/Zurich
  forecast_fetched_at timestamptz,                 -- NULL until the first forecast fetch
  marine_fetched_at   timestamptz                  -- NULL until the first marine fetch
);

-- Caches geocoding. Places don't move, so rows never expire.
CREATE TABLE place_lookups (
  query_normalised text NOT NULL,                  -- trimmed, lower-cased
  country_code     text NOT NULL DEFAULT '',       -- '' = no filter; primary-key columns can't be NULL
  location_id      bigint NOT NULL REFERENCES locations (id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (query_normalised, country_code)
);

CREATE TABLE daily_weather (
  location_id                   bigint NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  date                          date NOT NULL,     -- local date at the location
  temp_max                      real NOT NULL,     -- °C
  temp_min                      real NOT NULL,     -- °C
  apparent_temp_max             real NOT NULL,     -- °C
  precipitation_sum             real NOT NULL,     -- mm
  precipitation_probability_max smallint NOT NULL, -- %
  snowfall_sum                  real NOT NULL,     -- cm
  fresh_snow_cm                 real NOT NULL,     -- cm: the previous day's snowfall (D6)
  snow_depth_max                real NOT NULL,     -- cm (Open-Meteo sends metres; converted when parsed)
  weather_code                  smallint NOT NULL, -- WMO code
  wind_speed_max                real NOT NULL,     -- km/h
  wind_gusts_max                real NOT NULL,     -- km/h
  sunshine_duration             real NOT NULL,     -- s
  daylight_duration             real NOT NULL,     -- s
  PRIMARY KEY (location_id, date)
);

-- Marine data has its own table and fetch time, so a failed marine call
-- never overwrites good wave data (docs/DECISIONS.md, D5).
CREATE TABLE daily_marine (
  location_id           bigint NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  date                  date NOT NULL,             -- local date at the location
  wave_height_max       real,                      -- m; NULL = no sea nearby
  swell_wave_height_max real,                      -- m
  swell_wave_period_max real,                      -- s
  PRIMARY KEY (location_id, date)
);
