import type { Country } from '../models/country.js';
import { searchCountries } from './searchCountries.js';

type Request = (query: string, signal: AbortSignal) => Promise<Country[]>;
interface Consumer {
  resolve(value: Country[]): void;
  reject(reason: unknown): void;
  detach(): void;
}
interface Flight {
  controller: AbortController;
  consumers: Set<Consumer>;
}

/** Each caller owns cancellation; only an unused shared transport is aborted. */
export function createCachedSearch(
  request: Request = searchCountries,
  { ttlMs = 300_000, maxEntries = 50, now = Date.now } = {},
): Request {
  const cache = new Map<string, { expires: number; countries: Country[] }>();
  const flights = new Map<string, Flight>();

  function settle(key: string, flight: Flight, countries?: Country[], error?: unknown): void {
    if (flights.get(key) !== flight) return;
    flights.delete(key);
    if (countries && !flight.controller.signal.aborted) {
      cache.delete(key);
      cache.set(key, { expires: now() + ttlMs, countries: structuredClone(countries) });
      while (cache.size > Math.max(0, maxEntries)) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        cache.delete(oldest);
      }
    }
    for (const consumer of flight.consumers) {
      consumer.detach();
      if (countries) consumer.resolve(structuredClone(countries));
      else consumer.reject(error);
    }
    flight.consumers.clear();
  }

  return (query, signal) => {
    if (signal.aborted) return Promise.reject(signal.reason);
    const normalized = query.trim();
    if (!normalized) return Promise.resolve([]);
    const key = normalized.toLowerCase();
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return Promise.resolve(structuredClone(cached.countries));
    cache.delete(key);
    let flight = flights.get(key);
    const start = !flight;
    if (!flight) {
      flight = { controller: new AbortController(), consumers: new Set() };
      flights.set(key, flight);
    }
    const shared = flight;
    const promise = new Promise<Country[]>((resolve, reject) => {
      const abort = (): void => {
        shared.consumers.delete(consumer);
        consumer.detach();
        reject(signal.reason);
        if (!shared.consumers.size && flights.get(key) === shared) {
          flights.delete(key);
          shared.controller.abort(signal.reason);
        }
      };
      const consumer: Consumer = {
        resolve,
        reject,
        detach: () => signal.removeEventListener('abort', abort),
      };
      shared.consumers.add(consumer);
      signal.addEventListener('abort', abort, { once: true });
    });
    if (start) {
      try {
        void request(normalized, shared.controller.signal).then(
          (countries) => settle(key, shared, countries),
          (error: unknown) => settle(key, shared, undefined, error),
        );
      } catch (error) {
        settle(key, shared, undefined, error);
      }
    }
    return promise;
  };
}
