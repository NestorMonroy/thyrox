#!/usr/bin/env bash
# Convierte las dos tablas de casos de ExtractUpstreamErrorSummary de
# CLIProxyAPI (Go) en una suite bun:test. Los literales de Go valen en
# JavaScript salvo dos: `strings.Repeat` y la cadena cruda entre comillas
# invertidas, que pasa a String.raw (ninguna lleva «${»).
set -euo pipefail
REF=/home/user/thyrox/_references/cliproxyapi
DST=/home/user/thyrox/src/packages/provider/__tests__/proxyUpstreamErrorSummary.test.ts
table() { # archivo, desde, hasta
  sed -n "$2,$3p" "$REF/$1" | gawk '{
    line = gensub(/strings\.Repeat\(([^,]+), ([0-9]+)\)/, "(\\1).repeat(\\2)", "g")
    print gensub(/`([^`]*)`/, "String.raw`\\1`", "g", line)
  }'
}
{
  cat <<'HEAD'
/**
 * El resumen saneado del último error del upstream — casos de CLIProxyAPI
 * `sdk/cliproxy/auth/conductor_selection_cooldown_test.go`
 * (TestExtractUpstreamErrorSummary_AuthPackageDirectSanitization) y
 * `sdk/api/handlers/handlers_error_response_test.go`
 * (TestExtractUpstreamErrorSummary_SanitizationAndTruncation), convertidos
 * por `port-tables.sh` del banco.
 */
import { describe, expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { extractUpstreamErrorSummary } = (await import(
  process.env.UPSTREAM_ERROR_SUMMARY_MODULE ?? '../src/proxy/upstreamErrorSummary.ts'
)) as typeof import('../src/proxy/upstreamErrorSummary.ts')

type Case = { name: string; input: string; wantMask: string; wantExact?: string; forbiddenRaw?: string }

function check(cases: Case[]) {
  for (const tc of cases) {
    test(tc.name, () => {
      const got = extractUpstreamErrorSummary(tc.input)
      expect(got).toContain(tc.wantMask)
      if (tc.wantExact) expect(got).toBe(tc.wantExact)
      if (tc.forbiddenRaw) expect(got).not.toContain(tc.forbiddenRaw)
      expect([...got].length).toBeLessThanOrEqual(256)
    })
  }
}

describe('paquete auth', () => check([
HEAD
  table sdk/cliproxy/auth/conductor_selection_cooldown_test.go 403 780
  printf '%s\n' ']))' '' "describe('manejadores', () => check(["
  table sdk/api/handlers/handlers_error_response_test.go 423 815
  printf '%s\n' ']))'
  # Los casos propios (desde su marcador hasta el final) no vienen de la
  # referencia: se conservan de la versión anterior del archivo.
  [[ -f "$DST" ]] && gawk '/^\/\/ Casos propios/ { own = 1; print "" } own' "$DST"
} > "$DST.new" && mv "$DST.new" "$DST"
