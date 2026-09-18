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

Cuál de las dos fuentes GOBIERNA — medido antes de declararlo
--------------------------------------------------------------
Un id nace en dos sitios: aquí, contra el árbol de ``.rst`` del consumidor, y
en ``agent_store.py agregar-hallazgo``, como fila de ``findings_history``. Hasta
2026-09-16 la unión de las dos en lectura se leía como «dos fuentes iguales»,
y **no lo son**.

Medido sobre los seis prefijos del corpus: los números que viven **sólo** como
fila del store eran **cero en cinco** de ellos, y **tres** en el sexto
(``THYROX``). O sea que el ``.rst`` ya era la fuente de facto y el store ya era
su índice; nadie lo había declarado. Declarado ahora:

- **El ``.rst`` es el artefacto de gobierno.** Lleva el cuerpo del hallazgo, su
  etiqueta ``:ref:`` y su fila en el índice de la iniciativa. Es lo que se cita.
- **La fila del store es su entrada de búsqueda** entre sesiones
  (``agent_store.py buscar-hallazgos``). No sustituye al archivo.
- **La unión que este módulo hace al leer es el PUENTE de la ventana** entre
  registrar la fila y escribir el ``.rst``. Esa ventana es legítima mientras
  dura; congelada, es deuda — y quien la mide es
  ``src/verify/check_finding_id_unique.py``, que reporta toda fila sin su
  archivo.

Por eso el default de :func:`next_id` y :func:`is_free` **consulta el store**:
un id libre en los ``.rst`` puede estar ocupado por una fila escrita hace un
minuto, y publicar «libre» sobre esa mitad es exactamente lo que produjo la
colisión de ``H-THYROX-24`` (dos hallazgos distintos bajo un número, el segundo
pisando al primero en silencio). El opt-out existe —:data:`NO_STORE`— y es
**explícito**: sirve para medir el árbol en aislamiento, no para el uso normal.

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
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent  # thyrox/src/hallazgo
sys.path.insert(0, str(HERE.parent / "paths"))
import reach  # noqa: E402  (la ruta se compone arriba, a propósito)

#: Toda cita de un hallazgo, en cualquier forma en que el árbol la escriba:
#: el nombre del archivo (``hallazgo-H-API-259-...rst``), la etiqueta ancla
#: (``.. _h-api-259:``, en minúscula — por eso el patrón no ancla mayúscula
#: en el prefijo), o una mención suelta en prosa o en el monolito
#: ``audits/hallazgos-<slug>.rst`` que ``hallazgos-documentacion-
#: obligatoria.md`` congela en vez de migrar y que cita varios números
#: dentro del MISMO archivo, ninguno en su nombre.
_ID_RE = re.compile(r'\bH-(?P<prefix>[A-Za-z]+)-(?P<number>\d+)\b')


class _StoreSentinel:
    """Centinela de resolución del store. No es una ruta: es una decisión."""

    def __init__(self, name: str) -> None:
        self._name = name

    def __repr__(self) -> str:  # pragma: no cover - sólo para diagnóstico
        return self._name


#: DEFAULT — resolver el store del proveedor con ``reach.agent_store_path()``.
#: Un caller que no declara nada obtiene la unión de las dos fuentes, que es la
#: conducta segura: el árbol solo no ve la fila recién registrada.
RESOLVE_STORE = _StoreSentinel('RESOLVE_STORE')

#: OPT-OUT explícito — medir **sólo** el árbol del consumidor. Lo usa la suite,
#: que ejercita el escaneo en aislamiento sobre un árbol de prueba. ``None`` se
#: admite como su sinónimo por los callers previos a esta distinción.
NO_STORE = _StoreSentinel('NO_STORE')


def _resolved_store(store_path):
    """La ruta del store, o ``None`` si el caller declaró el opt-out."""
    if store_path is RESOLVE_STORE:
        return reach.agent_store_path()
    if store_path is NO_STORE or store_path is None:
        return None
    return store_path


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


def used_numbers(source_root: Path, prefix: str) -> list[int]:
    """Todo número ya usado bajo ``prefijo``, en cualquier archivo de texto
    del árbol — no sólo ``.rst``: un barrido en ``.py`` o una evidencia en
    ``.txt`` pueden citar el mismo literal.

    Un archivo que no decodifica como UTF-8 se salta — no aborta el
    escaneo entero por un solo binario perdido bajo ``source/``.
    """
    prefix = prefix.upper()
    numbers = []
    for file_path in source_root.rglob('*'):
        if not file_path.is_file():
            continue
        try:
            text = file_path.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError):
            continue
        for match in _ID_RE.finditer(text):
            if match.group('prefix').upper() == prefix:
                numbers.append(int(match.group('number')))
    return numbers


