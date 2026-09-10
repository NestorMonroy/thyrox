// ==========================================================================
// types/permissions.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/types/permissions.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 11  (3 cadena, 8 nombre)
//   descartadas por ruido (>400 aparic.) : 12
//   sitios de co-ocurrencia : 25  (se emiten los 6 de mayor cruce)
//   regiones emitidas  : 1
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

// --- bundle[4827019:4827280]  (261 B)
//     especificidad 7.575 · 5 anclas — 'dontAsk'(×45 g1), 'acceptEdits'(×62 g1), 'ruleBehavior'(×62 g1), 'bypassPermissions'(×121 g2), 'ruleContent'(×207 g4)
function eAp(e,t){if(JS(t,J4)!==null||P7(t,J4)!==null)return!1;let r=qne(e,t);if(r.behavior==="allow")return!0;if(r.behavior!=="ask")return!1;if(t.mode!=="bypassPermissions")return!1;let n=r.decisionReason;return!(n?.type==="rule"&&n.rule.ruleBehavior==="ask")}

// Habia 25 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
