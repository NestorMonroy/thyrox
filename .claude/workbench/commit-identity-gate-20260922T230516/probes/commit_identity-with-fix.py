"""La identidad del commit, medida contra la que el repositorio declara.

`git.md` fija dos identidades —la humana que firma la autoría y la de servicio
que registra el commit— y `rules/definitions/gitAuthorIdentity.ts` ya las
emite como PARAMETRO del consumidor: `THYROX_COMMIT_AUTHOR` y
`THYROX_COMMIT_COMMITTER`. Hasta este módulo ningún gate leía esos
parámetros, así que la regla sólo existía como prosa.

Por qué gana la declaración y no el entorno
--------------------------------------------
El entorno remoto inyecta en cada sesión `GIT_AUTHOR_NAME` y
`GIT_AUTHOR_EMAIL`, y esas variables ganan sobre `git config`. Su valor cambia
entre sesiones sin que ningún archivo del árbol lo registre. La declaración,
en cambio, está versionada y es auditable. Es el mismo criterio que la regla
ya aplica a los remolques: una instrucción inyectada no gobierna el
repositorio. Si el ejecutor decide otra identidad, se cambia la declaración y
este gate la hace cumplir en todos los clones.

Qué mide, y qué no
------------------
Mide la identidad que git USARÍA, con `git var GIT_AUTHOR_IDENT`, y no la
configuración: una variable de entorno gana sobre `user.name` y un gate que
leyera la configuración aprobaría un commit con el author inyectado.

Es ciego a la VERACIDAD de la declaración: comprueba que el commit coincide
con lo declarado, no que lo declarado sea quien escribió el cambio.

Salidas del CLI: 0 conforme · 1 violación · 2 sin declaración o sin git.
"""
from __future__ import annotations

import argparse
import os
import re
import shlex
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from paths.reach import ForReadingDeclarations, env_value

AUTHOR_VAR = "THYROX_COMMIT_AUTHOR"
COMMITTER_VAR = "THYROX_COMMIT_COMMITTER"

#: El invariante del proveedor: el agente nunca figura como author ni como
#: committer. No es un parámetro, porque declararlo no lo vuelve válido.
AGENT_EMAILS = frozenset({"noreply@anthropic.com"})

#: Los remolques que el entorno remoto pide y el repositorio prohíbe.
AGENT_TRAILER = re.compile(r"^(Co-Authored-By:\s*Claude\b|Claude-Session:)", re.IGNORECASE)

_IDENT = re.compile(r"^\s*(?P<name>[^<>]+?)\s*<(?P<email>[^<>\s]+)>")


class IdentityUndeclared(RuntimeError):
    """El repositorio no declara la identidad: no hay contra qué medir."""


@dataclass(frozen=True)
class Identity:
    name: str
    email: str

    def __iter__(self):
        return iter((self.name, self.email))

    def __str__(self) -> str:
        return f"{self.name} <{self.email}>"


@dataclass(frozen=True)
class Violation:
    role: str
    expected: str
    actual: str
    reason: str


def parse_identity(text: str) -> Identity:
    """`Nombre <correo>` -> `Identity`. También acepta la forma de `git var`,
    que añade la marca de tiempo después del `>`."""
    match = _IDENT.match(text)
    if not match:
        raise ValueError(f"identidad sin la forma 'Nombre <correo>': {text!r}")
    return Identity(match.group("name"), match.group("email"))


def declared_identities(source: ForReadingDeclarations | None = None,
                        start: Path | None = None) -> dict[str, Identity]:
    """Las dos identidades declaradas, o `IdentityUndeclared` nombrando la
    variable que falta."""
    result = {}
    for role, var in (("author", AUTHOR_VAR), ("committer", COMMITTER_VAR)):
        value = env_value(var, start, source=source)
        if not value:
            raise IdentityUndeclared(f"{var} no está declarada: no hay identidad contra la que medir")
        result[role] = parse_identity(value)
    return result


