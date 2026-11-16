import type { Country } from '../models/country.js';

export type SearchState =
  | { readonly kind: 'idle' | 'waiting' | 'loading' | 'empty'; readonly query: string }
  | { readonly kind: 'results'; readonly query: string; readonly countries: readonly Country[] }
  | {
      readonly kind: 'error';
      readonly query: string;
      readonly errorKind: 'timeout' | 'http' | 'error';
      readonly error: unknown;
    };
