export function getPageCount(entryCount, pageSize = 4) {
  if (!Number.isInteger(entryCount) || entryCount < 0) throw new RangeError('entryCount must be a non-negative integer');
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError('pageSize must be a positive integer');
  return Math.ceil(entryCount / pageSize);
}

export function getPageEntries(entries, page, pageSize = 4) {
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array');
  if (!Number.isInteger(page) || page < 1) return [];
  return entries.slice((page - 1) * pageSize, page * pageSize);
}
