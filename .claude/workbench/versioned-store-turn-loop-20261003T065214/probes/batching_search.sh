#!/usr/bin/env bash
# EXPERIMENTAL — medición exploratoria escrita antes de cerrar Search Existing:
# no es autoridad, ni producto, ni evidencia de aceptación por sí sola.
# Busca por comportamiento (no por nombre) mecanismos de journal, write-behind,
# checkpoint, flush, batching, coalescing, snapshot, delta y finalización de
# sesión en todo lo versionado; agrupa por área y lista los archivos de código.
set -u
cd "${1:?raíz de thyrox}"
OUT="${2:?directorio de salida}"
P='journal|write[-_ ]?buffer|write[-_ ]?behind|checkpoint|flush|commit[-_ ]?batch|batch[-_ ]?commit|transaction[-_ ]?batch|batch(ed|ing)?[-_ ]?(write|insert)|coalesc|snapshot|delta|event[-_ ]?aggregat|session[-_ ]?finaliz|finalize[-_ ]?session|deferred[-_ ]?(persist|write)|persist[-_ ]?(later|deferred)|diferid|volcar|volcado|acumul'
git grep -lEi "$P" -- . > "$OUT/batching-files.txt"
gawk -F/ '{k=($1==".claude")?$1"/"$2:($1=="src"&&$2=="packages")?$1"/"$2"/"$3:$1"/"$2; c[k]++} END{for(k in c) printf "%d\t%s\n", c[k], k}' "$OUT/batching-files.txt" | sort -k1nr > "$OUT/batching-by-area.tsv"
# Código que, además, toca el store o agent_sessions: el cruce que importa.
grep -E '^(src|bin|tests|\.githooks)/' "$OUT/batching-files.txt" \
  | xargs -r git grep -lE 'agent_store|agent_sessions|agent-results|openLocal|STORE_PATH|storePath' -- > "$OUT/batching-x-store.txt"
git grep -nEi "$P" -- $(cat "$OUT/batching-x-store.txt") > "$OUT/batching-x-store-lines.txt"
wc -l "$OUT"/batching-*.txt
