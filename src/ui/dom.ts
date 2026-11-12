import type { Country } from '../models/country.js';

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function displayText(value: string | null): string {
  return value?.trim() || 'Не указано';
}

const numberFormat = new Intl.NumberFormat('ru-RU');
export function displayNumber(value: number | null): string {
  return value === null ? 'Не указано' : numberFormat.format(value);
}

export function createFlag(flag: Country['flag']): HTMLSpanElement {
  const wrapper = element('span', 'country-flag');
  const fallback = element('span', 'flag-fallback', 'Флаг недоступен');
  wrapper.append(fallback);
  if (flag === null) return wrapper;

  const image = element('img', '');
  image.alt = flag.alt;
  image.decoding = 'async';
  image.hidden = true;
  image.addEventListener(
    'error',
    () => {
      image.remove();
      fallback.hidden = false;
    },
    { once: true },
  );
  image.addEventListener(
    'load',
    () => {
      fallback.hidden = true;
      image.hidden = false;
    },
    { once: true },
  );
  image.src = flag.url;
  wrapper.append(image);
  return wrapper;
}

export function createIcon(
  kind: 'globe' | 'search' | 'close' | 'arrow' | 'warning',
): SVGSVGElement {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(namespace, 'path');
  const paths = {
    globe: 'M3 16h26M6 8.5c6 4 14 4 20 0M6 23.5c6-4 14-4 20 0',
    search: 'm19 19 8 8',
    close: 'm8 8 16 16M24 8 8 24',
    arrow: 'M6 16h20m-8-8 8 8-8 8',
    warning: 'M16 4 30 28H2L16 4Zm0 8v7m0 4v1',
  };
  path.setAttribute('d', paths[kind]);
  svg.append(path);
  if (kind === 'globe' || kind === 'search') {
    const circle = document.createElementNS(namespace, 'circle');
    circle.setAttribute('cx', kind === 'globe' ? '16' : '13');
    circle.setAttribute('cy', kind === 'globe' ? '16' : '13');
    circle.setAttribute('r', kind === 'globe' ? '13' : '8');
    svg.append(circle);
  }
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
