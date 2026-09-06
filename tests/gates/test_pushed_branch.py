"""Pruebas de ``gates.check_pushed_branch`` — el gate de la rama publicada.

El episodio que lo origina (2026-09-06): un push nombró por literal la rama
designada por el harness. En `thyrox` esa rama no existe y el push falló a
gritos; en `kaupamex-docs` SI existe —en `9262c7608`, la base compartida— y
estaba al día, así que git respondió «Everything up-to-date» mientras la rama
de trabajo `feature/kaupamex-l4` se quedaba dos commits sin publicar.

La frase era VERDADERA sobre la rama nombrada y falsa sobre la pregunta que
alguien se hacía al leerla. Es el sub-patrón D de
`metrica-decide-la-conclusion.md` con git como instrumento: el verde no
distingue «no hay nada que publicar» de «medí otra rama».
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from gates import check_pushed_branch as gate  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


print("== 1. la rama de trabajo VA en el push: pasa, aunque tenga commits ==")
v = gate.verdict(pushed_refs=["refs/heads/feature/thyrox-l0"],
                 current_branch="feature/thyrox-l0", ahead=2)
check("veredicto OK", gate.PASS, v.status)

print("== 2. EL EPISODIO: se publica otra rama y la de trabajo queda atras ==")
v = gate.verdict(pushed_refs=["refs/heads/claude/kaupamex-nuevo-entorno-nrcglx"],
                 current_branch="feature/kaupamex-l4", ahead=2)
check("veredicto REFUSE", gate.REFUSE, v.status)
# NO DISCRIMINA, y se deja declarado: el `PASS` de la rama al día también
# nombra la rama de trabajo, así que esta aserción sobrevive a la anulación.
# Medido: al retirar el rechazo caen 3 de las 4 de este caso, no las 4.
check("nombra la rama de trabajo (no discrimina)", True, "feature/kaupamex-l4" in v.reason)
# Ésta SI discrimina: el comando derivado sólo lo emite el rechazo.
check("ensena a DERIVAR la rama, no a teclearla", True, "branch --show-current" in v.reason)
check("nombra la rama que SI se publica", True, "claude/kaupamex-nuevo-entorno-nrcglx" in v.reason)
check("publica cuantos commits se quedan atras", True, "2" in v.reason)

print("== 3. CONTROL que discrimina: otra rama, pero la de trabajo AL DIA ==")
# Sin este caso, un gate que rehusara SIEMPRE que la rama no coincide pasaria
# el caso 2 igual. El verde no separaria «mide el riesgo» de «prohibe publicar
# cualquier otra rama», que es una conducta distinta y molesta.
v = gate.verdict(pushed_refs=["refs/heads/otra"],
                 current_branch="feature/kaupamex-l4", ahead=0)
check("veredicto OK — no hay trabajo que perder", gate.PASS, v.status)

print("== 4. varias refs: basta con que la de trabajo este entre ellas ==")
v = gate.verdict(pushed_refs=["refs/heads/otra", "refs/heads/feature/kaupamex-l4"],
                 current_branch="feature/kaupamex-l4", ahead=5)
check("veredicto OK", gate.PASS, v.status)

print("== 5. sin refs (git no paso ninguna): NO se emite veredicto ==")
# Un gate que no midio nada no autoriza. Emitir PASS aqui seria el verde falso
# que el episodio produjo, un nivel mas abajo.
v = gate.verdict(pushed_refs=[], current_branch="feature/kaupamex-l4", ahead=2)
check("veredicto UNKNOWN", gate.UNKNOWN, v.status)

print("== 6. la rama de trabajo es DESCONOCIDA (HEAD suelto): no se afirma ==")
v = gate.verdict(pushed_refs=["refs/heads/otra"], current_branch=None, ahead=0)
check("veredicto UNKNOWN", gate.UNKNOWN, v.status)

print("== 7. el lector de stdin extrae el ref local de cada linea de git ==")
lineas = ("refs/heads/otra abc123 refs/heads/otra def456\n"
          "refs/heads/feature/x 111 refs/heads/feature/x 222\n")
check("dos refs locales", ["refs/heads/otra", "refs/heads/feature/x"],
      gate.parse_refs(lineas))
check("linea vacia se ignora", [], gate.parse_refs("\n  \n"))
check("linea corta se ignora, no revienta", [], gate.parse_refs("basura\n"))

print("== 8. EXTREMO A EXTREMO: sobre un repo REAL, no sobre verdict() ==")
# Los siete casos de arriba prueban el veredicto con cifras dadas. Ninguno
# ejercita `current_branch_of` ni `ahead_count`, que son los que leen el disco
# — y ahi vivia el defecto hermano de :ref:`h-docs-1128`: medir contra el cwd
# en vez de contra el repo nombrado.
import subprocess, tempfile

def git(repo, *args):
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)

with tempfile.TemporaryDirectory() as d:
    raiz = Path(d)
    origen, clon = raiz / "origen.git", raiz / "clon"
    subprocess.run(["git", "init", "-q", "--bare", str(origen)], check=True)
    subprocess.run(["git", "clone", "-q", str(origen), str(clon)], check=True)
    git(clon, "config", "user.email", "t@t"); git(clon, "config", "user.name", "t")
    (clon / "a.txt").write_text("1")
    git(clon, "add", "-A"); git(clon, "commit", "-q", "-m", "seed")
    git(clon, "branch", "-M", "trabajo"); git(clon, "push", "-q", "-u", "origin", "trabajo")
    # La rama vieja, publicada y AL DIA — la forma de `claude/...-nrcglx`.
    git(clon, "branch", "vieja"); git(clon, "push", "-q", "-u", "origin", "vieja")
    # Y trabajo que se quedaria atras.
    (clon / "b.txt").write_text("2")
    git(clon, "add", "-A"); git(clon, "commit", "-q", "-m", "trabajo sin publicar")

    check("lee la rama del REPO, no del cwd", "trabajo", gate.current_branch_of(str(clon)))
    check("cuenta los commits sin publicar", 1, gate.ahead_count(str(clon), "trabajo"))

    codigo = gate.main([str(clon)],
                       stdin_text="refs/heads/vieja aaa refs/heads/vieja bbb\n")
    check("main() REHUSA al publicar la rama vieja", gate.EXIT[gate.REFUSE], codigo)

    codigo = gate.main([str(clon)],
                       stdin_text="refs/heads/trabajo aaa refs/heads/trabajo bbb\n")
    check("main() PASA al publicar la rama de trabajo", gate.EXIT[gate.PASS], codigo)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
