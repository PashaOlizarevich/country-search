import { demoCountries, demoJapan } from './models/demoCountries.js';
import { createApp } from './ui/createApp.js';

// Temporary local preview wiring. API search, debounce and cancellation come later.
function showDemo(query: string): void {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) {
    app.render({ kind: 'idle' });
    return;
  }
  const matches = demoCountries.filter((country) =>
    `${country.name} ${country.nativeName ?? ''}`.toLocaleLowerCase().includes(normalized),
  );
  app.render(
    matches.length ? { kind: 'results', count: matches.length } : { kind: 'empty' },
    matches,
  );
}
const app = createApp(demoJapan, { onInput: showDemo, onRetry: () => showDemo(app.input.value) });
document.body.append(app.root);
const preview = new URLSearchParams(location.search).get('preview');
if (preview === 'waiting' || preview === 'loading' || preview === 'empty' || preview === 'error') {
  app.setQuery(preview === 'empty' ? 'Atlantis' : 'Japan');
  app.render({ kind: preview });
} else if (preview === 'results') {
  app.setQuery('a');
  showDemo('a');
} else app.render({ kind: 'idle' });
