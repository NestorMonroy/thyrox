"""Suite del detector de los momentos en que GNU Parallel es la forma.

El episodio: para trazar el commit de origen de 97 archivos se escribió un
bucle de shell con un `git log --follow` por archivo. No terminó en 120 s, el
cliente lo mandó a segundo plano fuera del ledger y hubo que cancelarlo; el
mismo trabajo con `parallel -j8 -k` terminó en 3 min 38 s con 7 min de CPU
repartidos —la versión en serie habría pagado esos 7 min de pared—. La
versión paralela ya había funcionado y aun así el primer impulso fue el bucle.

El control que puede fallar: cada momento tiene su gemelo que no lo es —un
bucle de sólo builtins, uno que escribe el índice de git (un único escritor:
en paralelo chocaría en `index.lock`), una lista literal corta y un `xargs`
que ya lleva `-P`—.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_parallel_opportunity.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

OK = 0
FAILED = 0


def check(name: str, expected: bool, command: str) -> None:
    global OK, FAILED
    got = gate.detect({"tool_name": "Bash", "tool_input": {"command": command}}) is not None
    if got == expected:
        OK += 1
        print(f"  ok    {name}")
    else:
        FAILED += 1
        print(f"  FALLA {name} — esperado {'aviso' if expected else 'silencio'}")


print("test_detect_parallel_opportunity:")
EPISODE = ("for f in $(git ls-files -- .claude/cache); do c=$(git log --follow --diff-filter=A "
           "--format='%h' -- \"$f\" | tail -1); echo \"$c $f\"; done > origen.txt")
check("el bucle real del episodio avisa", True, EPISODE)
check("un while read con un comando externo por línea avisa", True,
      "while read f; do grep -c TODO \"$f\"; done < archivos.txt")
check("xargs sin -P avisa", True, "git ls-files | xargs -n1 wc -l")
check("un bucle de sólo builtins calla", False, 'for f in $(cat lista); do echo "$f"; done')
check("un bucle que escribe el índice de git calla (un solo escritor)", False,
      'for f in $(git ls-files -- a); do git mv "$f" "b/$f"; done')
check("una lista literal corta calla", False, "for p in api ui; do git -C $p status; done")
check("xargs -P ya es paralelo", False, "git ls-files | xargs -P4 -n1 wc -l")
check("parallel ya es la forma, aunque la línea traiga un xargs", False,
      "git ls-files | xargs -n2 echo | parallel -j8 -k 'wc -l {}'")
check("otra herramienta no se mira", False, "")
got = gate.detect({"tool_name": "Write", "tool_input": {"file_path": "x", "content": EPISODE}})
if got is None:
    OK += 1
    print("  ok    sólo mira Bash")
else:
    FAILED += 1
    print("  FALLA sólo mira Bash")
hint = gate.detect({"tool_name": "Bash", "tool_input": {"command": EPISODE}}) or ""
if "parallel" in hint and "-k" in hint:
    OK += 1
    print("  ok    el aviso nombra parallel y su -k (orden de salida)")
else:
    FAILED += 1
    print("  FALLA el aviso nombra parallel y su -k (orden de salida)")

print(f"test_detect_parallel_opportunity: {OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
