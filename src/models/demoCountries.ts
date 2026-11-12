import type { Country } from './country.js';

// Static demonstration data, not a response from the country API.
export const demoJapan: Country = {
  name: 'Япония',
  nativeName: '日本',
  flag: {
    url: new URL('../../assets/flags/jp.svg', import.meta.url).href,
    alt: 'Флаг Японии: красный круг на белом фоне',
  },
  capital: 'Tokyo',
  region: 'Asia',
  population: 123_294_513,
  area: 377_930,
  languages: ['Japanese'],
  currencies: [{ code: 'JPY', name: 'Japanese yen', symbol: '¥' }],
  borders: [],
  description: null,
};

export const demoCountries: readonly Country[] = [demoJapan];
