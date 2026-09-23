import {describe, expect, it} from 'vitest';
import {isDesignPreviewAvailable} from '@/lib/development';

describe('design preview guard', () => {
  it('allows development only', () => {
    expect(isDesignPreviewAvailable('development')).toBe(true);
    expect(isDesignPreviewAvailable('production')).toBe(false);
    expect(isDesignPreviewAvailable('test')).toBe(false);
  });
});
