/** UI model. This is not the unverified API response shape. */
export interface Country {
  readonly name: string;
  readonly nativeName: string | null;
  readonly flag: {
    readonly url: string;
    readonly alt: string;
  } | null;
  readonly capital: string | null;
  readonly region: string | null;
  readonly population: number | null;
  readonly area: number | null;
  readonly languages: readonly string[];
  readonly currencies: readonly {
    readonly code: string;
    readonly name: string;
    readonly symbol: string | null;
  }[];
  readonly borders: readonly string[] | null;
  readonly description: string | null;
}
