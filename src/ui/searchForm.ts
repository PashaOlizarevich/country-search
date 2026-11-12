import { createIcon, element } from './dom.js';

export function createSearchForm(onInput: (query: string) => void) {
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const root = element('form', 'search-area');
  root.setAttribute('role', 'search');
  const label = element('label', 'search-label', 'Поиск страны');
  label.htmlFor = 'country-search-input';
  const row = element('div', 'search-box');
  const icon = createIcon('search');
  icon.setAttribute('class', 'search-icon');
  const input = element('input', 'search-input');
  input.id = 'country-search-input';
  input.type = 'search';
  input.name = 'country';
  input.placeholder = 'Например, Japan';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-describedby', 'country-search-hint');
  const hint = element('p', 'search-hint', 'Демоданные: Japan или Demo. Без запросов к API.');
  hint.id = 'country-search-hint';
  const clearButton = element('button', 'clear-search');
  clearButton.type = 'button';
  clearButton.hidden = true;
  clearButton.setAttribute('aria-label', 'Очистить поиск');
  clearButton.append(createIcon('close'));
  row.append(icon, input, clearButton);
  root.append(label, row, hint);

  function setValue(value: string): void {
    input.value = value;
    clearButton.hidden = value.length === 0;
  }
  function notify(): void {
    clearButton.hidden = input.value.length === 0;
    onInput(input.value);
  }
  function clear(): void {
    setValue('');
    input.focus();
    notify();
  }
  root.addEventListener('submit', (event) => event.preventDefault(), options);
  input.addEventListener('input', notify, options);
  clearButton.addEventListener('click', clear, options);
  return { root, input, clearButton, setValue, clear, destroy: () => listeners.abort() };
}
