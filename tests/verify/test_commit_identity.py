#!/usr/bin/env python3
"""Control de `src/verify/commit_identity.py` — la identidad del commit, medida.

Por qué existe este mecanismo
-----------------------------
`git.md` fija el author y el committer, y `gitAuthorIdentity.ts` ya emite esa
regla con las dos identidades como PARAMETRO del consumidor
(`THYROX_COMMIT_AUTHOR`, `THYROX_COMMIT_COMMITTER`). Ningún gate leía esos
parámetros: la regla existía sólo como prosa, y el entorno remoto inyecta su
propia identidad (`GIT_AUTHOR_NAME`) en cada sesión. El único gate de
remolques vivía en un consumidor, como bash.

Qué haría fallar a este control
-------------------------------
- comparar contra la configuración de git en vez de contra la identidad que
  git USARÍA: `GIT_AUTHOR_NAME` en el entorno gana sobre `user.name`, y el caso
  `injected-author` sólo cae si se mide `git var`;
- permitir al agente como committer cuando alguien lo declara: el caso
  `declared-agent` cae;
- buscar remolques con un `grep` de línea: el caso `trailer-in-prose` cae.
"""
from __future__ import annotations

import os
import pathlib
import subprocess
import sys
import tempfile

from verify import commit_identity as mod

ok = failures = 0


def assert_equal(name: str, expected, obtained) -> None:
    global ok, failures
    if expected == obtained:
        ok += 1
        print(f"  ok    {name}")
    else:
        failures += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


class FakeDeclarations:
    """Puerto conducido de `paths.reach`: la suite decide qué está declarado."""

    def __init__(self, **values: str) -> None:
        self.values = values

    def declared(self, name: str) -> str | None:
        return self.values.get(name) or None


AUTHOR = "Nestor Monroy <46802445+NestorMonroy@users.noreply.github.com>"
COMMITTER = "jcg-admin <169318663+jcg-admin@users.noreply.github.com>"
DECLARED = FakeDeclarations(THYROX_COMMIT_AUTHOR=AUTHOR, THYROX_COMMIT_COMMITTER=COMMITTER)


def make_repo(root: pathlib.Path) -> pathlib.Path:
    repo = root / "repo"
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    return repo


def git_env(author: str, committer: str) -> dict[str, str]:
    """El entorno que produciría esa identidad, como lo inyecta el harness."""
    a, c = mod.parse_identity(author), mod.parse_identity(committer)
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    env.update(GIT_AUTHOR_NAME=a.name, GIT_AUTHOR_EMAIL=a.email,
               GIT_COMMITTER_NAME=c.name, GIT_COMMITTER_EMAIL=c.email)
    return env


print("test_commit_identity:")

# parse — la forma `Name <email>` que git usa en `git var`.
assert_equal("parse separa nombre y correo", ("Nestor Monroy", "a@b.c"),
             tuple(mod.parse_identity("Nestor Monroy <a@b.c>")))
try:
    mod.parse_identity("sin correo")
    assert_equal("parse rechaza una identidad sin correo", "ValueError", "sin error")
except ValueError:
    assert_equal("parse rechaza una identidad sin correo", "ValueError", "ValueError")

with tempfile.TemporaryDirectory() as tmp:
    repo = make_repo(pathlib.Path(tmp))

    # CONTROL: la identidad declarada, efectiva -> sin violaciones.
    found = mod.check_identities(repo, source=DECLARED, env=git_env(AUTHOR, COMMITTER))
    assert_equal("la identidad declarada pasa", [], found)

    # injected-author: el entorno inyecta otro author. Sólo `git var` lo ve.
    found = mod.check_identities(repo, source=DECLARED,
                                 env=git_env("Kim <kim@example.com>", COMMITTER))
    assert_equal("un author inyectado distinto se detecta", ["author"],
                 [v.role for v in found])

    # El committer del agente se rechaza aunque el committer declarado difiera.
    agent = "Claude <noreply@anthropic.com>"
    found = mod.check_identities(repo, source=DECLARED, env=git_env(AUTHOR, agent))
    assert_equal("el agente como committer se detecta", ["committer"],
                 [v.role for v in found])

    # declared-agent: declarar al agente no lo vuelve valido.
    agent_declared = FakeDeclarations(THYROX_COMMIT_AUTHOR=AUTHOR,
                                      THYROX_COMMIT_COMMITTER=agent)
    found = mod.check_identities(repo, source=agent_declared, env=git_env(AUTHOR, agent))
    assert_equal("declarar al agente no lo autoriza", ["committer"],
                 [v.role for v in found])

    # Sin declaracion no hay veredicto: se rehusa, no se aprueba.
    try:
        mod.check_identities(repo, source=FakeDeclarations(), env=git_env(AUTHOR, COMMITTER))
        assert_equal("sin declaracion rehusa", "IdentityUndeclared", "sin error")
    except mod.IdentityUndeclared:
        assert_equal("sin declaracion rehusa", "IdentityUndeclared", "IdentityUndeclared")

    # `env` produce el entorno que hace pasar el gate: aplicado sobre un
    # entorno inyectado con otro author, la identidad efectiva queda declarada.
    exports = mod.export_lines(source=DECLARED)
    injected = git_env("Kim <kim@example.com>", "Claude <noreply@anthropic.com>")
    applied = subprocess.run(["bash", "-c", "\n".join(exports) + "\ngit var GIT_AUTHOR_IDENT;"
                              " git var GIT_COMMITTER_IDENT"],
                             cwd=repo, env=injected, capture_output=True, text=True, check=True)
    idents = [line.rsplit(">", 1)[0] + ">" for line in applied.stdout.splitlines()]
    assert_equal("export_lines fija la identidad declarada", [AUTHOR, COMMITTER], idents)

    # Remolques — por el parser de git, no por lineas.
    def trailers_of(message: str) -> list[str]:
        path = pathlib.Path(tmp) / "msg"
        path.write_text(message)
        return mod.agent_trailers(path, cwd=repo)

    assert_equal("un remolque Co-Authored-By del agente se detecta", 1, len(trailers_of(
        "Fix x\n\nBody.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n")))
    assert_equal("un remolque Claude-Session se detecta", 1, len(trailers_of(
        "Fix x\n\nBody.\n\nClaude-Session: https://claude.ai/code/x\n")))
    assert_equal("trailer-in-prose: la mencion en prosa no se detecta", 0, len(trailers_of(
        "Fix x\n\nCo-Authored-By: Claude is forbidden here, and this line is\n"
        "wrapped prose that continues the paragraph.\n\nRefs: H-1\n")))

print(f"test_commit_identity: {ok + failures} aserciones — {ok} ok, {failures} falla(s)")
sys.exit(1 if failures else 0)
