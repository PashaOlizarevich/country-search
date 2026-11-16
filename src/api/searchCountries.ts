import type { Country } from '../models/country.js';
import { mapCountryResponse } from '../models/mapCountryResponse.js';
import { HttpError } from './errors.js';

export async function searchCountries(query: string, signal: AbortSignal): Promise<Country[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  const response = await fetch(
    `https://countries.dev/name/${encodeURIComponent(normalizedQuery)}`,
    { signal },
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new HttpError(response.status);
  const raw: unknown = await response.json();
  if (!Array.isArray(raw)) throw new TypeError('Expected an array of countries');
  return raw.map(mapCountryResponse);
}
