import type { Country } from './country.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function imageUrl(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Validate one external JSON record and copy it into the UI model. */
export function mapCountryResponse(raw: unknown): Country {
  if (!isRecord(raw)) throw new TypeError('Invalid country response');
  const name = text(raw.name);
  if (!name) throw new TypeError('Country name is missing');
  const flags = isRecord(raw.flags) ? raw.flags : {};
  const url = imageUrl(flags.svg) ?? imageUrl(flags.png);
  const languages: string[] = [];
  if (Array.isArray(raw.languages)) {
    for (const language of raw.languages) {
      const name = isRecord(language) ? text(language.name) : null;
      if (name) languages.push(name);
    }
  }
  const currencies: Country['currencies'][number][] = [];
  if (Array.isArray(raw.currencies)) {
    for (const currency of raw.currencies) {
      if (!isRecord(currency)) continue;
      const code = text(currency.code);
      const name = text(currency.name);
      if (code && name) currencies.push({ code, name, symbol: text(currency.symbol) });
    }
  }
  const borders = Array.isArray(raw.borders)
    ? raw.borders.map(text).filter((border) => border !== null)
    : null;
  return {
    name,
    nativeName: text(raw.nativeName),
    flag: url ? { url, alt: `Флаг ${name}` } : null,
    capital: text(raw.capital),
    region: text(raw.region),
    population: number(raw.population),
    area: number(raw.area),
    languages,
    currencies,
    borders,
    description: null,
  };
}
