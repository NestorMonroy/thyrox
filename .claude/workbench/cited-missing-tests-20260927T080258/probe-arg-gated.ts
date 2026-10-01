// Sonda: ¿ARG_GATED_CMDLETS cubre cada entrada de CMDLET_ALLOWLIST con callback?
import { ARG_GATED_CMDLETS } from '../../../src/packages/shell/src/powershell/dangerousCmdlets.ts'
import { CMDLET_ALLOWLIST } from '../../../src/packages/tool-registry/src/tools/PowerShellTool/readOnlyValidation.ts'
const gated = Object.entries(CMDLET_ALLOWLIST)
  .filter(([, config]) => typeof config.additionalCommandIsDangerousCallback === 'function')
  .map(([name]) => name.toLowerCase())
console.log(`con callback: ${gated.length}; en ARG_GATED_CMDLETS: ${ARG_GATED_CMDLETS.size}`)
console.log('faltan:', gated.filter(n => !ARG_GATED_CMDLETS.has(n)))
console.log('sobran:', [...ARG_GATED_CMDLETS].filter(n => !gated.includes(n)))
