#!/usr/bin/env python3
"""Gate de pre-push — la rama que se publica contra la rama que tiene trabajo.

EL DEFECTO QUE CIERRA. `git push -u origin <rama-literal>` nombra la rama por
una cadena que alguien tecleó, no por la que está midiendo el árbol. Cuando esa
cadena existe y está al día, git responde **«Everything up-to-date»** — verdad
sobre la rama nombrada, y falsa sobre la pregunta que uno se hace al leerla.

Medido el 2026-09-06 con el mismo comando en dos repos:

    thyrox          la rama literal NO existe -> `does not match any` (ruidoso)
    kaupamex-docs   SI existe, en `9262c7608` -> `Everything up-to-date`

En el segundo el trabajo se quedó sin publicar y la salida parecía correcta.
El fallo ruidoso es inocuo; el silencioso es el que pierde commits. Por eso el
gate no mide «el push funcionó» —eso ya lo dice git— sino **si la rama que
tiene trabajo quedó fuera del push**.

CÓMO SE INVOCA. Git entrega en stdin una línea por ref:

    <ref local> <sha local> <ref remota> <sha remota>

y el gate compara ese conjunto contra la rama actual. Nada de esto depende del
cwd de quien invoca: la rama y el conteo se piden con `git -C <repo>`, que es
la lección de :ref:`h-docs-1128` aplicada a su gate hermano.
"""
from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass

PASS = "PASS"
REFUSE = "REFUSE"
UNKNOWN = "UNKNOWN"

#: Códigos de salida. El 2 no es «encontré un defecto» sino «no emití
#: veredicto»: git aborta el push con cualquier código distinto de 0, así que
#: la protección es la misma y lo que cambia es que el motivo se puede leer.
EXIT = {PASS: 0, REFUSE: 1, UNKNOWN: 2}


@dataclass(frozen=True)
class Verdict:
    status: str
    reason: str


def parse_refs(stdin_text: str) -> list[str]:
    """Los refs LOCALES que git declara en su stdin de pre-push.

    Una línea con menos de cuatro campos se ignora en vez de reventar: el gate
    no es el sitio donde se descubre que git cambió su contrato, y morir aquí
    convertiría un push correcto en un fallo sin diagnóstico.
    """
    refs: list[str] = []
    for line in stdin_text.splitlines():
        fields = line.split()
        if len(fields) >= 4:
            refs.append(fields[0])
    return refs


def verdict(pushed_refs: list[str], current_branch: str | None, ahead: int) -> Verdict:
    """El veredicto, sin tocar el disco — por eso se puede probar entero."""
    if current_branch is None:
        return Verdict(UNKNOWN, "La rama actual es desconocida (HEAD suelto). "
                                "No se emite veredicto: un gate que no midió no autoriza.")
    if not pushed_refs:
        return Verdict(UNKNOWN, "Git no declaró ninguna ref en stdin. No se emite "
                                "veredicto — un PASS aquí sería el mismo verde falso "
                                "que el gate existe para cerrar.")

    mine = f"refs/heads/{current_branch}"
    if mine in pushed_refs or current_branch in pushed_refs:
        return Verdict(PASS, f"La rama de trabajo `{current_branch}` va en el push.")

    if ahead <= 0:
        return Verdict(PASS, f"`{current_branch}` no va en el push, y no tiene "
                             f"commits sin publicar: no hay trabajo que perder.")

    otras = ", ".join(r.removeprefix("refs/heads/") for r in pushed_refs)
    return Verdict(REFUSE, (
        f"Se publica `{otras}` y la rama de trabajo `{current_branch}` queda "
        f"con {ahead} commit(s) sin publicar.\n\n"
        f"Git dirá «Everything up-to-date» si `{otras}` ya estaba al día — y será "
        f"cierto sobre esa rama, no sobre tu trabajo.\n\n"
        f"La rama se DERIVA, no se teclea:\n\n"
        f"    git -C <repo> push -u origin \"$(git -C <repo> branch --show-current)\"\n"))


def ahead_count(repo: str, branch: str) -> int:
    """Commits de `branch` que su upstream no tiene. Sin upstream: 0.

    Sin upstream no hay con qué comparar, así que el gate no afirma que haya
    trabajo en riesgo — declararlo sería inventar la cifra.
    """
    done = subprocess.run(
        ["git", "-C", repo, "rev-list", "--count", f"{branch}@{{u}}..{branch}"],
        capture_output=True, text=True)
    if done.returncode != 0:
        return 0
    return int(done.stdout.strip() or 0)


def current_branch_of(repo: str) -> str | None:
    done = subprocess.run(["git", "-C", repo, "branch", "--show-current"],
                          capture_output=True, text=True)
    name = done.stdout.strip()
    return name or None


def main(argv: list[str] | None = None, stdin_text: str | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    repo = argv[0] if argv else "."
    text = sys.stdin.read() if stdin_text is None else stdin_text

    branch = current_branch_of(repo)
    ahead = ahead_count(repo, branch) if branch else 0
    v = verdict(parse_refs(text), branch, ahead)

    if v.status != PASS:
        print(f"pre-push {v.status} — rama de trabajo fuera del push\n\n{v.reason}",
              file=sys.stderr)
    return EXIT[v.status]


if __name__ == "__main__":
    raise SystemExit(main())
