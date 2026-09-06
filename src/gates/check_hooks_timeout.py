#!/usr/bin/env python3
"""Gate: todo hook declarado en settings.json acota su peor caso.

El turno ESPERA al hook. Un hook sin ``timeout`` no tiene cota superior
declarada, asi que uno que se cuelga cuelga el turno; lo unico que lo
detiene es el valor por omision del cliente, que no hemos medido.

La forma se adapta de ``claude-octopus`` (MIT, f8a69e2), cuyo manifiesto
declara ``timeout`` en 39 de sus 43 hooks con siete valores distintos —
o sea lo trata como propiedad del hook, no como constante global.

Metrica: entradas de ``hooks[<evento>][].hooks[]`` cuyo ``timeout`` es un
entero positivo, sobre el total de entradas del archivo medido.
Ciega a: si el valor declarado ALCANZA para lo que el hook hace. Mide que
la cota exista, no que sea correcta; un ``timeout: 1`` sobre un hook de
diez segundos pasa este gate y falla en produccion.
"""
import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from paths import reach  # noqa: E402

# El `settings.json` que se mide es el del CONSUMIDOR. Era `parents[3]`,
# que desde `thyrox/src/gates/` daba `/home/user/.claude/settings.json`.
RAIZ = reach.consumer_root()


def collect_hooks(settings: dict):
    """Devuelve (evento, matcher, comando, timeout) por cada entrada."""
    out = []
    for event, matchers in (settings.get("hooks") or {}).items():
        if not isinstance(matchers, list):
            continue
        for m in matchers:
            if not isinstance(m, dict):
                continue
            for entry in m.get("hooks") or []:
                if not isinstance(entry, dict):
                    continue
                out.append((event, m.get("matcher", "—"),
                            entry.get("command", ""), entry.get("timeout")))
    return out


def declares_timeout(value) -> bool:
    """Un booleano NO es un timeout, aunque Python lo trate como int."""
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--settings", default=str(RAIZ / ".claude" / "settings.json"))
    p.add_argument("--strict", action="store_true",
                   help="exit 1 si algun hook no declara timeout")
    args = p.parse_args()

    ruta = Path(args.settings)
    # El guard va ANTES de cualquier conteo: un archivo ausente o ilegible
    # no puede publicar «0 infractores» — seria un cero de no haber medido,
    # el sub-patron D de metrica-decide-la-conclusion.
    if not ruta.is_file():
        print(f"ERROR — no se puede medir: {ruta} no existe. "
              "NO se emite conteo.", file=sys.stderr)
        return 2
    try:
        settings = json.loads(ruta.read_text())
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        print(f"ERROR — no se puede medir: {ruta} no es JSON valido ({exc}). "
              "NO se emite conteo.", file=sys.stderr)
        return 2

    entries = collect_hooks(settings)
    faltantes = [e for e in entries if not declares_timeout(e[3])]

    for event, matcher, command, timeout in faltantes:
        motivo = "ausente" if timeout is None else f"invalido ({timeout!r})"
        print(f"  {event:<16} matcher={matcher:<22} timeout {motivo}\n"
              f"      {command}")

    total = len(entries)
    con = total - len(faltantes)
    estado = "OK" if not faltantes else f"{len(faltantes)} hook(s) sin timeout"
    print(f"{estado}: {con} de {total} hook(s) declaran timeout "
          f"(alcance medido: {ruta})")

    return 1 if (faltantes and args.strict) else 0


if __name__ == "__main__":
    sys.exit(main())
