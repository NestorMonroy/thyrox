#!/usr/bin/env python3
"""Control de `src/packages/agent/bin/recommend.ts` — la puerta al recomendador.

Lo que tiene que poder fallar, y por eso es el caso central: **la rehusa ante
una clase desconocida**. Un CLI que ante un argumento que no entiende devuelve
la recomendación por defecto es peor que no tenerlo: publica una elección que
nadie midió, con la autoridad de una herramienta. El control comprueba que no
sólo sale 2, sino que **no nombra ningún modelo** — porque un exit 2 que aun
así imprime un candidato deja al operador copiándolo.

El recomendador elige primero un modelo local cualificado y cae a
`claude-cli` declarando el motivo (TASK-THYROX-0705). Cada ejecución recibe su
propio catálogo y sus cualificaciones por `THYROX_MODEL_CATALOG` y
`THYROX_MODEL_QUALIFICATIONS`, para que el estado de la instalación no decida
el resultado de la prueba.
"""
from __future__ import annotations

import json
import os
import pathlib
import shutil
import subprocess
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
CLI = ROOT / "src/packages/agent/bin/recommend.ts"

LOCAL_MODEL = "thyrox-qwen--qwen2.5-3b-instruct:q4_k_m-hf-aaaaaaaaaaaa"
CATALOG_ENTRY = {
    "name": LOCAL_MODEL,
    "repository": "qwen/qwen2.5-3b-instruct",
    "source": "hf",
    "revision": "a" * 40,
    "quantization": "q4_k_m",
    "artifact": {"format": "gguf", "sha256": "b" * 64, "bytes": 1929912432},
    "architecture": "qwen2",
    "attention": {"blockCount": 36, "kvHeadCount": 2, "headDimension": 128},
    "maxContextLength": 32768,
    "defaultKvCacheType": "f16",
    "capabilities": ["completion", "tools"],
    "declaredAt": "2026-10-01T00:00:00Z",
}
MEASURED_CONTEXT_TOKENS = 200_000
QUALIFICATION = {
    "model": LOCAL_MODEL,
    "kind": "task",
    "taskClass": "mecanica",
    "suite": "mecanica-items@1",
    "casesPassed": 6,
    "casesTotal": 6,
    "passed": True,
    "contextTokens": MEASURED_CONTEXT_TOKENS,
    "tokensPerSecond": 21.5,
    "measurementCondition": "isolated",
    "measuredAt": "2026-10-01T01:00:00Z",
}
# Sin la cualificación de protocolo, la de tarea no hace elegible al modelo.
PROTOCOL_QUALIFICATION = {
    **{key: value for key, value in QUALIFICATION.items() if key != "taskClass"},
    "kind": "protocol",
    "suite": "tool-calling@1",
}

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


class LocalHome:
    """Un hogar de modelos locales en un directorio temporal propio."""

    def __init__(self) -> None:
        self.root = pathlib.Path(tempfile.mkdtemp(prefix="recommend-cli-"))
        self.catalog = self.root / "catalog.json"
        self.qualifications = self.root / "qualifications.json"
        # La política declarada de esta suite: permite el modelo de su catálogo y
        # admite el respaldo, así que mide la recomendación sin restringirla. Sin
        # ella regiría la versionada del árbol (src/session/execution_policy.json).
        self.policy = self.root / "execution-policy.json"
        self.policy.write_text(json.dumps({"allowed": [{"runtime": "ollama", "repository": CATALOG_ENTRY["repository"]}],
                                           "fallback": {"enabled": True}}))

    def write_qualified_model(self) -> None:
        self.catalog.write_text(json.dumps({"entries": [CATALOG_ENTRY]}))
        self.qualifications.write_text(json.dumps({"qualifications": [PROTOCOL_QUALIFICATION, QUALIFICATION]}))

    def env(self) -> dict[str, str]:
        return {**os.environ,
                "THYROX_MODEL_CATALOG": str(self.catalog),
                "THYROX_MODEL_QUALIFICATIONS": str(self.qualifications),
                "THYROX_EXECUTION_POLICY": str(self.policy)}

    def remove(self) -> None:
        shutil.rmtree(self.root, ignore_errors=True)


