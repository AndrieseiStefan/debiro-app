import {afterEach, describe, expect, it, vi} from 'vitest';
import {browserSession} from '@/lib/browser-session';

afterEach(() => vi.unstubAllGlobals());
describe('tab-local session boundary', () => {
  it('initializes once and returns the same mutable object for independent callers', () => {
    const key = Symbol('session-boundary');
    const initialize = vi.fn(() => ({versions: ['v1']}));
    const session = browserSession(key, initialize);
    session.versions.push('v2');
    expect(browserSession(key, initialize)).toBe(session);
    expect(initialize).toHaveBeenCalledTimes(1);
  });
  it('starts fresh in a different browser realm without serializing files or records', () => {
    const key = Symbol('tab-boundary');
    const session = browserSession(key, () => ({versions: ['v1', 'v2']}));
    vi.stubGlobal('window', {});
    const otherTab = browserSession(key, () => ({versions: ['v1']}));
    expect(otherTab).not.toBe(session);
    expect(otherTab.versions).toEqual(['v1']);
  });
  it('never shares a server process-global session', () => {
    vi.stubGlobal('window', undefined);
    const key = Symbol('server-boundary');
    const initialize = () => ({versions: ['v1']});
    const first = browserSession(key, initialize);
    first.versions.push('v2');
    expect(browserSession(key, initialize).versions).toEqual(['v1']);
  });
});