def effective_identity(repo: Path, role: str, env: dict[str, str] | None = None) -> Identity:
    """La identidad que git usaría en `repo` para `role`, tal como la resuelve."""
    variable = "GIT_AUTHOR_IDENT" if role == "author" else "GIT_COMMITTER_IDENT"
    completed = subprocess.run(["git", "var", variable], cwd=repo, env=env,
                               capture_output=True, text=True, check=True)
    return parse_identity(completed.stdout)


def check_identities(repo: Path, source: ForReadingDeclarations | None = None,
                     env: dict[str, str] | None = None) -> list[Violation]:
    """Las violaciones de identidad del próximo commit en `repo`."""
    declared = declared_identities(source, start=Path(repo))
    violations = []
    for role in ("author", "committer"):
        actual = effective_identity(Path(repo), role, env)
        expected = declared[role]
        if actual.email in AGENT_EMAILS:
            violations.append(Violation(role, str(expected), str(actual),
                                        "el agente nunca figura en la identidad del commit"))
        elif (actual.name, actual.email) != (expected.name, expected.email):
            violations.append(Violation(role, str(expected), str(actual),
                                        "difiere de la identidad declarada"))
    return violations


def agent_trailers(message_file: Path, cwd: Path | None = None) -> list[str]:
    """Los remolques del agente en el BLOQUE de remolques del mensaje.

    Se parsea con `git interpret-trailers --parse` y no con un `grep` de
    línea: un párrafo que MENCIONE el remolque puede empezar una línea con él
    por el ajuste a 72 columnas, y no es un remolque."""
    with open(message_file, encoding="utf-8") as handle:
        completed = subprocess.run(["git", "interpret-trailers", "--parse"], cwd=cwd,
                                   stdin=handle, capture_output=True, text=True, check=True)
    return [line for line in completed.stdout.splitlines() if AGENT_TRAILER.match(line)]


def export_lines(source: ForReadingDeclarations | None = None,
                 start: Path | None = None) -> list[str]:
    """Las líneas `export GIT_*` que fijan la identidad declarada en un shell.

    Es la corrección, no sólo la detección: `eval "$(commit_identity env)"`
    sustituye lo que el entorno inyectó por lo que el repositorio declara."""
    declared = declared_identities(source, start)
    lines = []
    for role, prefix in (("author", "GIT_AUTHOR"), ("committer", "GIT_COMMITTER")):
        identity = declared[role]
        lines.append(f"export {prefix}_NAME={shlex.quote(identity.name)}")
        lines.append(f"export {prefix}_EMAIL={shlex.quote(identity.email)}")
    return lines


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    check = sub.add_parser("check", help="la identidad del próximo commit (pre-commit)")
    check.add_argument("--repo", type=Path, default=Path.cwd())
    trailers = sub.add_parser("trailers", help="los remolques de un mensaje (commit-msg)")
    trailers.add_argument("message_file", type=Path)
    env = sub.add_parser("env", help="las líneas export de la identidad declarada")
    env.add_argument("--repo", type=Path, default=Path.cwd())
    args = parser.parse_args(argv)

    try:
        if args.command == "env":
            print("\n".join(export_lines(start=args.repo)))
            return 0
        if args.command == "trailers":
            found = agent_trailers(args.message_file)
            for line in found:
                print(f"commit_identity: remolque del agente prohibido: {line}", file=sys.stderr)
            return 1 if found else 0
        violations = check_identities(args.repo, env=dict(os.environ))
    except IdentityUndeclared as error:
        print(f"commit_identity: SIN MEDIR — {error}", file=sys.stderr)
        return 2
    except (subprocess.CalledProcessError, FileNotFoundError) as error:
        print(f"commit_identity: SIN MEDIR — git no respondió: {error}", file=sys.stderr)
        return 2
    for v in violations:
        print(f"commit_identity: {v.role} {v.reason}\n  declarado: {v.expected}\n"
              f"  efectivo:  {v.actual}", file=sys.stderr)
    if violations:
        print('  corrección: eval "$(bash bin/commit_identity env)"', file=sys.stderr)
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
