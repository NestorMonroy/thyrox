#!/usr/bin/env python3
"""Reconcilia los archivos SUELTOS de ``~/.claude/`` con lo que thyrox declara.

El problema que resuelve. ``instalar-config-usuario.sh`` copia **clases**
—directorios: ``rules/``, ``agents/``, ``hooks/``…— desde el ``.claude`` de un
clon. Los archivos que viven **sueltos en la raíz** de ``~/.claude/`` no caen en
ninguna clase, así que ningún mecanismo de thyrox los alcanza. Medido al
escribir esto: **6 archivos sueltos, 0 cubiertos**.

Y no basta con copiarlos: los trae el **harness**, no nosotros. Una copia
nuestra los pisaría, y a la siguiente versión del cliente estaríamos
reinstalando una regresión. Por eso esto no copia — **parchea**, y cada parche
declara tres cosas:

* la forma **ya correcta**, para ser idempotente;
* la forma **defectuosa conocida**, que es la única que transforma;
* qué hacer si no es ninguna de las dos: **rehusar con código 2**, no adivinar.

Esa tercera rama es la que hace que una actualización del cliente se vea en vez
de silenciarse. Un parche que "arregla lo que encuentre" convierte un cambio del
proveedor en un archivo mutilado sin que nadie se entere.

Salidas: 0 todo conciliado · 1 hay parches sin aplicar (``--check``) · 2 una
forma desconocida, o no se pudo medir.
"""
from __future__ import annotations

import argparse
import dataclasses
import pathlib
import re
import sys

#: El hogar de los archivos sueltos. Dos entradas, ambas de entorno (DEC-04):
#: el VALOR lo lleva ``THYROX_USER_CLAUDE_DIR`` y la RUTA a su declaración la
#: lleva ``THYROX_ENV_FILE``, que es lo que ``env_value`` resuelve.
USER_CLAUDE_DIR_VAR = "THYROX_USER_CLAUDE_DIR"

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "paths"))
import reach  # noqa: E402


@dataclasses.dataclass(frozen=True)
class Patch:
    """Un parche declarado sobre un archivo que el harness entrega."""

    name: str
    target: str
    reason: str
    #: Ya está como thyrox lo quiere.
    is_applied: object
    #: Es la forma defectuosa que sabemos transformar.
    is_broken: object
    #: La transformación. Sólo se llama si ``is_broken``.
    apply: object


# --- parche 1: el gate de firma no mide la identidad -------------------------
# El hook lista como "Unverified" todo commit cuyo committer no sea
# `noreply@anthropic.com`, y aconseja `git config user.name Claude` +
# `--reset-author`. Las dos cosas están PROHIBIDAS por `.claude/rules/git.md`:
# el committer es jcg-admin y el autor humano no se pisa. Medido: nuestros
# commits SÍ traen `gpgsig`, así que el gate disparaba sólo por la identidad —
# la mitad que dice medir ya estaba satisfecha.
IDENTITY_CONDITION = re.compile(
    r'^(?P<indent>[ \t]*)if \[\[ "\$ce" != "noreply@anthropic\.com" \]\] \|\|\n'
    r'[ \t]*(?P<rest>! git cat-file commit .*)$',
    re.MULTILINE,
)
ADVICE = ("Please run 'git config user.email noreply@anthropic.com && "
          "git config user.name Claude', then ")


#: La forma YA ARREGLADA, por evidencia POSITIVA. La ausencia del defecto no
#: sirve como predicado: un archivo que el cliente reescribió tampoco tiene la
#: condición de identidad, y leerlo como «ya está» es el sub-patrón D — un
#: predicado que no puede fallar sobre un archivo desconocido. Lo destapó el
#: caso 3 de la suite, no una relectura.
SIGNATURE_ONLY = re.compile(
    r'^[ \t]*if ! git cat-file commit "\$sha".*gpgsig', re.MULTILINE)


def _signature_only_applied(text: str) -> bool:
    return (SIGNATURE_ONLY.search(text) is not None
            and IDENTITY_CONDITION.search(text) is None
            and ADVICE not in text)


def _signature_only_broken(text: str) -> bool:
    return IDENTITY_CONDITION.search(text) is not None or ADVICE in text


def _signature_only_apply(text: str) -> str:
    text = IDENTITY_CONDITION.sub(lambda m: f"{m['indent']}if {m['rest']}", text)
    text = text.replace(ADVICE, "Please run ")
    text = text.replace("--reset-author", "-S")
    return text.replace(
        "Unverified (missing signature, or committer email is not "
        "noreply@anthropic.com)",
        "Unverified (missing GPG signature)")


PATCHES: tuple[Patch, ...] = (
    Patch(
        name="stop-hook-signature-only",
        target="stop-hook-git-check.sh",
        reason=("el gate mide la FIRMA, no la identidad: pedía Claude como "
                "committer y --reset-author, ambos prohibidos por las reglas "
                "del repo"),
        is_applied=_signature_only_applied,
        is_broken=_signature_only_broken,
        apply=_signature_only_apply,
    ),
)


def user_claude_dir() -> pathlib.Path:
    """El ``~/.claude`` que gobierna, por las dos entradas y luego el default."""
    declared = reach.env_value(USER_CLAUDE_DIR_VAR)
    if declared:
        return pathlib.Path(declared).expanduser()
    return pathlib.Path.home() / ".claude"


def reconcile(root: pathlib.Path, check_only: bool) -> tuple[int, list[str]]:
    """Devuelve (código de salida, líneas del informe)."""
    report, pending, unknown = [], 0, 0
    for patch in PATCHES:
        path = root / patch.target
        if not path.is_file():
            report.append(f"  AUSENTE   {patch.name} — no existe {path}")
            continue
        text = path.read_text(encoding="utf-8")
        if patch.is_applied(text):
            report.append(f"  ya está   {patch.name}")
        elif patch.is_broken(text):
            pending += 1
            if check_only:
                report.append(f"  PENDIENTE {patch.name} — {patch.reason}")
            else:
                nuevo = patch.apply(text)
                if not patch.is_applied(nuevo):
                    unknown += 1
                    report.append(
                        f"  FALLA     {patch.name} — la transformación no dejó "
                        "la forma correcta; NO se escribe")
                    continue
                path.write_text(nuevo, encoding="utf-8")
                report.append(f"  aplicado  {patch.name} — {patch.reason}")
        else:
            unknown += 1
            report.append(
                f"  DESCONOCIDA {patch.name} — {path} no está ni en la forma "
                "correcta ni en la defectuosa conocida. Probablemente el "
                "cliente la cambió: NO se toca, se revisa a mano.")
    report.append(
        f"\nreconcile-user-hooks: {len(PATCHES)} parche(s) declarado(s) · "
        f"{pending} pendiente(s) · {unknown} de forma desconocida "
        f"(alcance medido: {root})")
    if unknown:
        return 2, report
    return (1 if (pending and check_only) else 0), report


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dir", help=f"el ~/.claude a conciliar (o {USER_CLAUDE_DIR_VAR})")
    p.add_argument("--check", action="store_true",
                   help="no escribe; exit 1 si hay parches pendientes")
    args = p.parse_args(argv)

    root = pathlib.Path(args.dir).expanduser() if args.dir else user_claude_dir()
    if not root.is_dir():
        print(f"reconcile-user-hooks: no existe {root} — NO se emite un "
              "conteo: un 0 aquí sería un verde falso.", file=sys.stderr)
        return 2
    code, report = reconcile(root, args.check)
    print("\n".join(report))
    return code


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
