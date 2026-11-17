import { describe, expect, it } from 'vitest';
import { describeWeather, isThunderstorm, weatherQuality } from './weather-code.js';

describe('weatherQuality and describeWeather', () => {
  it.each([
    { code: 0, description: 'clear', quality: 1 },
    { code: 3, description: 'overcast', quality: 0.55 },
    { code: 48, description: 'fog', quality: 0.3 },
    { code: 55, description: 'drizzle', quality: 0.4 },
    { code: 82, description: 'heavy rain', quality: 0.1 },
    { code: 67, description: 'freezing rain', quality: 0.05 },
    { code: 85, description: 'light snow', quality: 0.45 },
    { code: 77, description: 'snow grains', quality: 0.4 },
    { code: 99, description: 'thunderstorm', quality: 0 },
  ])('code $code is $description, quality $quality', ({ code, description, quality }) => {
    expect(describeWeather(code)).toBe(description);
    expect(weatherQuality(code)).toBe(quality);
  });

  it('treats an unknown code as unknown, quality 0.5', () => {
    expect(describeWeather(42)).toBe('unknown');
    expect(weatherQuality(42)).toBe(0.5);
  });
});

describe('isThunderstorm', () => {
  it('is true for codes 95 to 99', () => {
    for (const code of [95, 96, 97, 98, 99]) expect(isThunderstorm(code)).toBe(true);
  });

  it('is false for any other code', () => {
    for (const code of [0, 65, 94, 100]) expect(isThunderstorm(code)).toBe(false);
  });
});
