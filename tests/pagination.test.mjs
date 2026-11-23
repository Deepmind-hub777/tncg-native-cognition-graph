import test from 'node:test';
import assert from 'node:assert/strict';
import { getPageCount, getPageEntries } from '../src/pagination.js';

const entries = Array.from({ length: 6 }, (_, i) => ({ id: `qzw-${i + 1}`, sequence: i + 1 }));
test('pagination handles empty, boundary and last partial page safely', () => {
  assert.equal(getPageCount(0), 0);
  assert.deepEqual(getPageEntries([], 1), []);
  assert.deepEqual(getPageEntries(entries, 1), entries.slice(0, 4));
  assert.deepEqual(getPageEntries(entries, 2), entries.slice(4));
  assert.deepEqual(getPageEntries(entries, 3), []);
  assert.equal(getPageCount(250), 63);
});
