import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from './mapCountryResponse.js';

const japan: unknown[] = JSON.parse(
  readFileSync(new URL('../../tests/fixtures/name-japan.json', import.meta.url), 'utf8'),
);
const guinea: unknown[] = JSON.parse(
  readFileSync(new URL('../../tests/fixtures/name-guinea.json', import.meta.url), 'utf8'),
);

describe('mapCountryResponse', () => {
  it('maps the recorded Japan response without inventing unavailable details', () => {
    expect(mapCountryResponse(japan[0])).toEqual({
      name: 'Japan',
      nativeName: '日本',
      capital: 'Tokyo',
      region: 'Asia',
      flag: { url: 'https://flagcdn.com/jp.svg', alt: 'Флаг Japan' },
      population: 125836021,
      area: 377930,
      languages: ['Japanese'],
      currencies: [{ code: 'JPY', name: 'Japanese yen', symbol: '¥' }],
      borders: null,
      description: null,
    });
  });
  it('maps all recorded partial-query matches without modifying the source', () => {
    const before = JSON.stringify(guinea);
    const countries = guinea.map(mapCountryResponse);
    expect(countries.map((country) => country.name)).toEqual([
      'Equatorial Guinea',
      'Guinea',
      'Guinea-Bissau',
      'Papua New Guinea',
    ]);
    expect(countries[0]?.languages).toContain('Fang');
    expect(JSON.stringify(guinea)).toBe(before);
  });
  it('represents missing fields explicitly', () => {
    expect(mapCountryResponse({ name: 'Example' })).toEqual({
      name: 'Example',
      nativeName: null,
      flag: null,
      capital: null,
      region: null,
      population: null,
      area: null,
      languages: [],
      currencies: [],
      borders: null,
      description: null,
    });
  });
  it('preserves zero and known empty borders and copies arrays', () => {
    const raw = { name: 'Example', population: 0, area: 0, borders: [] };
    const result = mapCountryResponse(raw);
    expect(result).toMatchObject({ population: 0, area: 0, borders: [] });
    expect(result.borders).not.toBe(raw.borders);
  });
  it('cleans malformed optional data and uses a safe PNG fallback', () => {
    expect(
      mapCountryResponse({
        name: ' Example ',
        nativeName: 5,
        capital: ' ',
        region: [],
        population: -1,
        area: Infinity,
        flags: { svg: 'javascript:alert(1)', png: 'https://example.com/flag.png' },
        languages: [null, { name: ' A ' }, { name: 2 }],
        currencies: [{ code: 'X', name: 'Coin' }, { code: 'Y' }],
        borders: ['ABC', 2, ''],
      }),
    ).toMatchObject({
      name: 'Example',
      nativeName: null,
      capital: null,
      region: null,
      population: null,
      area: null,
      flag: { url: 'https://example.com/flag.png', alt: 'Флаг Example' },
      languages: ['A'],
      currencies: [{ code: 'X', name: 'Coin', symbol: null }],
      borders: ['ABC'],
    });
  });
  it.each([null, [], 'Japan', {}, { name: '' }, { name: 42 }])(
    'rejects an invalid country: %j',
    (raw) => {
      expect(() => mapCountryResponse(raw)).toThrow(TypeError);
    },
  );
});
