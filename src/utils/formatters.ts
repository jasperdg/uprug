/**
 * Format price with appropriate decimal places
 */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  if (price >= 1) {
    return price.toFixed(2)
  }
  return price.toFixed(4)
}

/**
 * Format currency (USDC)
 */
export function formatCurrency(amount: number | null | undefined): string {
  // Handle null, undefined, NaN, or Infinity
  if (amount === null || amount === undefined || !isFinite(amount) || isNaN(amount)) {
    return '$0.00'
  }
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Format percentage change
 */
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/**
 * Format odds multiplier
 */
export function formatOdds(odds: number): string {
  if (odds === 0 || !isFinite(odds)) return '-'
  return `${odds.toFixed(2)}x`
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

