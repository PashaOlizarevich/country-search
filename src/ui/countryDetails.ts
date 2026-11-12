import type { Country } from '../models/country.js';
import { createFlag, displayNumber, displayText, element } from './dom.js';

let nextDialogId = 0;

export function createCountryDetails(
  getFallbackFocus: () => HTMLElement | null,
  onOpenChange?: (open: boolean) => void,
) {
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const dialog = element('dialog', 'country-dialog');
  const header = element('header', 'dialog-header');
  const title = element('h2', 'dialog-heading');
  title.id = `country-details-title-${++nextDialogId}`;
  dialog.setAttribute('aria-labelledby', title.id);
  const closeButton = element('button', 'dialog-close', 'Закрыть');
  closeButton.type = 'button';
  closeButton.autofocus = true;
  const content = element('div', 'dialog-content');
  header.append(element('span', 'dialog-label', 'О стране'), closeButton);
  dialog.append(header, content);
  let trigger: HTMLElement | null = null;
  let locked = false;
  let previousOverflow = '';
  let previousPriority = '';

  function finishClose(): void {
    if (!locked) return;
    if (previousOverflow)
      document.body.style.setProperty('overflow', previousOverflow, previousPriority);
    else document.body.style.removeProperty('overflow');
    locked = false;
    onOpenChange?.(false);
    const target = trigger?.isConnected ? trigger : getFallbackFocus();
    if (target?.isConnected) target.focus({ preventScroll: true });
    trigger = null;
  }
  function close(): void {
    if (!dialog.open && !locked) return;
    if (dialog.open) dialog.close();
    finishClose();
  }
  function open(country: Country, source: HTMLElement): void {
    title.textContent = country.name;
    content.replaceChildren(createFlag(country.flag), title);
    if (country.nativeName) content.append(element('p', 'dialog-native-name', country.nativeName));
    const fields = element('dl', 'dialog-facts');
    const currencies = country.currencies
      .map(
        (currency) =>
          `${currency.name} (${currency.code}${currency.symbol ? `, ${currency.symbol}` : ''})`,
      )
      .join(', ');
    const borders =
      country.borders === null
        ? 'Не указано'
        : country.borders.length === 0
          ? 'Нет сухопутных границ'
          : `Коды стран: ${country.borders.join(', ')}`;
    const rows: ReadonlyArray<readonly [string, string]> = [
      ['Столица', displayText(country.capital)],
      ['Регион', displayText(country.region)],
      ['Население', displayNumber(country.population)],
      ['Площадь', country.area === null ? 'Не указано' : `${displayNumber(country.area)} км²`],
      ['Языки', country.languages.join(', ') || 'Не указано'],
      ['Валюты', currencies || 'Не указано'],
      ['Границы', borders],
    ];
    for (const [label, value] of rows) {
      const row = element('div', '');
      row.append(element('dt', '', label), element('dd', '', value));
      fields.append(row);
    }
    content.append(
      fields,
      element('p', 'dialog-description', country.description ?? 'Описание не указано.'),
    );
    if (!dialog.open) {
      dialog.showModal();
      previousOverflow = document.body.style.getPropertyValue('overflow');
      previousPriority = document.body.style.getPropertyPriority('overflow');
      document.body.style.setProperty('overflow', 'hidden');
      locked = true;
      onOpenChange?.(true);
    }
    trigger = source;
    dialog.scrollTop = 0;
    closeButton.focus({ preventScroll: true });
  }
  closeButton.addEventListener('click', close, options);
  // The close button is the only interactive element in the details panel.
  dialog.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButton.focus();
      }
    },
    options,
  );
  dialog.addEventListener(
    'cancel',
    (event) => {
      event.preventDefault();
      close();
    },
    options,
  );
  dialog.addEventListener(
    'close',
    () => {
      if (!dialog.open) finishClose();
    },
    options,
  );
  let startedOnBackdrop = false;
  const outside = (event: MouseEvent): boolean => {
    const rect = dialog.getBoundingClientRect();
    return (
      event.target === dialog &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    );
  };
  dialog.addEventListener(
    'pointerdown',
    (event) => {
      startedOnBackdrop = outside(event);
    },
    options,
  );
  dialog.addEventListener(
    'click',
    (event) => {
      if (startedOnBackdrop && outside(event)) close();
      startedOnBackdrop = false;
    },
    options,
  );
  return {
    dialog,
    open,
    close,
    destroy() {
      close();
      listeners.abort();
      dialog.remove();
    },
  };
}
