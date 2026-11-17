// The reason texts each scorer can give a day. Which reasons a day gets, and in what order, is up
// to the scorer in src/scoring/.

export const SKIING_REASONS = {
  snowDepth: (cm: number) => `Snow depth ${cm} cm`,
  freshSnow: (cm: number) => `Fresh snow ${cm} cm`,
  // "From yesterday", so a day with snow falling doesn't read as snowless (DECISIONS D6).
  noFreshSnow: 'No fresh snow from yesterday',
  tempMax: (c: number) => `Max ${c} °C`,
  tempMaxSlushy: (c: number) => `Max ${c} °C: soft, slushy snow`,
  tempMaxVeryCold: (c: number) => `Max ${c} °C: very cold`,
  gusts: (kmh: number) => `Gusts ${kmh} km/h`,
  weather: (description: string) => `Weather: ${description}`,
  // When a cap applies.
  thinSnow: (cm: number) => `Thin snow: ${cm} cm, little to ski on`,
  noSnow: 'No snow on the ground',
  liftsClosed: (kmh: number) => `Gusts ${kmh} km/h: lifts likely closed`,
} as const;

export const SURFING_REASONS = {
  noMarineData: 'No marine data for this location',
  thunderstorm: 'Thunderstorm: stay out of the water',
  wavesFlat: (m: number) => `Flat: waves ${m} m`,
  wavesSmall: (m: number) => `Waves ${m} m: small`,
  wavesGoodSize: (m: number) => `Waves ${m} m: a good size`,
  wavesBig: (m: number) => `Waves ${m} m: big, for experienced surfers`,
  wavesTooBig: (m: number) => `Waves ${m} m: too big for most surfers`,
  periodUnknown: 'Swell period unknown: assumed poor',
  periodWindChop: (s: number) => `Swell period ${s} s: wind chop`,
  periodWeak: (s: number) => `Swell period ${s} s: weaker waves`,
  periodClean: (s: number) => `Swell period ${s} s: clean, powerful waves`,
  windLight: (kmh: number) => `Wind ${kmh} km/h: light`,
  windChoppy: (kmh: number) => `Wind ${kmh} km/h: choppy`,
  windBlownOut: (kmh: number) => `Wind ${kmh} km/h: blown out`,
  weather: (description: string) => `Weather: ${description}`,
} as const;

export const OUTDOOR_SIGHTSEEING_REASONS = {
  thunderstorm: 'Thunderstorm: stay inside',
  weather: (description: string) => `Weather: ${description}`,
  feelsLike: (c: number) => `Feels like ${c} °C`,
  dry: (pct: number) => `Dry: ${pct}% chance of rain`,
  /** E.g. "Rain likely: 80%, 6.3 mm". */
  rain: (outlook: string, figures: string) => `${outlook}: ${figures}`,
  rainOutlook: {
    rain: { likely: 'Rain likely', possible: 'Rain possible' },
    rainOrSnow: { likely: 'Rain or snow likely', possible: 'Rain or snow possible' },
  },
  /** E.g. "80%, 6.3 mm". */
  rainFigures: (pct: number, mm: number) => `${pct}%, ${mm} mm`,
  polarNight: 'No daylight (polar night)',
  sun: (pct: number) => `Sun for ${pct}% of daylight`,
  gusts: (kmh: number) => `Gusts up to ${kmh} km/h`,
} as const;

// The weather outside that makes indoors the better choice, built on the outdoor texts.
export const INDOOR_SIGHTSEEING_REASONS = {
  thunderstorm: 'Thunderstorm outside',
  /** E.g. "Rain likely outdoors (80%, 6.3 mm)". */
  rain: (outlook: string, figures: string) => `${outlook} outdoors (${figures})`,
  /** E.g. "Feels like 8 °C outdoors". */
  outdoors: (reason: string) => `${reason} outdoors`,
  polarNight: 'No daylight outdoors (polar night)',
  goodWeather: 'Good weather outside: indoor sightseeing can wait',
} as const;
