const fold = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/đ/g,'d');

export const searchTokens = value => [...new Set(fold(value).trim().split(/\s+/u).filter(Boolean))];

/** Every token may match a different approved field. Call before client pagination. */
export function matchesSearch(fields,keyword) {
 const values=fields.map(fold);
 return searchTokens(keyword).every(token=>values.some(value=>value.includes(token)));
}
