import type { Country } from '../models/country.js';

export interface AppElements {
  readonly root: HTMLElement;
  readonly input: HTMLInputElement;
  readonly results: HTMLElement;
  readonly resultsGrid: HTMLDivElement;
  readonly status: HTMLParagraphElement;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createIcon(kind: 'globe' | 'search'): SVGSVGElement {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('class', kind === 'globe' ? 'brand-icon' : 'search-icon');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const circle = document.createElementNS(namespace, 'circle');
  circle.setAttribute('cx', kind === 'globe' ? '16' : '13');
  circle.setAttribute('cy', kind === 'globe' ? '16' : '13');
  circle.setAttribute('r', kind === 'globe' ? '13' : '8');
  const path = document.createElementNS(namespace, 'path');
  path.setAttribute(
    'd',
    kind === 'globe' ? 'M3 16h26M6 8.5c6 4 14 4 20 0M6 23.5c6-4 14-4 20 0' : 'm19 19 8 8',
  );
  svg.append(circle, path);
  if (kind === 'globe') {
    const ellipse = document.createElementNS(namespace, 'ellipse');
    ellipse.setAttribute('cx', '16');
    ellipse.setAttribute('cy', '16');
    ellipse.setAttribute('rx', '6');
    ellipse.setAttribute('ry', '13');
    svg.append(ellipse);
  }
  return svg;
}

/** Creates the static visual shell; search behavior is connected in later steps. */
export function createApp(country: Country): AppElements {
  const root = element('div', 'app');
  const header = element('header', 'app-header container');
  const brand = element('div', 'brand');
  brand.append(createIcon('globe'), element('span', '', 'Country Search'));
  header.append(brand, element('span', 'scene-mode', 'Статичный флаг'));

  const main = element('main', 'app-main container');
  const hero = element('section', 'hero');
  hero.setAttribute('aria-labelledby', 'hero-title');
  const eyebrow = element('p', 'hero-eyebrow', 'Страны мира');
  const title = element('h1', 'hero-title');
  title.id = 'hero-title';
  title.append('Откройте мир.', document.createElement('br'), 'Страна за страной.');

  const example = element('figure', 'flag-preview');
  if (country.flag !== null) {
    const flag = element('img', 'flag-image');
    flag.src = country.flag.url;
    flag.alt = country.flag.alt;
    flag.width = 900;
    flag.height = 600;
    flag.decoding = 'async';
    flag.draggable = false;
    example.append(flag);
  } else {
    example.append(element('p', 'flag-image', 'Флаг недоступен'));
  }
  example.append(element('figcaption', 'flag-caption', `Визуальный пример · ${country.name}`));
  hero.append(eyebrow, title, example);

  const search = element('section', 'search-area');
  search.setAttribute('aria-labelledby', 'country-search-label');
  const label = element('label', 'search-label', 'Поиск страны');
  label.id = 'country-search-label';
  label.htmlFor = 'country-search-input';
  const searchBox = element('div', 'search-box');
  const input = element('input', 'search-input');
  input.id = 'country-search-input';
  input.type = 'search';
  input.name = 'country';
  input.placeholder = 'Например, Spain или Japan';
  input.autocomplete = 'off';
  input.disabled = true;
  input.setAttribute('aria-describedby', 'country-search-hint');
  searchBox.append(createIcon('search'), input);
  const hint = element('p', 'search-hint', 'Поиск пока недоступен');
  hint.id = 'country-search-hint';
  search.append(label, searchBox, hint);

  const status = element('p', 'search-status', 'Демонстрационный экран');
  status.id = 'country-search-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const results = element('section', 'results');
  results.id = 'country-results';
  results.setAttribute('aria-label', 'Результаты поиска стран');
  results.hidden = true;
  const resultsGrid = element('div', 'results-grid');
  results.append(resultsGrid);
  main.append(hero, search, status, results);

  const footer = element('footer', 'app-footer container');
  const links = element('div', 'footer-links');
  const sourceLink = element('a', '', 'countries.dev');
  sourceLink.href = 'https://countries.dev';
  const taskLink = element('a', '', 'Задание');
  taskLink.href = './docs/TASK.md';
  links.append(sourceLink, taskLink);
  footer.append(links, element('span', 'footer-note', 'Демонстрационный экран'));
  root.append(header, main, footer);
  return { root, input, results, resultsGrid, status };
}
