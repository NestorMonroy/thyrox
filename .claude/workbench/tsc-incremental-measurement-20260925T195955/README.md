# tsc incremental en el worktree de medición

Pregunta: ¿recorta `tsc --incremental` la medición de un candidato del lazo
tsc cero? Medido el 2026-09-25 sobre `thyrox-medicion` en HEAD `191ba7db`,
en serie (cuatro tsc a la vez se estorban hasta 9x en 4 núcleos), n=1 por
forma, con el CPU libre.

| Forma | Segundos | Diagnósticos frente al completo |
|---|---|---|
| completo | 41.8 | 202 |
| `--incremental` en frío | 43.8 | idénticos |
| `--incremental` en caliente, sin cambios | **9.6** | idénticos |
| `--incremental` tras editar un archivo | **47.5** | mismos errores, texto distinto |
| `+ --declaration --emitDeclarationOnly`, en frío | 43.0 | idénticos |
| `+ --declaration --emitDeclarationOnly`, tras editar | 47.5 | mismos errores, texto distinto |

La edición fue un comentario añadido a `AttachmentMessage.tsx`, revertido.
Los dos `*-ts2209.log` son una primera corrida con declaraciones que abortó
por configuración (`rootDir`): no son una medición y se conservan
etiquetados para que nadie los lea como tal.

## Conclusiones

1. **Incremental no recorta el caso que importa.** Medir un candidato
   implica una edición, y tras una edición tsc tarda lo mismo que completo.
   Sólo gana 4.4x cuando nada cambió, y ese caso el pipeline ya lo resuelve
   reutilizando el log base.
2. **La hipótesis de la firma de declaración queda refutada.** Con
   `--declaration` tampoco baja: una edición de comentario sigue costando
   un chequeo completo. Por qué, en este programa monolítico, queda sin
   medir. El suelo de tsc aquí son unos 10 s; el resto es chequeo.
3. **El hallazgo que sí cambia el lazo: la clave del verificador.** Tras la
   edición, los 202 errores eran los mismos (archivo, línea y código), pero
   6 salían con las uniones en otro orden. `stable_key` normalizaba sólo las
   uniones del primer nivel; 4 de los 6 eran anidadas y se leían como
   diagnósticos nuevos. Ahora se normalizan a cualquier profundidad
   (`compare-full-vs-after-edit-nested-key.txt`: 6 -> 2). Las 2 que quedan
   no son de orden: tsc imprime el mismo tipo con otra forma.

## Consecuencia para el plan

La palanca para la ruta 2 no es incremental sino N=2 worktrees en paralelo.
Los `.tsbuildinfo` de esta medición no se versionan: no aceleran el lazo.

*Métrica:* reloj de pared de cada forma y comparación de diagnósticos con
`bin/tsc_cycle compare`.
*Ciega a:* la variación entre corridas (n=1), otras ediciones que no sean un
comentario, y `--assumeChangesOnlyAffectDirectDependencies`, que no se midió.
