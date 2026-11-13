import { createFlag, createIcon, displayNumber, displayText, element } from './dom.js';
export function createCountryCard(country, onOpen) {
    const root = element('button', 'country-card');
    root.type = 'button';
    root.setAttribute('aria-haspopup', 'dialog');
    root.setAttribute('aria-label', `Открыть сведения: ${country.name}`);
    const heading = element('span', 'card-heading');
    const names = element('span', '');
    names.append(element('span', 'card-name', country.name));
    if (country.nativeName)
        names.append(element('span', 'card-native-name', country.nativeName));
    heading.append(createFlag(country.flag), names);
    const facts = element('span', 'card-facts');
    const rows = [
        ['Столица', displayText(country.capital)],
        ['Регион', displayText(country.region)],
        ['Население', displayNumber(country.population)],
    ];
    for (const [label, value] of rows) {
        const row = element('span', 'card-fact');
        row.append(element('span', 'fact-label', label), element('span', 'fact-value', value));
        facts.append(row);
    }
    const more = element('span', 'card-action', 'Подробнее');
    more.append(createIcon('arrow'));
    root.append(heading, facts, more);
    root.addEventListener('click', () => onOpen(root));
    return root;
}
