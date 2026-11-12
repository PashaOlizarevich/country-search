import type { Country } from '../models/country.js';
import { createCountryCard } from './countryCard.js';
import { createCountryDetails } from './countryDetails.js';
import { createIcon, element } from './dom.js';
import { createFlagScene } from './flagScene.js';
import { createSearchForm } from './searchForm.js';
import { createSearchStatus, type SearchStatus } from './searchStatus.js';

export function createApp(
  country: Country,
  callbacks: { onInput: (query: string) => void; onRetry: () => void },
) {
  const root = element('div', 'app');
  const header = element('header', 'app-header container');
  const scene = createFlagScene(country);
  const brand = element('div', 'brand');
  const globe = createIcon('globe');
  globe.setAttribute('class', 'brand-icon');
  brand.append(globe, element('span', '', 'Country Search'));
  header.append(brand, scene.control);
  const main = element('main', 'app-main container');
  const hero = element('section', 'hero');
  hero.setAttribute('aria-labelledby', 'hero-title');
  const title = element('h1', 'hero-title');
  title.id = 'hero-title';
  title.append('Откройте мир.', document.createElement('br'), 'Страна за страной.');
  hero.append(element('p', 'hero-eyebrow', 'Страны мира'), title, scene.root);
  const search = createSearchForm(callbacks.onInput);
  const details = createCountryDetails(() => search.input, scene.setPaused);
  const status = createSearchStatus(() => {
    search.input.focus();
    callbacks.onRetry();
  }, search.clear);
  const results = element('section', 'results');
  results.setAttribute('aria-labelledby', 'results-title');
  const resultsHeader = element('div', 'results-header');
  const resultsTitle = element('h2', 'results-title', 'Результаты поиска');
  resultsTitle.id = 'results-title';
  const count = element('span', 'results-count');
  resultsHeader.append(resultsTitle, count);
  const grid = element('div', 'results-grid');
  results.append(resultsHeader, grid);
  results.hidden = true;
  main.append(hero, search.root, status.root, results);
  const footer = element('footer', 'app-footer container');
  const links = element('div', 'footer-links');
  const source = element('a', '', 'countries.dev');
  source.href = 'https://countries.dev';
  const task = element('a', '', 'Задание');
  task.href = './docs/TASK.md';
  links.append(source, task);
  footer.append(links, element('span', 'footer-note', 'Демонстрационный экран'));
  root.append(header, main, footer, details.dialog);
  return {
    root,
    input: search.input,
    setQuery: search.setValue,
    render(state: SearchStatus, countries: readonly Country[] = []) {
      root.dataset.hasQuery = String(search.input.value.trim().length > 0);
      results.hidden = state.kind !== 'results';
      const preview = state.kind === 'results' ? countries[0] : undefined;
      scene.setCountry(preview ?? country, preview === undefined);
      count.textContent = `Найдено: ${countries.length}`;
      grid.replaceChildren(
        ...(state.kind === 'results'
          ? countries.map((item) =>
              createCountryCard(item, (button) => {
                scene.setCountry(item, false);
                details.open(item, button);
              }),
            )
          : []),
      );
      status.render(state);
    },
    destroy() {
      search.destroy();
      status.destroy();
      details.destroy();
      scene.destroy();
      root.remove();
    },
  };
}
