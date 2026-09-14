#!/usr/bin/env python3
"""hallazgo_ids.py — el siguiente ``H-<PREFIJO>-N`` libre, medido contra el
árbol real de docs — no acuñado de memoria ni acotado a una iniciativa.

Por qué existe
---------------
``task_ids.py`` acuña ``TASK-<CAPA>-NNNN`` porque el ``#N`` del board
**reinicia por sesión** — ahí el problema es que dos sesiones distintas
colisionan en el mismo número por construcción. Un ``H-<PREFIJO>-N`` de
hallazgo es distinto: nadie lo asigna por sesión, lo elige quien escribe el
archivo, y el único riesgo es no mirar bien todo el árbol antes de elegir.

Ese riesgo se midió dos veces en la misma sesión que originó este módulo: la
primera vez el ``ls`` que buscaba "el número más alto" se acotó a una sola
iniciativa (``completar-raiz-orm/hallazgos/``) cuando ``H-API-*`` es un
espacio de nombres GLOBAL a la capa ``api`` — coincidió con el número
correcto por suerte, no por diseño. La segunda vez se repitió el mismo
``ls``/``grep`` a mano sobre todo el árbol, que es exactamente el trabajo
que un guion versionado no vuelve a tener que rehacer, ni a poder acotar mal.

Qué NO resuelve
-----------------
Dos sesiones que acuñen el MISMO prefijo en el MISMO instante pueden proponer
el mismo número — este módulo no tiene bloqueo ni reserva, sólo mide el
árbol en el momento en que se le pregunta. La defensa contra eso es la misma
que ya rige para cualquier commit en este ecosistema: el hallazgo se escribe
y se publica de inmediato, así que la ventana de colisión es la de escribir
un archivo, no la de una sesión entera.

Dónde vive el árbol que se escanea
------------------------------------
TODO hallazgo, sin importar su prefijo — ``H-API-*``, ``H-UI-*``,
``H-THYROX-*``— vive bajo ``source/gestion/pm/`` de **kaupamex-docs**, nunca
en el repo que el prefijo nombra. El prefijo filtra QUÉ se cuenta; la raíz a
escanear es siempre la misma, y se resuelve con ``reach.root('docs')``
(DEC-04: el cableado del consumidor no se codifica a mano).
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent  # thyrox/src/hallazgo
sys.path.insert(0, str(HERE.parent / "paths"))
import reach  # noqa: E402  (la ruta se compone arriba, a propósito)

#: Toda cita de un hallazgo, en cualquier forma en que el árbol la escriba:
#: el nombre de archivo (``hallazgo-H-API-259-...rst``), la etiqueta ancla
#: (``.. _h-api-259:``, en minúscula — por eso el patrón no ancla mayúscula
#: en el prefijo), o una mención suelta en prosa o en el monolito
#: ``audits/hallazgos-<slug>.rst`` que ``hallazgos-documentacion-
#: obligatoria.md`` congela en vez de migrar y que cita varios números
#: dentro del MISMO archivo, ninguno en su nombre.
_ID_RE = re.compile(r'\bH-(?P<prefijo>[A-Za-z]+)-(?P<numero>\d+)\b')


def docs_root(consumer: str = 'docs') -> Path:
    """La raíz de ``source/`` de kaupamex-docs — donde vive TODO hallazgo.

    ``consumer`` existe para que un caller pueda apuntar a otro clon si
    alguna vez hiciera falta (o a un árbol de prueba); el default es el
    único que este ecosistema usa hoy.
    """
    root = reach.root(consumer)
    source = root / 'source'
    if not source.is_dir():
        raise SystemExit(
            f"hallazgo_ids.py: '{root}' no tiene 'source/' — ¿es de verdad "
            f"kaupamex-docs? (resuelto con reach.root({consumer!r}))")
    return source


def used_numbers(source_root: Path, prefijo: str) -> list[int]:
    """Todo número ya usado bajo ``prefijo``, en cualquier archivo de texto
    del árbol — no sólo ``.rst``: un barrido en ``.py`` o una evidencia en
    ``.txt`` pueden citar el mismo literal.

    Un archivo que no decodifica como UTF-8 se salta — no aborta el
    escaneo entero por un solo binario perdido bajo ``source/``.
    """
    prefijo = prefijo.upper()
    numeros = []
    for archivo in source_root.rglob('*'):
        if not archivo.is_file():
            continue
        try:
            texto = archivo.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError):
            continue
        for coincidencia in _ID_RE.finditer(texto):
            if coincidencia.group('prefijo').upper() == prefijo:
                numeros.append(int(coincidencia.group('numero')))
    return numeros


def next_id(source_root: Path, prefijo: str) -> str:
    """``H-<PREFIJO>-N``, con ``N`` uno más que el máximo ya usado — o 1 si
    el prefijo no tiene ninguna cita todavía.

    Por DEBAJO de 10 lleva un cero de relleno a dos dígitos —
    ``H-API-01``..``H-API-09`` es la forma real del árbol, medida antes de
    fijar esto: la primera versión proponía ``H-THYROX-8`` donde los siete
    hallazgos ya escritos son ``H-THYROX-01``..``H-THYROX-07``. De 10 en
    adelante NO hay relleno — el árbol real escribe ``H-API-10``, no
    ``H-API-010`` — así que el formato es ``:02d}``, no un ancho fijo.
    """
    numeros = used_numbers(source_root, prefijo)
    siguiente = (max(numeros) + 1) if numeros else 1
    return f'H-{prefijo.upper()}-{siguiente:02d}'


def is_free(source_root: Path, id_completo: str) -> bool:
    """¿``id_completo`` NO aparece ya citado en el árbol?"""
    coincidencia = re.fullmatch(r'H-(?P<prefijo>[A-Za-z]+)-(?P<numero>\d+)',
                                 id_completo)
    if not coincidencia:
        raise SystemExit(
            f"hallazgo_ids.py: '{id_completo}' no tiene la forma "
            f"H-<PREFIJO>-<N>")
    numero = int(coincidencia.group('numero'))
    return numero not in used_numbers(source_root, coincidencia.group('prefijo'))


def _cmd_acunar(args: argparse.Namespace) -> int:
    root = docs_root(args.consumer)
    print(next_id(root, args.prefijo))
    return 0


def _cmd_verificar(args: argparse.Namespace) -> int:
    root = docs_root(args.consumer)
    if is_free(root, args.id):
        print(f'{args.id} — libre')
        return 0
    print(f'{args.id} — YA EXISTE, colisión', file=sys.stderr)
    return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description='El siguiente H-<PREFIJO>-N libre, medido contra el '
                     'árbol real — nunca de memoria ni acotado a una sola '
                     'iniciativa.')
    sub = parser.add_subparsers(dest='comando', required=True)

    acunar = sub.add_parser(
        'acunar', help='imprime el siguiente H-<PREFIJO>-N libre')
    acunar.add_argument('prefijo', help='API, DOCS, THYROX, UI, DB, SERVER…')
    acunar.add_argument('--consumer', default='docs',
                         help='el clon a resolver con reach.root (default: docs)')
    acunar.set_defaults(func=_cmd_acunar)

    verificar = sub.add_parser(
        'verificar', help='¿un H-<PREFIJO>-N ya elegido está libre?')
    verificar.add_argument('id', help='el identificador completo, p. ej. H-API-1112')
    verificar.add_argument('--consumer', default='docs')
    verificar.set_defaults(func=_cmd_verificar)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
