// House rake (5%)
export const RAKE = 0.05

/**
 * Calculate the odds multiplier for a given pool side
 * @param myPool - Total amount bet on my side (UP or DOWN)
 * @param opposingPool - Total amount bet on opposing side
 * @returns Multiplier (e.g., 1.8 means $1 bet returns $1.80)
 */
export function calculateOdds(myPool: number, opposingPool: number): number {
  if (myPool === 0) return 0
  const totalPool = myPool + opposingPool
  const poolAfterRake = totalPool * (1 - RAKE)
  return poolAfterRake / myPool
}

/**
 * Calculate potential payout for a specific bet
 * @param myBet - Amount I'm betting
 * @param myPool - Total in my side (including my bet)
 * @param opposingPool - Total in opposing side
 * @returns Potential payout amount
 */
export function calculatePotentialPayout(
  myBet: number,
  myPool: number,
  opposingPool: number
): number {
  if (myPool === 0) return 0
  const totalPool = myPool + opposingPool
  const poolAfterRake = totalPool * (1 - RAKE)
  const myShare = myBet / myPool
  return poolAfterRake * myShare
}

/**
 * Calculate actual payout after round resolution
 * @param userBet - Amount user bet
 * @param userDirection - Direction user bet on ('up' or 'down')
 * @param outcome - Actual outcome ('up' or 'down')
 * @param pools - Final pool amounts
 * @returns Payout amount (0 if lost, positive if won)
 */
export function calculatePayout(
  userBet: number,
  userDirection: 'up' | 'down',
  outcome: 'up' | 'down',
  pools: { up: number; down: number }
): number {
  if (userDirection !== outcome) {
    return 0 // Lost
  }
  
  const myPool = pools[userDirection]
  const opposingPool = pools[userDirection === 'up' ? 'down' : 'up']
  
  return calculatePotentialPayout(userBet, myPool, opposingPool)
}

