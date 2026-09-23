export function isDesignPreviewAvailable(mode: string | undefined = process.env.NODE_ENV) {
  return mode === 'development';
}
