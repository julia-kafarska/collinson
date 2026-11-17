// Weights, comfort bands and caps per activity (PRD §9). Each band's limits are in the unit its
// name ends with. The maths that applies them is in src/scoring/.

/** Every score is an integer from 0 to this. */
export const MAX_SCORE = 100;

// PRD §9 sets the weights, the ideal ranges and the caps. The zero limits are ours, for T15 to tune.
export const SKIING = {
  weights: { snowDepth: 0.4, freshSnow: 0.25, tempMax: 0.15, gusts: 0.1, weather: 0.1 },
  bands: {
    snowDepthCm: {
      // Counts from bare ground up; the thin-snow cap already rules out the first 10 cm.
      zeroBelow: 0,
      idealMin: 50,
      idealMax: Infinity,
      zeroAbove: Infinity,
    },
    freshSnowCm: {
      // Even a dusting freshens the pistes, so the first centimetre counts.
      zeroBelow: 0,
      idealMin: 10,
      idealMax: Infinity,
      zeroAbove: Infinity,
    },
    tempMaxC: {
      // Colder, and frostbite comes fast on an open chairlift.
      zeroBelow: -25,
      idealMin: -10,
      idealMax: 0,
      // Warmer, and the snow turns to slush.
      zeroAbove: 8,
    },
    gustsKmh: {
      zeroBelow: -Infinity,
      idealMin: -Infinity,
      idealMax: 30,
      // Most lifts stop in gusts this strong.
      zeroAbove: 60,
    },
  },
  caps: {
    thinSnow: { belowCm: 10, maxScore: 10 },
    liftsClosed: { aboveKmh: 60, maxScore: 30 },
  },
  // Under half marks, a factor costs the day more than it adds, so it is named before the strengths.
  weakBelow: 0.5,
  // Enough to explain a day without listing every factor.
  maxReasons: 3,
} as const;

// Each is both a wave-band limit and where a cap starts, so each is set once.
const FLAT_BELOW_M = 0.3;
// From 4 m most breaks close out, yet period and wind alone still gave such a day 50–60 (T15).
const TOO_BIG_FROM_M = 4;

// Weights and caps from PRD §9, except the too-big cap (T15).
export const SURFING = {
  weights: { waveHeight: 0.4, swellPeriod: 0.3, wind: 0.2, weather: 0.1 },
  // The ideal ranges are PRD §9's. The zero limits are ours, checked against real weeks in T15.
  bands: {
    waveHeightM: {
      // Under 0.3 m there is nothing to ride, which is also where the flat cap starts.
      zeroBelow: FLAT_BELOW_M,
      idealMin: 1,
      idealMax: 2.5,
      // Too big and dangerous for most surfers, which is also where the too-big cap starts.
      zeroAbove: TOO_BIG_FROM_M,
    },
    swellPeriodS: {
      // At 5 s or less the waves are local wind chop, not swell.
      zeroBelow: 5,
      idealMin: 10,
      idealMax: Infinity,
      zeroAbove: Infinity,
    },
    windKmh: {
      zeroBelow: -Infinity,
      idealMin: -Infinity,
      idealMax: 15,
      // By 40 km/h the wind has blown the waves out.
      zeroAbove: 40,
    },
  },
  caps: {
    thunderstorm: { maxScore: 10 },
    flat: { belowM: FLAT_BELOW_M, maxScore: 10 },
    // Ruled out for most surfers, though experts may still find a sheltered break.
    tooBig: { fromM: TOO_BIG_FROM_M, maxScore: 30 },
  },
} as const;

// The weights, the ideal feels-like range and the thunderstorm cap are from PRD §9.
export const OUTDOOR_SIGHTSEEING = {
  weights: { feelsLike: 0.3, rain: 0.35, sun: 0.15, gusts: 0.1, weather: 0.1 },
  bands: {
    feelsLikeC: {
      // At freezing, a day on foot stops being pleasant for most visitors.
      zeroBelow: 0,
      idealMin: 16,
      idealMax: 26,
      // A feels-like 38 °C brings heat stress to anyone walking for hours.
      zeroAbove: 38,
    },
    rainProbabilityPct: {
      zeroBelow: -Infinity,
      idealMin: -Infinity,
      // A one-in-five chance rarely changes anyone's plans.
      idealMax: 20,
      // At 90%, rain is all but certain.
      zeroAbove: 90,
    },
    rainMm: {
      zeroBelow: -Infinity,
      idealMin: -Infinity,
      // Half a millimetre is a passing drizzle.
      idealMax: 0.5,
      // 10 mm in a day soaks through a jacket and umbrella.
      zeroAbove: 10,
    },
    gustsKmh: {
      zeroBelow: -Infinity,
      idealMin: -Infinity,
      // Below 25 km/h (Beaufort 4), gusts barely register on foot.
      idealMax: 25,
      // 70 km/h is a gale (Beaufort 8): walking is seriously impeded.
      zeroAbove: 70,
    },
  },
  caps: {
    thunderstorm: { maxScore: 20 },
    // A likely soaking rules out a day on foot however warm and calm, which the weights miss (T15).
    heavyRain: { maxScore: 30 },
  },
  // "Likely" means more often than not.
  rainLikelyPct: 50,
} as const;

// Indoor sightseeing is 100 − outdoor (DECISIONS D7), so it has no weights or bands of its own.
export const INDOOR_SIGHTSEEING = {
  // A fallback, not a highlight: an outdoor day whose main conditions are right scores 65+ and wins.
  maxScore: 65,
  // Ideal feels-like, rain and gusts alone score 75, so a lower score always has a reason to list.
  goodOutdoorScore: 75,
} as const;
