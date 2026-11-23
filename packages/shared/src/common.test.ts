import { describe, expect, it } from 'vitest';
import { commonCopyId, commonCopyName, parseCommonCopy } from './common.js';

describe('Common room copies', () => {
  it('names copies and reads them back', () => {
    const id = commonCopyId('library', 2);
    expect(id).toBe('common-library-2');
    const copy = parseCommonCopy(id)!;
    expect(copy.n).toBe(2);
    expect(commonCopyName(copy.type, copy.n)).toBe('Library Common Room #2');
    expect(parseCommonCopy('abc123')).toBeNull();
    expect(parseCommonCopy('common-pool-1')).toBeNull();
    expect(parseCommonCopy('common-cafe-0')).toBeNull();
  });
});
