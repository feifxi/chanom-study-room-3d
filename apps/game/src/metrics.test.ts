import { describe, expect, it } from 'vitest';
import { routeFromPath } from './metrics';

describe('routeFromPath', () => {
  it('maps known paths to their route pattern', () => {
    expect(routeFromPath('/rooms')).toBe('/rooms');
    expect(routeFromPath('/internal/live')).toBe('/internal/live');
    expect(routeFromPath('/matchmake/joinOrCreate/study')).toBe('/matchmake');
  });

  it('collapses everything else so scanners can not explode label cardinality', () => {
    expect(routeFromPath('/wp-login.php')).toBe('unmatched');
    expect(routeFromPath('/rooms/a/b')).toBe('unmatched');
    // The REST API moved to apps/api; the game server no longer answers these
    expect(routeFromPath('/stats/abc-123')).toBe('unmatched');
  });
});
