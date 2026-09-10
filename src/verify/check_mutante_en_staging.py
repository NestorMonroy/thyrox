#!/usr/bin/env python3
"""Guard: ningun mutante de sabotaje entra al historial (H-DOCS-466, #916).

``check_suite_discrimina.py`` inyecta ``raise SystemExit(97)  # MUTANTE`` en un
guion para medir si la suite lo detecta, y **restaura al terminar**. Si lo matan
antes —limite de sesion, timeout, senal— no restaura, y el mutante se queda en
el arbol. Ocurrio: uno sobrevivio en ``check_vocabulario_prosa.py:228`` y
explicaba los dos fallos de la linea base sin que nada lo delatara. La
restauracion ante senal es la tarea #915; este guard es la **red**: aunque el
mutador muera, el mutante no llega al commit.

Alcance: los ``.py`` que se le pasen, o —sin argumentos— los ``.py`` en
*staging*. Publica su denominador junto al veredicto: un ``0`` sin universo no
distingue «no hay mutantes» de «no mire ninguno».

Metrica: lineas que casan la forma que el mutador escribe (sangria + sentencia
+ dos espacios + marcador).
Ciega a: un sabotaje escrito a mano SIN el marcador, y a uno que el mutador
escribiera con otra forma en una version futura — por eso el patron se **importa**
del mutador en vez de copiarse aqui.
"""

import pathlib
import subprocess
import sys

GATES = pathlib.Path(__file__).resolve().parent


def require_mutador():
    """Importa el patron desde su unica fuente: el propio mutador.

    Un guard con su copia del patron divergiria en silencio el dia que el
    mutador cambie la forma. Y si no se puede importar, NO se emite un conteo:
    un 0 aqui seria un verde falso — el sub-patron D de
    `metrica-decide-la-conclusion.md`, y la convencion de guard de
    `redaccion-tecnica-es.md`.
    """
    sys.path.insert(0, str(GATES))
    try:
        import check_suite_discrimina as mutador
    except Exception as exc:  # noqa: BLE001 — cualquier fallo de import cuenta
        print(
            f"ERROR — no se pudo importar check_suite_discrimina: {exc}\n"
            "  El patron del mutante vive ahi y no se copia. NO se emite un\n"
            "  conteo: un 0 aqui seria un verde falso.",
            file=sys.stderr,
        )
        raise SystemExit(2)
    return mutador


def archivos_en_staging():
    salida = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM", "--", "*.py"],
        capture_output=True, text=True, check=False,
    )
    return [pathlib.Path(l) for l in salida.stdout.split("\n") if l.strip()]


def main(argv):
    mutador = require_mutador()
    rutas = [pathlib.Path(a) for a in argv[1:]] or archivos_en_staging()

    sucios, medidos = [], 0
    for ruta in rutas:
        try:
            texto = ruta.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        medidos += 1
        for numero, linea in enumerate(texto.split("\n"), start=1):
            # `fullmatch` sobre la linea sola: el patron del mutador lleva
            # `re.M` para barrer un archivo entero, y aqui se aplica por linea
            # para poder nombrar el numero.
            if mutador.INSERTADA.match(linea) and linea.endswith(mutador.MARCA):
                sucios.append((ruta, numero, linea.strip()))

    plural = "archivo" if medidos == 1 else "archivos"
    if sucios:
        print(f"check-mutante-en-staging: {len(sucios)} mutante(s) vivo(s) "
              f"(alcance medido: {medidos} {plural})", file=sys.stderr)
        for ruta, numero, linea in sucios:
            print(f"  {ruta}:{numero}  {linea}", file=sys.stderr)
        print("\nUn mutante de sabotaje NO entra al historial. Restaurar con:\n"
              "  python3 .claude/scripts/gates/check_suite_discrimina.py --verificar",
              file=sys.stderr)
        return 1

    print(f"check-mutante-en-staging: OK (alcance medido: {medidos} {plural})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