def store_numbers(store_path: Path, prefix: str) -> list[int]:
    """Todo número bajo ``prefijo`` que viva como FILA del store de hallazgos.

    El acuñador escanea los ``.rst`` del consumidor, y ésa era su única
    fuente. Un hallazgo registrado con ``agent_store.py agregar-hallazgo``
    —la vía que el paso 5 del flujo de sesión declara— no deja ningún
    ``.rst``, así que era invisible para el siguiente número.

    Medido por conducta, dos veces en una hora: ``acunar THYROX`` devolvió el
    mismo id las dos veces, y el segundo registro **pisó** al primero sin
    emitir un byte. Ver ``H-THYROX-26``.

    Ausencia no es error. Un store que todavía no existe, o que existe sin la
    tabla, devuelve la lista vacía: rehusar aquí ataría el acuñador a que el
    store ya estuviera poblado, y esa precondición no tiene por qué cumplirse
    la primera vez que alguien acuña un prefijo.
    """
    if not store_path.is_file():
        return []
    prefix = prefix.upper()
    numbers: list[int] = []
    conn = sqlite3.connect(f'file:{store_path}?mode=ro', uri=True)
    try:
        rows = conn.execute('SELECT finding_id FROM findings_history').fetchall()
    except sqlite3.DatabaseError:
        return []          # el store existe pero aún no tiene la tabla
    finally:
        conn.close()
    for (finding_id,) in rows:
        match = _ID_RE.fullmatch(finding_id or '')
        if match and match.group('prefix').upper() == prefix:
            numbers.append(int(match.group('number')))
    return numbers


#: El acuñador ANTEPONE ``H-``: su argumento es la capa DESNUDA. Medido por
#: conducta 2026-09-17 al acuñar ``H-THYROX-73`` — ``acunar H-THYROX`` devolvía
#: ``H-H-THYROX-01``, un id malformado que entra al corpus si nadie lo mira.
_BARE_PREFIX_RE = re.compile(r'[A-Za-z]+')


def validated_prefix(prefix: str) -> str:
    """La capa desnuda, o rehúsa nombrando el argumento correcto.

    Rehúsa en vez de componer, por la misma razón que :func:`is_free` rehúsa
    un id sin forma: un guion que no puede medir no publica un resultado. Un
    ``H-H-THYROX-01`` devuelto como si fuera válido es peor que un error —
    nadie lo mira, y el corpus se queda con él.

    Dos formas, medidas las dos:

    * el argumento ya trae el ``H-`` que este módulo antepone;
    * el argumento no es ``[A-Za-z]+`` — la misma exigencia que
      :func:`is_free` ya hace sobre el id completo.
    """
    candidate = prefix.strip()
    if candidate[:2].upper() == 'H-':
        raise SystemExit(
            f"hallazgo_ids.py: '{prefix}' ya trae el prefijo 'H-'. El "
            f"acuñador lo antepone, así que el argumento es la capa "
            f"desnuda: '{candidate[2:]}'")
    if not _BARE_PREFIX_RE.fullmatch(candidate):
        raise SystemExit(
            f"hallazgo_ids.py: '{prefix}' no tiene la forma de una capa "
            f"([A-Za-z]+) — p. ej. API, DOCS, THYROX")
    return candidate


def next_id(source_root: Path, prefix: str,
            store_path: Path | _StoreSentinel | None = RESOLVE_STORE) -> str:
    """``H-<PREFIJO>-N``, con ``N`` uno más que el máximo ya usado — o 1 si
    el prefijo no tiene ninguna cita todavía.

    Por DEBAJO de 10 lleva un cero de relleno a dos dígitos —
    ``H-API-01``..``H-API-09`` es la forma real del árbol, medida antes de
    fijar esto: la primera versión proponía ``H-THYROX-8`` donde los siete
    hallazgos ya escritos son ``H-THYROX-01``..``H-THYROX-07``. De 10 en
    adelante NO hay relleno — el árbol real escribe ``H-API-10``, no
    ``H-API-010`` — así que el formato es ``:02d}``, no un ancho fijo.
    """
    prefix = validated_prefix(prefix)
    numbers = used_numbers(source_root, prefix)
    resolved = _resolved_store(store_path)
    if resolved is not None:
        numbers += store_numbers(resolved, prefix)
    next_number = (max(numbers) + 1) if numbers else 1
    return f'H-{prefix.upper()}-{next_number:02d}'


def is_free(source_root: Path, full_id: str,
            store_path: Path | _StoreSentinel | None = RESOLVE_STORE) -> bool:
    """¿``full_id`` NO aparece ya citado en el árbol NI en el store?

    Las dos fuentes, por la misma razón que :func:`next_id`: un id libre
    en los ``.rst`` puede estar ocupado por una fila, y verificar sólo una
    mitad publica un «libre» que el escritor va a rehusar.
    """
    match = re.fullmatch(r'H-(?P<prefix>[A-Za-z]+)-(?P<number>\d+)',
                                 full_id)
    if not match:
        raise SystemExit(
            f"hallazgo_ids.py: '{full_id}' no tiene la forma "
            f"H-<PREFIJO>-<N>")
    number = int(match.group('number'))
    prefix = match.group('prefix')
    used = used_numbers(source_root, prefix)
    resolved = _resolved_store(store_path)
    if resolved is not None:
        used += store_numbers(resolved, prefix)
    return number not in used


def _cmd_acunar(args: argparse.Namespace) -> int:
    root = docs_root(args.consumer)
    print(next_id(root, args.prefix))   # default: árbol + store
    return 0


def _cmd_verificar(args: argparse.Namespace) -> int:
    root = docs_root(args.consumer)
    if is_free(root, args.id):          # default: árbol + store
        print(f'{args.id} — libre')
        return 0
    print(f'{args.id} — YA EXISTE, colisión', file=sys.stderr)
    return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description='El next_number H-<PREFIJO>-N libre, medido contra el '
                     'árbol real — nunca de memoria ni acotado a una sola '
                     'iniciativa.')
    sub = parser.add_subparsers(dest='comando', required=True)

    acunar = sub.add_parser(
        'acunar', help='imprime el next_number H-<PREFIJO>-N libre')
    acunar.add_argument('prefix', help='API, DOCS, THYROX, UI, DB, SERVER…')
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
