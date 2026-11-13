import { demoJapan } from './models/demoCountries.js';
import { createSearchController } from './search/searchController.js';
import { createApp } from './ui/createApp.js';

// The controller owns requests; UI receives only the current state.
const app = createApp(demoJapan, {
  onInput: (query) => controller.setQuery(query),
  onRetry: () => controller.retry(),
});
const controller = createSearchController({
  onState(state) {
    if (state.kind === 'results')
      app.render({ kind: 'results', count: state.countries.length }, state.countries);
    else if (state.kind === 'error')
      app.render({
        kind: 'error',
        message:
          state.errorKind === 'timeout'
            ? 'Сервер не ответил вовремя. Повторите поиск.'
            : 'Не удалось загрузить страны. Проверьте подключение и повторите поиск.',
      });
    else app.render({ kind: state.kind });
  },
});
document.body.append(app.root);