def run(home: LocalHome, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["bun", "run", str(CLI), *args],
                          capture_output=True, text=True,
                          cwd=str(CLI.parent.parent), env=home.env(),
                          stdin=subprocess.DEVNULL)


def parse_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}


def check_provider_catalog(home: LocalHome) -> None:
    """Sin modelos locales: las cuatro clases caen al catálogo del proveedor."""
    for kind in ("mecanica", "analisis", "adversarial", "frontera"):
        r = run(home, kind)
        check(f"«{kind}» sale 0", r.returncode == 0, r.stderr[:120])
        check(f"«{kind}» nombra un modelo del catálogo", "claude-" in r.stdout)
        check(f"«{kind}» declara su esfuerzo", "esfuerzo" in r.stdout)
        check(f"«{kind}» publica su denominador", "excluido(s) con razón" in r.stdout)
        check(f"«{kind}» declara el runtime y el respaldo",
              "runtime claude-cli" in r.stdout and "respaldo" in r.stdout)

    small = run(home, "adversarial", "--context", "20000").stdout
    large = run(home, "adversarial", "--context", "800000").stdout
    check("el contexto entra en la cifra", small != large)


def check_refusals(home: LocalHome) -> None:
    """Lo que no se entiende rehúsa con 2 y sin nombrar ningún modelo."""
    r = run(home, "una-clase-que-no-existe")
    check("una clase desconocida rehúsa con 2", r.returncode == 2, str(r.returncode))
    check("y NO nombra ningún modelo (no hay default)", "claude-" not in r.stdout, r.stdout[:120])
    check("y dice por qué", "no es una clase" in r.stderr)

    for bad in ("0", "-5", "no-es-un-numero"):
        r = run(home, "analisis", "--context", bad)
        check(f"--context {bad} rehúsa con 2", r.returncode == 2)
        check(f"--context {bad} no recomienda nada", "claude-" not in r.stdout)

    r = run(home, "mecanica", "--runtime", "ollama")
    check("--runtime sólo declara claude-cli: ollama rehúsa con 2", r.returncode == 2, str(r.returncode))
    check("y no recomienda nada", "claude-" not in r.stdout and "thyrox-" not in r.stdout)


def check_fallback_json(home: LocalHome) -> None:
    """Archivos ausentes: lista vacía, y el respaldo dice que el catálogo está vacío."""
    r = run(home, "frontera", "--json")
    check("--json sale 0", r.returncode == 0)
    document = parse_json(r.stdout)
    check("--json es JSON válido con su modelo y sus excluidos",
          "model" in document and "excluded" in document and "effort" in document)
    check("--json declara runtime claude-cli y su clase",
          document.get("runtime") == "claude-cli" and document.get("taskClass") == "frontera")
    check("--json nombra la causa: catálogo local vacío",
          "catálogo local vacío" in str(document.get("fallbackReason")))


def check_local_choice(home: LocalHome) -> None:
    """Un modelo local cualificado para la clase gana al catálogo del proveedor."""
    home.write_qualified_model()
    document = parse_json(run(home, "mecanica", "--json").stdout)
    check("cualificado: runtime ollama", document.get("runtime") == "ollama", str(document)[:160])
    check("cualificado: model es el nombre contractual", document.get("model") == LOCAL_MODEL)
    check("cualificado: sin fallbackReason", "fallbackReason" not in document)
    check("cualificado: publica su cualificación",
          document.get("qualification", {}).get("suite") == "mecanica-items@1")
    r = run(home, "mecanica")
    check("cualificado: la salida humana muestra runtime ollama y el modelo",
          r.returncode == 0 and "runtime ollama" in r.stdout and LOCAL_MODEL in r.stdout, r.stderr[:160])

    document = parse_json(run(home, "analisis", "--json").stdout)
    check("otra clase sin cualificación cae a claude-cli",
          document.get("runtime") == "claude-cli"
          and "sin cualificación aprobada" in str(document.get("fallbackReason")))

    document = parse_json(run(home, "mecanica", "--context", "300000", "--json").stdout)
    check("contexto mayor que el medido cae a claude-cli",
          document.get("runtime") == "claude-cli"
          and "contexto medido insuficiente" in str(document.get("fallbackReason")))

    document = parse_json(run(home, "--runtime", "claude-cli", "mecanica", "--json").stdout)
    check("--runtime claude-cli fuerza el proveedor aun con local cualificado",
          document.get("runtime") == "claude-cli" and str(document.get("model", "")).startswith("claude-"))
    check("y queda declarado, no como respaldo",
          document.get("runtimeDeclared") is True and "fallbackReason" not in document)
    r = run(home, "mecanica", "--runtime", "claude-cli")
    check("la salida humana dice que el runtime se declaró", "declarado con --runtime" in r.stdout)


