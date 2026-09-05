"""Pruebas de ``repo.pending_work`` — qué repo deja trabajo sin publicar.

Adaptación del predicado de ``kaupamex-docs:
.claude/hooks/stop-gate-trabajo-sin-publicar.sh``. Lo que viaja es el barrido:
por cada repo, cuatro cuentas —sin commitear, en stage, sin añadir, sin
pushear— y la lista de los que tienen alguna. Lo que se inyecta son las raíces
y las etiquetas de la prosa, que son del consumidor (DEC-04).

Los casos que DISCRIMINAN son el 3 y el 4, y los dos vienen de defectos medidos
en el guion original:

- **3** — lo ignorado NO cuenta. El repo ya declara qué es transitorio; contar
  lo ignorado haría del gate un estorbo, que es la razón por la que la primera
  versión no contaba nada untracked (H-DOCS-311).
- **4** — ``--untracked-files=all``. Sin él, un directorio nuevo se reporta
  como UNA línea y los archivos de dentro quedan invisibles: la salida de un
  agente, que es justo lo que el gate existe para ver.

Los repos son de mentira y se construyen aquí: medir contra los cinco clones
reales haría que el resultado dependiera de en qué estado los deje la sesión.

El paquete se llama ``repo`` y no ``git`` a propósito: ``src`` se antepone a
``sys.path``, así que un paquete nuestro llamado ``git`` **sombrearía a
GitPython** para todo el proceso. Hoy no está instalada —medido— y ése es
exactamente el momento de no plantar la colisión.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from repo import pending_work as pw  # noqa: E402

OK = 0
FAILED = 0

#: Las etiquetas son del consumidor; aquí se usan las de kaupamex para que el
#: render se lea igual que el del guion que se adapta.
LABELS = {
    "dirty": "sin commitear",
    "staged": "en stage",
    "untracked": "sin añadir",
    "ahead": "commit(s) sin pushear",
}


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def git(repo: Path, *args: str) -> str:
    done = subprocess.run(["git", "-C", str(repo), *args],
                          capture_output=True, text=True)
    return done.stdout.strip()


def new_repo(parent: Path, name: str) -> Path:
    """Un repo con un commit inicial y su identidad local."""
    repo = parent / name
    repo.mkdir()
    git(repo, "init", "-q")
    git(repo, "config", "user.email", "t@t")
    git(repo, "config", "user.name", "t")
    (repo / "semilla.txt").write_text("semilla\n")
    git(repo, "add", "semilla.txt")
    git(repo, "commit", "-q", "-m", "Seed")
    return repo


print("== 1. un repo limpio no aparece en el barrido ==")
with tempfile.TemporaryDirectory() as tmp:
    repo = new_repo(Path(tmp), "limpio")
    check("cero pendientes", [], pw.sweep([str(repo)]))

print("== 2. las cuatro cuentas se miden por separado ==")
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    sucio = new_repo(raiz, "sucio")
    (sucio / "semilla.txt").write_text("cambiado\n")

    stage = new_repo(raiz, "stage")
    (stage / "nuevo.txt").write_text("x\n")
    git(stage, "add", "nuevo.txt")

    suelto = new_repo(raiz, "suelto")
    (suelto / "sin-anadir.txt").write_text("x\n")

    items = {p.name: p for p in pw.sweep([str(sucio), str(stage), str(suelto)])}
    check("los tres aparecen", ["stage", "sucio", "suelto"], sorted(items))
    check("sucio cuenta 1 sin commitear", 1, items["sucio"].dirty)
    check("stage cuenta 1 en stage", 1, items["stage"].staged)
    check("suelto cuenta 1 sin añadir", 1, items["suelto"].untracked)
    check("y ninguno tiene commits por delante", [0, 0, 0],
          [items[n].ahead for n in sorted(items)])

print("== 3. DISCRIMINA: lo IGNORADO no cuenta como trabajo sin publicar ==")
# El repo ya declara qué es transitorio. Contarlo volvería al gate un estorbo.
#
# Este caso lo protegen DOS guardas independientes, y conviene saberlo antes de
# medirlo: git sin `--ignored` no lista lo ignorado, y además nuestro filtro de
# prefijo sólo cuenta `?? ` mientras git marca lo ignorado con `!! `. Anular
# UNA sola deja el caso en verde —medido— y eso se leería como «no discrimina»
# cuando lo que pasa es que la otra lo sostiene. Anuladas las dos, cae, y sólo
# él.
with tempfile.TemporaryDirectory() as tmp:
    repo = new_repo(Path(tmp), "conignore")
    (repo / ".gitignore").write_text("basura/\n")
    git(repo, "add", ".gitignore")
    git(repo, "commit", "-q", "-m", "Add gitignore")
    (repo / "basura").mkdir()
    (repo / "basura" / "efimero.log").write_text("x\n")
    check("un archivo ignorado NO aparece", [], pw.sweep([str(repo)]))

print("== 4. DISCRIMINA: cuenta los ARCHIVOS de un directorio nuevo, no el dir ==")
# Sin `--untracked-files=all`, git reporta `?? salida/` en UNA línea y los tres
# archivos quedan invisibles. Es la forma en que nace la salida de un agente.
with tempfile.TemporaryDirectory() as tmp:
    repo = new_repo(Path(tmp), "condir")
    (repo / "salida").mkdir()
    for n in ("uno.rst", "dos.rst", "tres.rst"):
        (repo / "salida" / n).write_text("x\n")
    items = pw.sweep([str(repo)])
    check("cuenta 3, no 1", 3, items[0].untracked)

print("== 5. sin upstream, `ahead` es 0 y NO revienta ==")
with tempfile.TemporaryDirectory() as tmp:
    repo = new_repo(Path(tmp), "sinupstream")
    (repo / "semilla.txt").write_text("cambiado\n")
    check("mide lo demás sin caerse", 1, pw.sweep([str(repo)])[0].dirty)
    check("y ahead queda en 0", 0, pw.sweep([str(repo)])[0].ahead)

print("== 6. con upstream, los commits locales por delante se cuentan ==")
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    origen = new_repo(raiz, "origen")
    clon = raiz / "clon"
    subprocess.run(["git", "clone", "-q", str(origen), str(clon)],
                   capture_output=True)
    git(clon, "config", "user.email", "t@t")
    git(clon, "config", "user.name", "t")
    (clon / "local.txt").write_text("x\n")
    git(clon, "add", "local.txt")
    git(clon, "commit", "-q", "-m", "Add local")
    items = pw.sweep([str(clon)])
    check("un commit por delante", 1, items[0].ahead)
    check("y el árbol queda limpio", 0, items[0].dirty)

print("== 7. un directorio que NO es repo se salta, no revienta ==")
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    (raiz / "no-es-repo").mkdir()
    (raiz / "no-es-repo" / "algo.txt").write_text("x\n")
    repo = new_repo(raiz, "si-es-repo")
    (repo / "semilla.txt").write_text("cambiado\n")
    items = pw.sweep([str(raiz / "no-es-repo"), str(repo), str(raiz / "no/existe")])
    check("sólo el repo real aparece", ["si-es-repo"], [p.name for p in items])

print("== 8. CONTROL: la lista de raíces VACÍA rehúsa, no dice «nada pendiente» ==")
# Cero repos barridos y cero repos con trabajo publican la misma lista vacía.
# Rehusar es lo único que los separa — el cero silencioso de H-API-335.
try:
    pw.sweep([])
    check("rehúsa sin raíces", "EmptyRootsError", "no lanzó")
except pw.EmptyRootsError as err:
    check("rehúsa sin raíces", "EmptyRootsError", type(err).__name__)

print("== 9. el render usa las etiquetas del CONSUMIDOR, y las exige ==")
items = [pw.Pending(name="kaupamex-docs", dirty=1, staged=0, untracked=2, ahead=0),
         pw.Pending(name="thyrox", dirty=0, staged=0, untracked=0, ahead=3)]
texto = pw.render(items, LABELS)
check("una línea por repo", 2, len(texto.strip().splitlines()))
check("con la etiqueta inyectada", True, "1 sin commitear" in texto)
check("omite las cuentas en cero", False, "0 en stage" in texto)
check("y compone las que sí", True, "2 sin añadir" in texto)
check("el otro repo trae la suya", True, "3 commit(s) sin pushear" in texto)
try:
    pw.render(items, {"dirty": "x"})
    check("una etiqueta ausente rehúsa", "MissingLabelError", "no lanzó")
except pw.MissingLabelError as err:
    check("una etiqueta ausente rehúsa", "MissingLabelError", type(err).__name__)

print("== 10. `engine` es lo que `stop_gate.Gate` consume ==")
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    limpio = new_repo(raiz, "limpio")
    check("limpio devuelve (0, '')", (0, ""),
          pw.engine([str(limpio)], LABELS)())

    sucio = new_repo(raiz, "sucio")
    (sucio / "semilla.txt").write_text("cambiado\n")
    code, salida = pw.engine([str(limpio), str(sucio)], LABELS)()
    check("con trabajo devuelve código 1", 1, code)
    check("y nombra sólo al repo con trabajo", True,
          "sucio" in salida and "limpio" not in salida)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
