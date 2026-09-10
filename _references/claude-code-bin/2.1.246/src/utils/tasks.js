// ==========================================================================
// utils/tasks.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/utils/tasks.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 4  (0 cadena, 4 nombre)
//   descartadas por ruido (>400 aparic.) : 3
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

// --- bundle[21094299:21094528]  (229 B)
//     especificidad 4.116 · 2 anclas — 'integration'(×53 g1), 'blockedBy'(×72 g1)
bM$=Txo.queries.length===0?"":Txo.failCount>0?`

${rt.cross} Evaluation failed`:Txo.skippedCount===Txo.queries.length?`

${rt.info} Eval queries validated; trigger tests pending model integration`:`

${rt.tick} Evaluation passed`

