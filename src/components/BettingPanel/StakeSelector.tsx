import { useState } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '../../stores/userStore'

const PRESET_AMOUNTS = [1, 5, 10, 20]

export function StakeSelector() {
  const { selectedStake, setSelectedStake, balance } = useUserStore()
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  
  const handlePresetClick = (amount: number) => {
    setSelectedStake(amount)
    setShowCustom(false)
  }
  
  const handleCustomSubmit = () => {
    const value = parseFloat(customValue)
    if (!isNaN(value) && value > 0 && value <= balance) {
      setSelectedStake(value)
      setShowCustom(false)
      setCustomValue('')
    }
  }
  
  const isPresetSelected = (amount: number) => 
    selectedStake === amount && !showCustom
  
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        {/* Preset amounts */}
        {PRESET_AMOUNTS.map((amount) => (
          <motion.button
            key={amount}
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePresetClick(amount)}
            disabled={amount > balance}
            className={`
              flex-1 py-3 rounded-lg font-mono font-bold text-sm
              transition-all duration-150
              disabled:opacity-30 disabled:cursor-not-allowed
              touch-manipulation
              ${isPresetSelected(amount)
                ? 'bg-text-primary text-bg-primary'
                : 'bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80'
              }
            `}
          >
            ${amount}
          </motion.button>
        ))}
        
        {/* Custom button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCustom(!showCustom)}
          className={`
            flex-1 py-3 rounded-lg font-medium text-sm
            transition-all duration-150
            touch-manipulation
            ${showCustom || !PRESET_AMOUNTS.includes(selectedStake)
              ? 'bg-text-primary text-bg-primary'
              : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'
            }
          `}
        >
          {!PRESET_AMOUNTS.includes(selectedStake) ? `$${selectedStake}` : 'Custom'}
        </motion.button>
      </div>
      
      {/* Custom input */}
      {showCustom && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mt-3 flex gap-2"
        >
          <input
            type="number"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Enter amount"
            min="0.01"
            max={balance}
            step="0.01"
            className="flex-1 px-4 py-3 rounded-lg bg-bg-tertiary text-text-primary font-mono text-center outline-none border-2 border-transparent focus:border-text-primary transition-colors"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCustomSubmit}
            className="px-6 py-3 rounded-lg bg-text-primary text-bg-primary font-bold touch-manipulation"
          >
            Set
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}

