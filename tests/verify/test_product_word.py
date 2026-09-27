#!/usr/bin/env python3
"""Control de `src/verify/check_product_word.py`.

El producto se llama thyrox, y por decisión del ejecutor (2026-09-27) también
lo dice el texto que nombra una oferta o un servicio de Anthropic. El gate
cuenta cada aparición de «Claude», por archivo, y congela la deuda para que
sólo pueda bajar.

Qué haría fallar a este control:
- dejar fuera un nombre de servicio de Anthropic (una línea real de
  `repl/src` con `isClaudeAISubscriber` daría 0 en vez de 1);
- no contar la voz del agente (la línea real «What should Claude do
  instead?» daría 0);
- aceptar una aparición nueva en un archivo que el baseline ya lista con
  menos, o en un archivo que no lista;
- publicar un cero sin poder medir (raíz inexistente: exit 2).

Con la lista de nombres ajenos anterior (claude.ai, Claude in Chrome, Claude
Desktop, el consentimiento) caen exactamente los cinco casos que la decisión
del 2026-09-27 cambió: es el estado rojo previo a vaciarla.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from verify import check_product_word as gate

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


print("test_product_word:")

# Líneas reales de src/packages/repl/src (2026-09-27).
assert_equal("la voz del agente cuenta",
             1, gate.product_occurrences("<Text dimColor>· What should Claude do instead?</Text>"))
assert_equal("el nombre del producto cuenta",
             1, gate.product_occurrences(" * Install or update Claude CLI package in the local directory"))
# Decisión del ejecutor 2026-09-27: todo texto dice thyrox, también el que
# nombra una oferta o un servicio de Anthropic. Ya no hay nombres ajenos.
assert_equal("la cuenta de claude.ai también cuenta",
             1, gate.product_occurrences("  if (!isClaudeAISubscriber()) return null"))
assert_equal("Claude in Chrome también cuenta",
             2, gate.product_occurrences("import { ClaudeInChromeOnboarding } from './ClaudeInChromeOnboarding.js'"))
assert_equal("Claude Desktop también cuenta",
             1, gate.product_occurrences("        setError(result.error ?? 'Failed to open Claude Desktop')"))
assert_equal("el texto de consentimiento también cuenta",
             1, gate.product_occurrences("            <Text bold>You can help improve Claude </Text>"))
assert_equal("un identificador del producto cuenta",
             1, gate.product_occurrences("const dir = getClaudeConfigHomeDir()"))
assert_equal("dos apariciones en una línea cuentan las dos",
             2, gate.product_occurrences("Claude asks claude.ai via loginWithClaudeAi"))


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True)


with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    git(base, "init", "-q")
    (base / "src").mkdir()
    (base / "src/a.ts").write_text("// Claude does it\nconst ok = true\n")
    (base / "src/b.ts").write_text("const x = 1\n")
    git(base, "add", ".")
    measured = gate.measure(base, "src")
    assert_equal("mide por archivo versionado", {"src/a.ts": 1}, measured)

    baseline = base / "baseline.tsv"
    gate.write_baseline(baseline, measured)
    assert_equal("con su baseline no hay deuda nueva", {}, gate.new_debt(measured, gate.load_baseline(baseline)))

    (base / "src/a.ts").write_text("// Claude does it\n// Claude again\n")
    (base / "src/b.ts").write_text("// Claude here too\n")
    grown = gate.measure(base, "src")
    assert_equal("crecer en un archivo listado o aparecer en uno nuevo es deuda",
                 {"src/a.ts": (1, 2), "src/b.ts": (0, 1)}, gate.new_debt(grown, gate.load_baseline(baseline)))
    assert_equal("el CLI sale 1 con deuda nueva",
                 1, gate.main(["--repo", str(base), "--baseline", str(baseline), "--strict"]))
    assert_equal("el CLI sale 2 si la raíz no existe",
                 2, gate.main(["--repo", str(base), "--root", "nope", "--baseline", str(baseline)]))

print(f"test_product_word: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
