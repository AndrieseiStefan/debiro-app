/** A screen owns TInput and TView; adapters provide fixture or real data. */
export type ViewDataSource<TInput, TView> = (input: TInput) => Promise<TView>;
