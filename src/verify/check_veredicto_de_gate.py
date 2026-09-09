#!/usr/bin/env python3
"""Un veredicto de gate se publica en tres estados, no en dos.

La convención del proyecto es que un gate que **no puede medir** rehúsa con
``exit 2`` y sin emitir conteo, porque un 0 ahí sería un verde falso. Quien lo
consume tiene que distinguir ese caso; si lo colapsa con «midió y salió 0»,
publica PASS sobre una medición que nunca ocurrió — el sub-patrón D de
``metrica-decide-la-conclusion.md``.

El idioma que lo produce es concreto y greppeable::

    VAR=$(bash .claude/scripts/gates/algo.sh --quiet 2>/dev/null | tail -1)
    if [[ "${VAR:-0}" -eq 0 ]]; then ok "..."

El ``2>/dev/null`` tira el motivo del rechazo, la sustitución convierte la nada
en 0, y el 0 se publica como PASS. Medido con el idioma exacto antes de
arreglarlo (:ref:`h-docs-492`)::

    codigo del gate: 2 (rehusa) | AMIN capturado: '<>'
    VEREDICTO PUBLICADO: ok

Este gate mide **esa** forma: una variable que toma su valor de un gate y que
después se lee con ``${VAR:-<literal>}``. No mide la ausencia de la guarda en
general — un bloque puede distinguir el rechazo de otras diez maneras.

*Métrica:* pares (asignación desde un gate, lectura con sustitución por
defecto) sobre los ``.sh`` de las raíces medidas.
*Ciega a:* el mismo colapso escrito de otra forma —``|| echo 0``,
``2>/dev/null || true``, un ``awk`` que imprime 0 al no casar—, y a los
consumidores en Python, que leen ``returncode`` en vez de una cadena. Un 0 aquí
prueba que no queda **este** idioma, no que no quede el defecto.
"""
import argparse
import pathlib
import re
import sys

#: Raíces donde vive el tooling que consume gates. No se mide `.claude/eventos`:
#: un evento es evidencia fechada de un episodio, no código vivo que se corrija.
RAICES = ('.claude/scripts', '.claude/hooks')

#: Cómo se reconoce la invocación de un gate nuestro.
INVOCA_GATE = re.compile(r'(?:bash|python3|sh)\s+\S*(?:scripts/gates/|check[_-])\S*')

#: `VAR=$( ... )` en una sola línea.
ASIGNA = re.compile(r'^\s*([A-Za-z_][A-Za-z0-9_]*)=\$\((.+)\)\s*$')

#: `${VAR:-algo}` — la sustitución que convierte «no medí» en un valor.
def _lee_con_defecto(texto, var):
    return re.search(r'\$\{' + re.escape(var) + r':-[^}]*\}', texto) is not None


def infractores(raiz):
    """Devuelve (hallados, archivos_medidos) bajo `raiz`."""
    base = pathlib.Path(raiz)
    hallados, medidos = [], 0
    if not base.is_dir():
        return hallados, medidos
    for guion in sorted(base.rglob('*.sh')):
        medidos += 1
        texto = guion.read_text(errors='ignore')
        for numero, linea in enumerate(texto.splitlines(), 1):
            m = ASIGNA.match(linea)
            if not m:
                continue
            var, cuerpo = m.group(1), m.group(2)
            if not INVOCA_GATE.search(cuerpo):
                continue
            if _lee_con_defecto(texto, var):
                hallados.append((str(guion), numero, var))
    return hallados, medidos


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--quiet', action='store_true',
                    help='sólo el conteo, para el orquestador')
    ap.add_argument('--strict', action='store_true',
                    help='exit 1 si hay infractores')
    args = ap.parse_args()

    todos, medidos = [], 0
    for raiz in RAICES:
        h, m = infractores(raiz)
        todos += h
        medidos += m

    if args.quiet:
        print(len(todos))
    elif todos:
        print(f'check-veredicto-de-gate: {len(todos)} veredicto(s) que leen '
              f'«no pude medir» como 0')
        for archivo, numero, var in todos:
            print(f'  {archivo}:{numero}  ${{{var}:-…}} sobre la salida de un gate')
        print('  El arreglo: capturar el código con `medir_gate` y publicar el')
        print('  WARN de «SIN MEDIR» con `gate_midio` antes de comparar el conteo.')
        print(f'  (alcance medido: {medidos} archivo(s) .sh en {", ".join(RAICES)})')
    else:
        print('check-veredicto-de-gate: OK — ningún veredicto colapsa el rechazo '
              'del gate con un 0 medido')
        print(f'  (alcance medido: {medidos} archivo(s) .sh en {", ".join(RAICES)})')

    return 1 if (args.strict and todos) else 0


if __name__ == '__main__':
    sys.exit(main())
