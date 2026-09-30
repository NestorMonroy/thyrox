#!/usr/bin/env bash
# Convierte una prueba de omniroute (node:test) a bun:test para @thyrox/mitm.
# Uso: port_test.sh <prueba-de-referencia> <destino> <ruta-fuente-ref> <ruta-fuente-thyrox>
# La ruta fuente reescribe el import del módulo bajo prueba (p. ej.
# src/mitm/tproxy/ -> src/tproxy/). Los `await import(...)` de nivel superior
# pasan a importaciones estáticas.
set -euo pipefail
src="$1" dst="$2" from="$3" to="$4"
name=$(basename "$src")
{
  printf '// Portado de omniroute: tests/unit/%s (MIT), sobre bun:test.\n' "$name"
  perl -0pe '
    s{import\s+test\s+from\s+"node:test";}{import { test } from "bun:test";}g;
    s{import\s+\{\s*test\s*\}\s+from\s+"node:test";}{import { test } from "bun:test";}g;
    s{import\s+\{\s*describe,\s*it\s*\}\s+from\s+"node:test";}{import { describe, it } from "bun:test";}g;
    s#const\s+(\{[^}]*\})\s*=\s*await\s+import\(\s*("[^"]+")\s*\);#import $1 from $2;#gs;
  ' "$src" | FROM="$from" TO="$to" gawk '{ i = index($0, ENVIRON["FROM"]); while (i) { $0 = substr($0, 1, i-1) ENVIRON["TO"] substr($0, i + length(ENVIRON["FROM"])); i = index($0, ENVIRON["FROM"]) } print }'
} > "$dst"
