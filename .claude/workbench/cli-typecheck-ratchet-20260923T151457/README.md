# check-cli-typecheck: de binario a trinquete

Episodio (2026-09-23): un lote de imports sin uso bajaba el total de tsc de
4 787 a 4 493 sin diagnósticos nuevos, y el pre-commit lo bloqueó porque 4 de
sus archivos eran del paquete `cli`, ya rojo antes del lote. El gate exigía
«compila entero»: bloqueaba TODO commit que tocara `cli`, también los que
bajaban errores. La única salida era `--no-verify`, que vuelve decorativo al
gate.

Cambio: con baseline declarado (`.claude/baselines/cli_typecheck_baseline.txt`,
`<proyecto> <conteo>`), `--strict` bloquea sólo si el conteo CRECE; si baja,
pide bajar el baseline. Sin baseline, la conducta binaria no cambia. El estado
«workspace sin enlazar» sigue rehusando con exit 2.

Anulación (`annulled.txt`): con el bloque del trinquete desactivado caen
exactamente los 5 casos que dependen de él; «conteo sobre el baseline sale 1»
sobrevive porque la conducta binaria también bloquea. `restored.txt`: 16/16.

Métrica: líneas `error TS` por proyecto de `cli`.
Ciega a: un commit que arregla N errores y crea N distintos — el conteo no
cambia. Por eso bajar el baseline es una edición explícita, no automática.
