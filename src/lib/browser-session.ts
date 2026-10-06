/** In-memory ownership survives client module reinitialization, never reloads or other tabs. */
export function browserSession<T>(key: symbol, initialize: () => T): T {
  // Server rendering must not publish browser mutations in a process-global registry.
  if (typeof window === 'undefined') return initialize();
  if (!Object.prototype.hasOwnProperty.call(window, key)) Object.defineProperty(window, key, {value: initialize()});
  return Reflect.get(window, key) as T;
}
