const CURRENCY_SYMBOLS: Record<string, string> = {
  inr: '₹',
  usd: '$',
  eur: '€',
  gbp: '£',
};

// Medusa v2's pricing module returns amounts as decimal major units (e.g. 199 = ₹199), not cents.
export const formatCurrency = (amount: number, currencyCode?: string): string => {
  const code = (currencyCode || 'inr').toLowerCase();
  const symbol = CURRENCY_SYMBOLS[code] || `${code.toUpperCase()} `;
  return `${symbol}${amount.toFixed(2)}`;
};
