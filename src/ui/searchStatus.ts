import { createIcon, element } from './dom.js';

/** Display contract only, independent of the future search controller. */
export type SearchStatus =
  | { readonly kind: 'idle' | 'waiting' | 'loading' | 'empty' }
  | { readonly kind: 'error'; readonly message?: string }
  | { readonly kind: 'results'; readonly count: number };

export function createSearchStatus(onRetry: () => void, onClear: () => void) {
  const listeners = new AbortController();
  const root = element('div', 'status-container');
  const announcement = element('p', 'visually-hidden');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  const panel = element('div', 'status-panel');
  const icon = element('span', 'status-icon');
  icon.setAttribute('aria-hidden', 'true');
  const title = element('h2', 'status-title');
  const message = element('p', 'status-message');
  const retry = element('button', 'status-action', 'Повторить');
  const clear = element('button', 'status-action', 'Очистить поиск');
  retry.type = clear.type = 'button';
  retry.addEventListener('click', onRetry, { signal: listeners.signal });
  clear.addEventListener('click', onClear, { signal: listeners.signal });
  panel.append(icon, title, message, retry, clear);
  root.append(announcement, panel);

  function render(state: SearchStatus): void {
    panel.dataset.kind = state.kind;
    panel.hidden = state.kind === 'results';
    root.classList.toggle('status-container-results', state.kind === 'results');
    retry.hidden = state.kind !== 'error';
    clear.hidden = state.kind !== 'empty';
    icon.hidden = state.kind === 'idle' || state.kind === 'waiting';
    icon.replaceChildren();
    if (state.kind === 'loading') icon.append(element('span', 'status-spinner'));
    else icon.append(createIcon(state.kind === 'error' ? 'warning' : 'search'));
    const messages = {
      idle: ['Начните вводить название страны', ''],
      waiting: ['Готовим поиск…', ''],
      loading: ['Ищем страны…', 'Поле остаётся доступным для ввода.'],
      empty: ['Страна не найдена', 'Проверьте название или попробуйте другое.'],
      error: [
        'Не удалось загрузить страны',
        state.kind === 'error'
          ? (state.message ?? 'Проверьте подключение и попробуйте снова.')
          : '',
      ],
      results: [state.kind === 'results' ? `Найдено стран: ${state.count}` : '', ''],
    } as const;
    const [heading, description] = messages[state.kind];
    title.textContent = heading;
    message.textContent = description;
    message.hidden = !description;
    announcement.textContent = [heading, description].filter(Boolean).join('. ');
  }
  render({ kind: 'idle' });
  return { root, render, destroy: () => listeners.abort() };
}
