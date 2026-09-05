#!/usr/bin/env python3
"""La raiz que los gates de RST miden NO se deriva de su propia posicion.

Es la mitad ROJA, escrita ANTES de reapuntar los gates. El defecto que cubre
esta MEDIDO (:ref:`h-docs-1103`): al mudar `.claude/scripts/gates/` a
`thyrox/src/gates/`, `parents[3]` dejo de nombrar el repo del consumidor y paso
a nombrar `/home/user`. La consecuencia fue silenciosa en su forma y ruidosa en
su efecto: el gate de sintaxis buscaba `.venv` en `/home/user/.venv` —que no
existe— y rehusaba, bloqueando todo commit con prosa staged.

Qué cubre cada bloque:

1. **La raiz nombra el repo del consumidor**, no el arbol que lo contiene ni el
   repo del propio gate. Ese es el defecto medido.
2. **El control PUEDE fallar**: el mismo caso contra la aritmetica vieja
   (`parents[3]`) debe dar un veredicto DISTINTO. Sin ese gemelo, el bloque 1
   pasaria igual con el defecto puesto y sin el (sub-patron D).
3. **La raiz derivada tiene lo que el gate va a tocar** — `source/` y `.venv`.
   Un gate que apunte a una raiz sin ellos publica un cero que no midio nada.
"""
from __future__ import annotations

import pathlib
import sys

RAIZ_THYROX = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ_THYROX / 'src'))

from paths import reach  # noqa: E402


def test_la_raiz_del_consumidor_no_es_el_arbol_que_lo_contiene():
    """Bloque 1 — el defecto medido, en su forma directa."""
    docs = reach.root('docs')
    assert docs.name == 'kaupamex-docs', docs
    assert docs != reach.tree_root(), (
        'la raiz del consumidor colapso con el arbol que lo contiene')


def test_la_aritmetica_vieja_da_un_veredicto_DISTINTO():
    """Bloque 2 — el gemelo que hace del bloque 1 un control y no un adorno.

    Si `parents[3]` siguiera acertando, el bloque 1 pasaria con el defecto
    puesto y nadie lo notaria.
    """
    gate = RAIZ_THYROX / 'src' / 'gates' / 'check_rst_sintaxis.py'
    assert gate.is_file(), gate
    vieja = gate.resolve().parents[3]
    assert vieja != reach.root('docs'), (
        f'la aritmetica vieja acierta ({vieja}) — este control no discrimina')


def test_la_raiz_derivada_tiene_lo_que_el_gate_toca():
    """Bloque 3 — no basta con nombrar un directorio: tiene que ser EL repo."""
    docs = reach.root('docs')
    assert (docs / 'source').is_dir(), f'{docs} no tiene source/'
    assert (docs / '.venv').is_dir(), f'{docs} no tiene .venv/'


def test_el_gate_de_sintaxis_ya_no_deriva_su_raiz_de_su_posicion():
    """Bloque 4 — la conducta que se corrige, leida en el guion mismo.

    Se mide la ASIGNACION de `RAIZ`, no la presencia del literal `parents[`.
    La primera version de este control buscaba el literal y fallaba contra el
    arreglo correcto, porque el comentario que explica el defecto lo NOMBRA:
    medir la forma y concluir sobre el fondo — sub-patron C, cometido con el
    control recien escrito para evitar el D.
    """
    import ast
    gate = RAIZ_THYROX / 'src' / 'gates' / 'check_rst_sintaxis.py'
    arbol = ast.parse(gate.read_text())
    asignaciones = [n for n in arbol.body if isinstance(n, ast.Assign)
                    and any(getattr(d, 'id', None) == 'RAIZ' for d in n.targets)]
    assert asignaciones, 'no declara RAIZ en el cuerpo del modulo'
    fuente = ast.unparse(asignaciones[0].value)
    assert 'parents' not in fuente, (
        f'sigue derivando la raiz de su propia posicion: RAIZ = {fuente}')
    assert 'reach' in fuente, f'no usa el mecanismo de alcance: RAIZ = {fuente}'


def _run() -> int:
    fallos = 0
    casos = [(n, f) for n, f in sorted(globals().items())
             if n.startswith('test_') and callable(f)]
    for nombre, caso in casos:
        try:
            caso()
            print(f'  ok    {nombre}')
        except Exception as e:                          # noqa: BLE001
            fallos += 1
            print(f'  FALLA {nombre}: {type(e).__name__}: {e}')
    print(f'{len(casos) - fallos}/{len(casos)} aserciones verdes')
    return 1 if fallos else 0


if __name__ == '__main__':
    raise SystemExit(_run())
