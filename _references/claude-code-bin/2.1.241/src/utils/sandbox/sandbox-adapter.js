// ==========================================================================
// utils/sandbox/sandbox-adapter.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/utils/sandbox/sandbox-adapter.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 80  (4 cadena, 76 nombre)
//   descartadas por ruido (>400 aparic.) : 63
//   sitios de co-ocurrencia : 99  (se emiten los 6 de mayor cruce)
//   regiones emitidas  : 4
//
// COMO SE LOCALIZO. El minificador mangla los identificadores
// locales y preserva los literales de cadena y las claves de
// objeto. Un ancla frecuente no discrimina sola; se cruza con
// las demas del mismo archivo en una ventana de 4000 B.
//
// La puntuacion de un sitio NO es su numero de anclas: es la
// suma de log10(ventanas/apariciones)/grado de cada una. El
// grado es en cuantos archivos del arbol aparece el ancla: un
// nombre que citan doce fragmentos no es de ninguno. El umbral
// se DERIVA del bundle — aqui 3.85 = log10(7062).
// ==========================================================================

// --- bundle[5422384:5422945]  (561 B)
//     especificidad 113.609 · 50 anclas — 'settingsSubscriptionCleanup'(×3 g1), 'getLinuxGlobPatternWarnings'(×4 g1), 'getSandboxUnavailableReason'(×4 g1), 'isSandboxEnabledInSettings'(×4 g1), 'isSandboxRequired'(×4 g1) …
et=Le?{allowedDomains:void 0,deniedDomains:[],allowAllUnixSockets:!0}:{allowedDomains:s,deniedDomains:a,...Object.keys(l).length>0&&{deniedDomainReasons:l},strictAllowlist:vNt().some((Qe)=>Qe?.sandbox?.network?.strictAllowlist===!0)||void 0,allowUnixSockets:e.sandbox?.network?.allowUnixSockets,allowAllUnixSockets:e.sandbox?.network?.allowAllUnixSockets,allowLocalBinding:e.sandbox?.network?.allowLocalBinding,allowMachLookup:e.sandbox?.network?.allowMachLookup,httpProxyPort:e.sandbox?.network?.httpProxyPort,socksProxyPort:e.sandbox?.network?.socksProxyPort}

// --- bundle[4947651:4948057]  (406 B)
//     especificidad 62.493 · 29 anclas — 'getLinuxGlobPatternWarnings'(×4 g1), 'cleanupAfterCommand'(×5 g1), 'getNetworkRestrictionConfig'(×5 g1), 'isSupportedPlatform'(×5 g1), 'updateConfig'(×5 g1) …
async(g,y,_,b)=>{l(i,g),l(s,y);let S=b||t.caCertThumb!==_;if(S){let w=$7.join(n,`.trust.${process.pid}.${Date.now()}.pem`);f9.writeFileSync(w,g);try{await fRv(w,{srtWin:e.srtWin})}finally{f9.rmSync(w,{force:!0})}}return Yo(`[Sandbox Windows] persistent CA ${b?"generated":"reused"} (thumb=${_}${S&&!b?", trust reconciled":""})`),{certPem:g,keyPem:y,certPath:i,keyPath:s,thumbprint:_,generated:b,trusted:S}}

// --- bundle[21429867:21430086]  (219 B)
//     especificidad 36.872 · 17 anclas — 'isSandboxEnabledInSettings'(×4 g1), 'enabledPlatforms'(×5 g1), 'isPlatformInEnabledList'(×5 g1), 'isSupportedPlatform'(×5 g1), 'setSandboxSettings'(×5 g1) …
children:["seccomp filter:"," ",Lvn?$l.jsx(v,{color:"warning",children:"not installed"}):$l.jsx(v,{color:"success",children:"installed"}),Lvn&&$l.jsx(v,{dimColor:!0,children:" (required to block unix domain sockets)"})]

// --- bundle[1131303:1133930]  (2627 B)
//     especificidad 28.756 · 15 anclas — 'allowLocalBinding'(×8 g1), 'deniedDomains'(×10 g1), 'allowManagedDomainsOnly'(×12 g1), 'socksProxyPort'(×18 g1), 'allowWrite'(×26 g1) …
()=>ye({allowedDomains:ft(O()).optional(),deniedDomains:ft(O()).optional().describe("Domains that are always blocked, even if matched by allowedDomains. Supports the same wildcard syntax as allowedDomains. Merged from all settings sources regardless of allowManagedDomainsOnly."),strictAllowlist:Bt().optional().describe("When true, the sandbox runtime deterministically denies hosts not in allowedDomains instead of prompting. "+"Enforced for sandboxed commands only \u2014 in-process tools such as WebFetch are not gated by this setting. "+"Only honored from user, managed/policy, or CLI (--settings) settings \u2014 "+"project settings (.claude/settings.json and .claude/settings.local.json) are ignored."),allowManagedDomainsOnly:Bt().optional().describe("When true (and set in managed settings), only allowedDomains and WebFetch(domain:...) allow rules from managed settings are respected. User, project, local, and flag settings domains are ignored. Denied domains are still respected from all sources."),allowUnixSockets:ft(O()).optional().describe("macOS only: Unix socket paths to allow. Ignored on Linux (seccomp cannot filter by path)."),allowAllUnixSockets:Bt().optional().describe("If true, allow all Unix sockets (disables blocking on both platforms)."),allowLocalBinding:Bt().optional(),allowMachLookup:ft(O().refine((e)=>!(e.endsWith("*")?e.slice(0,-1):e).includes("*"),{message:'Wildcards are only allowed as a single trailing "*" (e.g., "com.example.*" or "*" for all services).'})).optional().describe('macOS only: Additional XPC/Mach service names to allow looking up. Supports trailing-wildcard prefix matching (e.g., "com.apple.coresimulator.*"). Needed for tools that communicate via XPC such as the iOS Simulator or Playwright.'),httpProxyPort:Xe().optional(),socksProxyPort:Xe().optional(),tlsTerminate:ye({caCertPath:O().min(1).optional(),caKeyPath:O().min(1).optional()}).optional().describe("[EXPERIMENTAL] Enable in-process TLS termination so the per-request filter can see HTTPS request bodies. Provide a CA cert+key, or omit both to have sandbox-runtime generate an ephemeral one for the session. On native Windows an ephemeral CA cannot pass the sandbox trust check, so omitting the paths uses a persistent CA managed by the sandbox runtime (set up and trusted via /sandbox install); configured paths are passed to the sandbox runtime verbatim, which rejects a bad or incomplete pair at sandbox initialization. "+"Only honored from user, managed/policy, or CLI (`--settings`) settings \u2014 project settings "+"(.claude/settings.json and .claude/settings.local.json) are ignored.")}).optional()

// Habia 99 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
