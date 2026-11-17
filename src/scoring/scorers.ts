import type { Activity } from '../domain.js';
import { scoreIndoorSightseeing, scoreOutdoorSightseeing } from './sightseeing.js';
import { scoreSkiing } from './skiing.js';
import { scoreSurfing } from './surfing.js';
import type { Scorer } from './types.js';

/**
 * Every activity's scorer. Adding one takes a scorer file, an entry here, and the new value in
 * ACTIVITIES (src/domain.ts) and in the Activity enum (src/graphql/schema.graphql).
 */
export const SCORERS: Record<Activity, Scorer> = {
  SKIING: scoreSkiing,
  SURFING: scoreSurfing,
  OUTDOOR_SIGHTSEEING: scoreOutdoorSightseeing,
  INDOOR_SIGHTSEEING: scoreIndoorSightseeing,
};
