#!/usr/bin/env bash
# Reproduce el defecto de Bun.build (1.3.11, splitting + packages external):
# un `export * from '<externo>'` en un módulo que otro carga con require() queda
# DENTRO del envoltorio __esm(() => { … }) y el chunk no parsea. Con
# `export type * from` (sólo tipos, borrado al compilar) el chunk carga.
# Salida esperada: "star: <línea de error>" y "typestar: 1 2".
set -uo pipefail
S="$(mktemp -d)"; trap 'rm -rf "${S:?}"' EXIT
mkdir -p "$S/node_modules/ext" "$S/src"
echo '{"name":"ext","type":"module","exports":{".":"./index.js"}}' > "$S/node_modules/ext/package.json"
echo 'export const a = 1; export function b(){return 2}' > "$S/node_modules/ext/index.js"
for form in star typestar; do
  if [[ $form == star ]]; then echo "export * from 'ext'" > "$S/src/shim.ts"; else echo "export type * from 'ext'" > "$S/src/shim.ts"; fi
  echo "export { a, b } from 'ext'" >> "$S/src/shim.ts"
  echo "import { a } from './shim.ts'; export const useA = () => a" > "$S/src/user.ts"
  echo "export function lazy(){ return require('./user.ts').useA() }" > "$S/src/host.ts"
  (cd "$S" && rm -rf dist && bun build src/host.ts src/shim.ts --outdir dist --target bun --splitting --packages external >/dev/null 2>&1)
  printf '%s: ' "$form"
  bun -e "const h = await import('$S/dist/host.js'); const s = await import('$S/dist/shim.js'); console.log(h.lazy(), s.b())" </dev/null 2>&1 | grep -m1 -E "SyntaxError|^[0-9]+ [0-9]+$"
done
