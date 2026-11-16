/** Observed countries.dev fields used by the future mapper; not a runtime validator. */
export interface RawCountry {
  readonly name: string;
  readonly nativeName?: string;
  /** Emoji, not an image URL. */
  readonly flag?: string;
  readonly flags?: {
    readonly svg?: string;
    readonly png?: string;
  };
  readonly capital?: string;
  readonly region?: string;
  readonly population?: number;
  readonly area?: number;
  readonly languages?: readonly {
    readonly name: string;
    readonly nativeName?: string;
    readonly iso639_1?: string;
    readonly iso639_2?: string;
  }[];
  readonly currencies?: readonly {
    readonly code: string;
    readonly name: string;
    readonly symbol?: string;
  }[];
  readonly borders?: readonly string[];
}

/** HTTP 200 is a JSON array; HTTP 404 has a plain-text body instead. */
export type RawCountryResponse = readonly RawCountry[];
