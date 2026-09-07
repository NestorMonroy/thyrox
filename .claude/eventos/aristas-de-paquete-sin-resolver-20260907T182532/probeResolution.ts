// Mide RESOLUCION, no presencia en un mapa. La derivacion anterior comparaba
// el subpath contra el `exports` de la RAIZ y concluia «no resuelve»; el
// sub-paquete puede declararlo por su cuenta. Es el sub-patron C: se midio el
// significante (esta en ese mapa) y se concluyo sobre el mecanismo (resuelve).
const CANDIDATES = [
  '@thyrox/cli/print',
  '@thyrox/cli/secureStorage/keychainPrefetch',
  '@thyrox/cli/structuredIOHelper',
  '@thyrox/headless-sdk/agentSdkTypes',
  '@thyrox/headless-sdk/controlTypes',
  '@thyrox/mcp-runtime/envExpansion',
  '@thyrox/mcp-runtime/types',
  '@thyrox/output/utils/stringUtils',
  '@thyrox/repl/components/IdeOnboardingDialog',
  '@thyrox/repl/doctorDiagnostic',
]
let unresolved = 0
for (const specifier of CANDIDATES) {
  try {
    Bun.resolveSync(specifier, process.cwd())
    console.log(`  RESUELVE      ${specifier}`)
  } catch (error) {
    unresolved++
    console.log(`  NO RESUELVE   ${specifier}  ${(error as Error).message.split('\n')[0]}`)
  }
}
console.log(`\n${CANDIDATES.length - unresolved} de ${CANDIDATES.length} resuelven`)
