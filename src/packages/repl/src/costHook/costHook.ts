import { useEffect } from 'react'
import { formatTotalCost, saveCurrentSessionCosts } from '@thyrox/provider/costTracker.js'
import { hasConsoleBillingAccess } from '@thyrox/provider/billing.js'
import type { FpsMetrics } from '@thyrox/output/fpsTracker.js'

export function useCostSummary(
  getFpsMetrics?: () => FpsMetrics | undefined,
): void {
  useEffect(() => {
    const f = () => {
      if (hasConsoleBillingAccess()) {
        process.stdout.write('\n' + formatTotalCost() + '\n')
      }

      saveCurrentSessionCosts(getFpsMetrics?.())
    }
    process.on('exit', f)
    return () => {
      process.off('exit', f)
    }
  }, [])
}
