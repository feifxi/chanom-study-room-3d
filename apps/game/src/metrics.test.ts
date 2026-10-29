import { describe, expect, it } from 'vitest';
import { routeFromPath } from './metrics';

describe('routeFromPath', () => {
  it('maps known paths to their route pattern', () => {
    expect(routeFromPath('/rooms')).toBe('/rooms');
    expect(routeFromPath('/stats/abc-123')).toBe('/stats/:visitorId');
    expect(routeFromPath('/admin/feedback/42')).toBe('/admin/feedback/:id');
    expect(routeFromPath('/admin/overview')).toBe('/admin/overview');
    expect(routeFromPath('/matchmake/joinOrCreate/study')).toBe('/matchmake');
  });

  it('collapses everything else so scanners can not explode label cardinality', () => {
    expect(routeFromPath('/wp-login.php')).toBe('unmatched');
    expect(routeFromPath('/stats/a/b')).toBe('unmatched');
  });
});
