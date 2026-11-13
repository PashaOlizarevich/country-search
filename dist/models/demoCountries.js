// Static demonstration data, not a response from the country API.
export const demoJapan = {
    name: 'Japan',
    nativeName: 'Япония · 日本',
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
// Synthetic fixtures deliberately exercise missing values and long labels.
const incompleteDemo = {
    name: 'Demo land',
    nativeName: null,
    flag: null,
    capital: null,
    region: null,
    population: 0,
    area: null,
    languages: [],
    currencies: [],
    borders: null,
    description: 'Вымышленный пример для проверки неполных данных.',
};
export const demoCountries = [
    demoJapan,
    incompleteDemo,
    {
        ...incompleteDemo,
        name: 'Demo country with a very long demonstration name',
        population: null,
    },
];
