const CURRENCY_SYMBOLS: Record<string, string> = {
  inr: '₹',
  usd: '$',
  eur: '€',
  gbp: '£',
};

// Medusa v2's pricing module returns amounts as decimal major units (e.g. 199 = ₹199), not cents.
export const formatCurrency = (
  amount: number | null | undefined,
  currencyCode?: string
): string => {
  const code = (currencyCode || 'inr').toLowerCase();
  const symbol = CURRENCY_SYMBOLS[code] || `${code.toUpperCase()} `;
  // A missing amount renders as zero rather than throwing. Medusa omits totals from
  // some partial order payloads, and `undefined.toFixed()` crashed the screen.
  const value = Number(amount);
  return `${symbol}${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
};
