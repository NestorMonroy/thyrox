#!/usr/bin/env python3
"""Control de `src/verify/check_model_execution_grant.py` sobre árboles de prueba.

Qué haría fallar a este control:
- que una de las cuatro formas de llegar al runtime local sin grant no se marcara;
- que el ciclo de vida del artefacto (``/api/blobs``, ``/api/create``) se marcara como ejecución;
- que un comentario, una prueba o un doble contaran como código productivo;
- que la frontera eximiera por nombre, o con el grant sin la unidad materializada;
- que el gate publicara un conteo sin ``src/`` que medir.
"""
from __future__ import annotations

import contextlib
import io
import sys
import tempfile
from pathlib import Path

from verify import check_model_execution_grant as gate

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def tree(files: dict[str, str]) -> Path:
    root = Path(tempfile.mkdtemp(prefix="model-execution-grant-"))
    for relative, text in files.items():
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    return root


def kinds(root: Path, boundary: frozenset[str] = frozenset()) -> list[tuple[str, str]]:
    violations, _ = gate.violations_in(root, boundary)
    return [(violation.path, violation.kind) for violation in violations]


root = tree({
    "src/proxy/upstream.ts": "const model = env.THYROX_OPENAI_COMPAT_MODEL\n",
    "src/proxy/declaration.ts": "export const x = openAICompatDeclarationOf(process.env)\n",
    "src/session/pool.sh": 'export THYROX_OPENAI_COMPAT_MODEL="$HP_MODEL"\nURL="http://127.0.0.1:${THYROX_INFRA_OLLAMA_PORT}/v1"\n',
    "src/models/infer.ts": "await fetch(base + '/api/generate', init)\n",
    "src/models/qualify.ts": "import { OllamaApi } from './ollamaApi'\nawait api.chat(body)\n",
})
assert_equal("las cuatro formas se marcan, cada una en su archivo", sorted([
    ("src/models/infer.ts", "direct-inference"),
    ("src/models/qualify.ts", "direct-inference"),
    ("src/proxy/declaration.ts", "model-name-upstream"),
    ("src/proxy/upstream.ts", "model-name-upstream"),
    ("src/session/pool.sh", "managed-runtime-endpoint"),
    ("src/session/pool.sh", "model-name-export"),
]), sorted(kinds(root)))

root = tree({
    "src/models/install.ts": "import { OllamaApi } from './ollamaApi'\nawait api.request('/api/blobs/x')\nawait api.request('/api/create', body)\n",
    "src/chat/session.ts": "await conversation.chat(message)\n",
})
assert_equal("instalar no es ejecutar, y un .chat ajeno a OllamaApi no es el runtime", [], kinds(root))

root = tree({
    "src/proxy/doc.ts": "/**\n * Lee `THYROX_OPENAI_COMPAT_MODEL` y llama a '/api/chat'.\n */\n// THYROX_OPENAI_COMPAT_MODEL\n",
    "src/session/doc.sh": '# export THYROX_OPENAI_COMPAT_MODEL="$M"\n',
    "src/pkg/__tests__/route.test.ts": "env.THYROX_OPENAI_COMPAT_MODEL\n",
    "src/pkg/testing/fake.ts": "if (path === '/api/chat') reply()\n",
    "src/pkg/dist/route.js": "env.THYROX_OPENAI_COMPAT_MODEL\n",
})
assert_equal("comentarios, pruebas, dobles y dist no son código productivo", [], kinds(root))

adapter = "import type { ExecutionGrant } from 'g'\nimport type { ExecutionUnit } from 'u'\nawait fetch(unit + '/api/chat')\n"
grant_only = "import type { ExecutionGrant } from 'g'\nawait fetch(base + '/api/chat')\n"
root = tree({"src/runtime/adapter.ts": adapter, "src/runtime/grantOnly.ts": grant_only, "src/runtime/unlisted.ts": adapter})
boundary = frozenset({"src/runtime/adapter.ts", "src/runtime/grantOnly.ts"})
assert_equal("la frontera exige estar declarada, el grant y la unidad materializada", sorted([
    ("src/runtime/grantOnly.ts", "direct-inference"),
    ("src/runtime/unlisted.ts", "direct-inference"),
]), sorted(kinds(root, boundary)))

empty = Path(tempfile.mkdtemp(prefix="model-execution-grant-empty-"))
out, err = io.StringIO(), io.StringIO()
with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
    code = gate.main(["--root", str(empty)])
assert_equal("sin src/ rehúsa con 2 y no publica conteo", (2, ""), (code, out.getvalue()))

root = tree({"src/session/pool.sh": 'export THYROX_OPENAI_COMPAT_MODEL="$M"\n'})
with contextlib.redirect_stdout(io.StringIO()):
    codes = (gate.main(["--root", str(root), "--strict", "--boundary", str(root / "none.txt")]),
             gate.main(["--root", str(root), "--boundary", str(root / "none.txt")]))
assert_equal("--strict sale 1 con violaciones; sin él, 0", (1, 0), codes)

print(f"test_check_model_execution_grant: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
