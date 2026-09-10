// ==========================================================================
// services/extractMemories/prompts.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/services/extractMemories/prompts.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 4  (0 cadena, 4 nombre)
//   descartadas por ruido (>400 aparic.) : 6
//   sitios de co-ocurrencia : 1
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

// --- bundle[11486809:11487115]  (306 B)
//     especificidad 6.991 · 4 anclas — 'strategy'(×25 g1), 'efficient'(×38 g1), 'limited'(×253 g1), 'parallel'(×158 g2)
d=`You have a limited turn budget. ${Il} requires a prior ${ks} of the same file, so the efficient strategy is: turn 1 \u2014 issue all ${ks} calls in parallel for every file you might update; turn 2 \u2014 issue all ${Au}/${Il} calls in parallel. Do not interleave reads and writes across multiple turns.`

