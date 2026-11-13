import { createIcon, element } from './dom.js';
export function createSearchForm(onInput) {
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
    const hint = element('p', 'search-hint', 'Введите название страны на английском языке.');
    hint.id = 'country-search-hint';
    const clearButton = element('button', 'clear-search');
    clearButton.type = 'button';
    clearButton.hidden = true;
    clearButton.setAttribute('aria-label', 'Очистить поиск');
    clearButton.append(createIcon('close'));
    row.append(icon, input, clearButton);
    root.append(label, row, hint);
    const history = element('div', 'search-history');
    history.hidden = true;
    history.setAttribute('role', 'group');
    history.setAttribute('aria-label', 'Последние запросы');
    root.append(history);
    function setValue(value) {
        input.value = value;
        clearButton.hidden = value.length === 0;
    }
    function notify() {
        clearButton.hidden = input.value.length === 0;
        onInput(input.value);
    }
    function clear() {
        setValue('');
        input.focus();
        notify();
    }
    root.addEventListener('submit', (event) => event.preventDefault(), options);
    input.addEventListener('input', notify, options);
    clearButton.addEventListener('click', clear, options);
    function renderHistory(queries, onSelect) {
        history.hidden = queries.length === 0;
        history.replaceChildren(element('span', 'search-history-label', 'Недавно:'));
        for (const query of queries) {
            const button = element('button', 'history-query', query);
            button.type = 'button';
            button.addEventListener('click', () => onSelect(query));
            history.append(button);
        }
    }
    return {
        root,
        input,
        clearButton,
        setValue,
        clear,
        renderHistory,
        destroy: () => listeners.abort(),
    };
}
