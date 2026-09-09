#!/usr/bin/env python3
"""El registro de lo que THYROX resuelve por su cuenta porque nadie lo declaro.

Directiva del ejecutor 2026-09-07: *«a menos que el usuario defina la constante
en .env, si no esta se tiene que ir a una ruta por default … se tiene que
llevar un registro de que sucede con las que estan sin declarar y que si no se
declaran thyrox las maneja, porque son necesarias»*.

Eso corrige una decision anterior. `workbench_dir()` REHUSABA sin declaracion,
con el argumento de que un default decidiria por el consumidor donde van sus
piezas. El argumento estaba mal encuadrado, y el propio arbol ya tenia la forma
correcta a la vista: `agent_store_path()` cae a
`<thyrox>/agent-results/agent_store.sqlite3` y su docstring lo dice sin
ambiguedad — *«Lo prohibido no era tener default: era DERIVARLO por aritmetica
de `__file__`»*. Un default derivado de la CADENA DECLARADA es legitimo; uno
derivado de donde vivia el archivo, no.

Un rehuse tampoco era neutral: apagaba la funcion para todo consumidor que no
hubiera tomado una decision que casi ninguno necesita tomar, y empujaba a
teclear la ruta a mano — que es como aterrizaron once bancos en el arbol
equivocado (L-028).

Lo que este modulo añade es la mitad que faltaba: **que el default no sea
silencioso**. Una ruta resuelta por defecto y una declarada se comportan igual,
y sin registro nadie puede distinguirlas — el sub-patron D de
`metrica-decide-la-conclusion.md` aplicado a la configuracion.

    python3 src/paths/declarations.py      # que esta declarado y que lo maneja thyrox
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@dataclass(frozen=True)
class Fallback:
    """Una constante que nadie declaro y que THYROX resolvio por su cuenta."""

    key: str
    value: str
    reason: str


_FALLBACKS: dict[str, Fallback] = {}


def record_fallback(key: str, value: str | Path, reason: str) -> None:
    """Anota que `key` no estaba declarada y con que se resolvio.

    Idempotente por clave: el ultimo valor gana, que es el que el proceso esta
    usando. No se acumula historial — el registro dice el ESTADO, no la
    secuencia, y una lista de resoluciones repetidas no responde a ninguna
    pregunta que alguien haga.
    """
    _FALLBACKS[key] = Fallback(key=key, value=str(value), reason=reason)


def fallbacks() -> tuple[Fallback, ...]:
    """Lo anotado hasta ahora, en orden de clave."""
    return tuple(_FALLBACKS[k] for k in sorted(_FALLBACKS))


def clear() -> None:
    """Vacia el registro. Existe para los controles, no para el uso normal."""
    _FALLBACKS.clear()


def resolve_all(start: Path | None = None) -> list[tuple[str, str, str, str]]:
    """El estado de cada hogar, POR CLON. Devuelve `(clon, clave, origen, valor)`.

    Reportaba un solo arbol —el del `start`— y esa era su limitacion de fondo:
    respondia globalmente una pregunta que es POR REPOSITORIO. Un proceso
    resuelve varios arboles, y la respuesta correcta para `api`
    (`scripts/workbench`) no es la de `docs` (`.claude/eventos`).

    `origen` es `declarado` o `por defecto`. Sin recorrer los clones, el
    registro solo tendria lo que el proceso haya tocado por casualidad, y un
    vacio ahi no distingue «todo declarado» de «nadie pregunto».
    """
    from paths import reach  # noqa: PLC0415 — evita el ciclo en tiempo de import
    from rules import paths as rules  # noqa: PLC0415 — idem
    from workbench import paths as workbench

    clear()
    rows: list[tuple[str, str, str, str]] = []
    for repo in reach.REACH_ROOTS:
        root = reach.root(repo, start)
        key = workbench.workbench_home_name(repo)
        # La familia primero, la global despues: es la precedencia que resuelve.
        declared = reach.env_value(key, root) or reach.env_value(
            workbench.WORKBENCH_DIR_VAR, root)
        origin = "declarado" if declared else "por defecto"
        rows.append((repo, key, origin, str(workbench.workbench_dir(root))))

        # El hogar de las reglas EMITIDAS es del consumidor, no del proveedor:
        # thyrox las produce y cada clon las aloja. Por eso la fila es por clon
        # aunque la clave sea una — la variable se lee con la raíz de ESE árbol
        # como punto de partida, así que su `.env` la puede declarar sin tocar
        # la de los demás. Sin esta fila el default sería SILENCIOSO, que es el
        # defecto entero que este módulo existe para cerrar.
        declared_rules = reach.env_value(rules.RULES_DIR_VAR, root)
        rows.append((repo, rules.RULES_DIR_VAR,
                     "declarado" if declared_rules else "por defecto",
                     str(rules.consumer_rules_dir(root))))

    # Los hogares que NO son por clon: el store y los dos segmentos del default.
    for key, resolver in (
        (reach.AGENT_STORE_VAR, lambda: reach.agent_store_path(start)),
        (workbench.STATE_DIR_VAR, lambda: workbench.state_dir(start)),
        (workbench.EVIDENCE_DIR_VAR, lambda: workbench.evidence_dir(start)),
    ):
        declared = reach.env_value(key, start)
        rows.append(("(global)", key, "declarado" if declared else "por defecto",
                     str(resolver())))
    return rows


def main(argv: list[str] | None = None) -> int:
    rows = resolve_all()
    defaulted = [r for r in rows if r[2] == "por defecto"]
    print(f"declaraciones: {len(rows)} hogar(es) · {len(rows) - len(defaulted)} "
          f"declarado(s) · {len(defaulted)} que maneja THYROX")
    for repo, key, origin, value in rows:
        mark = "  " if origin == "declarado" else "->"
        print(f"{mark} {repo:<9} {key:<26} {origin:<12} {value}")
    if defaulted:
        print("\nLos marcados con `->` funcionan, y su valor lo eligio THYROX.")
        print("Declararlos en el .env de su arbol los pone bajo tu control.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
