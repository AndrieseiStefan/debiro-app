/** Existing local form conventions; no remote identity/contact verification. */
export function validEmail(value: string) {return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());}
export function validWebsite(value: string) {
  try {
    const text = value.trim();
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.');
  } catch {return false;}
}
