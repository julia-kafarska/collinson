// 0.0.0.0, not localhost: inside a container, localhost can't be reached (DECISIONS D9).
export const HOST = '0.0.0.0';
/** Used when PORT is not set (DECISIONS D9). */
export const DEFAULT_PORT = 8080;
export const HEALTH_PATH = '/health';

// Pre-filled in GraphiQL, so a reviewer can press run straight away.
export const EXAMPLE_QUERY = `query Zermatt {
  activityForecast(place: "Zermatt") {
    location { name country timezone }
    fetchedAt
    stale
    activities { activity rank score bestDay days { date score reasons } }
  }
}
`;