def check_unreadable_files(home: LocalHome) -> None:
    """Un archivo ilegible o inválido rehúsa con su ruta; nunca una lista vacía en silencio."""
    home.write_qualified_model()
    home.catalog.write_text("{ no es json")
    r = run(home, "mecanica")
    check("catálogo ilegible rehúsa con 2", r.returncode == 2, str(r.returncode))
    check("y nombra la ruta del catálogo", str(home.catalog) in r.stderr, r.stderr[:160])
    check("y no recomienda nada", "claude-" not in r.stdout and "thyrox-" not in r.stdout)

    home.write_qualified_model()
    home.qualifications.write_text(json.dumps({"qualifications": [{**QUALIFICATION, "passed": "sí"}]}))
    r = run(home, "mecanica")
    check("cualificaciones inválidas rehúsan con 2", r.returncode == 2, str(r.returncode))
    check("y nombran la ruta de las cualificaciones", str(home.qualifications) in r.stderr, r.stderr[:160])


def check_policy(home: LocalHome) -> None:
    """Con --policy y sin respaldo: sin candidato permitido se bloquea, nunca claude-cli (TASK-THYROX-0773)."""
    home.write_qualified_model()
    policy = home.root / "policy.json"
    policy.write_text(json.dumps({"allowed": [{"runtime": "ollama", "repository": "Qwen/Qwen2.5-7B-Instruct-GGUF"}],
                                  "fallback": {"enabled": False}}))
    r = run(home, "mecanica", "--policy", str(policy), "--json")
    body = parse_json(r.stdout)
    check("sin candidato permitido sale 3", r.returncode == 3, f"{r.returncode} {r.stderr[:120]}")
    check("y el JSON dice bloqueada, sin modelo", body.get("runtime") == "blocked" and "model" not in body, r.stdout[:160])
    check("y NO nombra ningún claude-", "claude-" not in r.stdout + r.stderr, r.stdout[:120])
    r = run(home, "mecanica", "--policy", str(policy), "--runtime", "claude-cli")
    check("--runtime claude-cli contra una política sin respaldo rehúsa con 2", r.returncode == 2, str(r.returncode))
    check("y no nombra ningún claude- como recomendación", "→ claude-" not in r.stdout, r.stdout[:120])


def check_declared_policy(home: LocalHome) -> None:
    """Sin --policy rige la declarada (THYROX_EXECUTION_POLICY): una sesión no tiene que recordar la bandera."""
    home.write_qualified_model()
    home.policy.write_text(json.dumps({"allowed": [{"runtime": "ollama", "repository": "Qwen/Qwen2.5-7B-Instruct-GGUF"}],
                                       "fallback": {"enabled": False}}))
    r = run(home, "mecanica", "--json")
    check("la política declarada sin respaldo bloquea sin --policy (sale 3)", r.returncode == 3,
          f"{r.returncode} {r.stdout[:120]} {r.stderr[:120]}")
    check("y no nombra ningún claude-", "claude-" not in r.stdout + r.stderr, r.stdout[:120])


def main() -> int:
    for scenario in (check_provider_catalog, check_refusals, check_fallback_json,
                     check_local_choice, check_unreadable_files, check_policy, check_declared_policy):
        home = LocalHome()
        try:
            scenario(home)
        finally:
            home.remove()

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: {CLI.name})")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
