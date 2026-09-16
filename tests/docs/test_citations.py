#!/usr/bin/env python3
"""Suite de ``docs/cit.py`` — la resolucion de una cita ``:doc:``.

Origen: TASK-DOCS-0546. El mecanismo existia en el CONSUMIDOR, dentro de un
directorio de evento **fechado** (``move_initiative.py`` de
``reparto-de-iniciativas-por-dominio-*``), y un gate del proveedor que lo
importara invertiria DEC-04 — el proveedor dependiendo del consumidor. Este
modulo es el levantamiento, no una copia: lo que el consumidor tenia sigue
siendo el que reescribe al mover, y el proveedor pasa a ser la fuente del
**patron** y de la **aritmetica**.

Lo que la suite mide, y por que cada bloque existe:

1. ``DOC_ROLE`` reconoce las dos formas del rol — el destino desnudo
   (```:doc:`ruta``` ) y el titulado (```:doc:`Titulo <ruta>``` ). Un patron
   que solo vea la primera es ciego a la segunda, y la segunda existe en el
   arbol.
2. ``resolve_target`` distingue absoluto de relativo: un destino que empieza
   por ``/`` cuelga de la raiz del arbol; el resto se normaliza contra el
   directorio del citante. Es la aritmetica que el mover ya tenia.
3. ``iter_citations`` SALTA las citas dentro de un literal — en linea y en
   bloque. Sphinx no las resuelve, asi que contarlas como enlaces rotos es
   medir un fenomeno que no existe. Es la ceguera que el censo anterior
   declaro y nadie midio: 4 de sus 85.
4. ANULACION del salto de literal: sin el, las citas del bloque 3 vuelven a
   contarse. Tienen que caer **exactamente** esas, ninguna otra.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Bootstrap canonico (`paths.reach.BOOTSTRAP`): ascenso con deteccion, no
# `parents[N]` — la aritmetica por offset falla en silencio al mover el archivo.
_AQUI = Path(__file__).resolve()
_RAIZ = next((p for p in _AQUI.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _RAIZ is None:
    raise RuntimeError(f"thyrox: no se encontro src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))

from docs import citations as cit  # noqa: E402


def test_the_role_reads_the_bare_target():
    assert cit.targets_in(":doc:`arquitectura-tecnica/modulos/users/index`") == [
        "arquitectura-tecnica/modulos/users/index"
    ]


def test_the_role_reads_the_titled_target():
    """La forma titulada existe en el arbol y un patron ciego a ella la pierde."""
    assert cit.targets_in(":doc:`el modulo de usuarios <modulos/users/index>`") == [
        "modulos/users/index"
    ]


def test_an_absolute_target_hangs_from_the_tree_root():
    assert cit.resolve_target(
        "/requisitos/casos-uso/auth/uc-auth-01-registrar", "arquitectura-tecnica/modulos/users/index"
    ) == "requisitos/casos-uso/auth/uc-auth-01-registrar"


def test_a_relative_target_normalises_against_the_citing_directory():
    assert cit.resolve_target(
        "../modelos/modelo-settings", "arquitectura-tecnica/perspectivas/analisis-x"
    ) == "arquitectura-tecnica/modelos/modelo-settings"


def test_a_sibling_target_stays_in_the_citing_directory():
    assert cit.resolve_target("index", "gestion/pm/docs/iniciativas/x/progreso") == (
        "gestion/pm/docs/iniciativas/x/index"
    )


#: Texto REAL del arbol, no fabricado: los tres renglones son
#: ``progreso-revisar-pendientes-docs.rst:1297,1298,1340``, donde el rol vive
#: dentro de un literal en linea y por tanto NO es un enlace.
TEXTO_CON_LITERAL = """Un enlace de verdad: :doc:`accounts/index`.

- ``modulos/mod-accounts.rst`` -> ``:doc:`accounts/index```
- ``modulos/mod-catalogue.rst`` -> ``:doc:`catalogue/index```

El de la izquierda era ``:doc:`../modelos/modelo-settings``` que era valido.
"""


def test_a_citation_inside_an_inline_literal_is_not_a_link():
    """Cuatro de las 85 del censo anterior son esto, y no lo eran.

    Sphinx no resuelve un rol dentro de ``...``; contarlo como enlace roto es
    medir un fenomeno que no ocurre — el sub-patron C con el censo como
    sujeto.
    """
    vistas = [t for t, _ in cit.iter_citations(TEXTO_CON_LITERAL, "x/y")]
    assert vistas == ["accounts/index"], vistas


TEXTO_CON_BLOQUE = """Prosa con su enlace :doc:`vivo/uno`.

.. code-block:: rst

   :doc:`dentro/del/bloque`

Prosa otra vez.
"""


def test_a_citation_inside_a_literal_block_is_not_a_link():
    vistas = [t for t, _ in cit.iter_citations(TEXTO_CON_BLOQUE, "x/y")]
    assert vistas == ["vivo/uno"], vistas


def test_the_literal_skip_carries_its_own_weight():
    """ANULACION: sin el salto, vuelven EXACTAMENTE las citas de literal.

    Con ``LITERAL_SPANNERS`` vacia el iterador deja de saltar, y los dos
    textos de arriba pasan de 1 cita a 4 y a 2. Si al anularlo el veredicto
    no cambiara, el salto no estaria midiendo nada.
    """
    guardadas = cit.LITERAL_SPANNERS
    try:
        cit.LITERAL_SPANNERS = ()
        con_linea = [t for t, _ in cit.iter_citations(TEXTO_CON_LITERAL, "x/y")]
        con_bloque = [t for t, _ in cit.iter_citations(TEXTO_CON_BLOQUE, "x/y")]
        assert len(con_linea) == 4, con_linea
        assert len(con_bloque) == 2, con_bloque
    finally:
        cit.LITERAL_SPANNERS = guardadas

    # Y restaurado, vuelve a discriminar.
    assert len([t for t, _ in cit.iter_citations(TEXTO_CON_LITERAL, "x/y")]) == 1


def test_a_citation_reports_the_line_it_lives_on():
    """Sin el renglon, el aviso del gate no es accionable."""
    [(destino, linea)] = cit.iter_citations("uno\ndos\n:doc:`tres/cuatro`\n", "x/y")
    assert (destino, linea) == ("tres/cuatro", 3)




#: Texto REAL del corpus: un `.. seealso::` cuyo cuerpo lleva un `:doc:` vivo,
#: y un `.. code-block::` cuyo cuerpo lleva uno que es muestra. Los dos abren
#: con un renglon terminado en `::`, asi que un detector que no discrimine
#: directiva de parrafo los trata igual.
TEXTO_CON_DIRECTIVAS = """Titulo
======

.. seealso::

   :doc:`/requisitos/casos-uso/auth/uc-auth-01-registrar`

.. code-block:: rst

   :doc:`/esto/es/muestra`
"""


def test_a_doc_inside_a_seealso_is_a_live_link():
    vivas = [d for d, _ in cit.iter_citations(TEXTO_CON_DIRECTIVAS, "x/y")]
    assert "/requisitos/casos-uso/auth/uc-auth-01-registrar" in vivas, vivas


def test_a_doc_inside_a_code_block_is_not_a_link():
    vivas = [d for d, _ in cit.iter_citations(TEXTO_CON_DIRECTIVAS, "x/y")]
    assert "/esto/es/muestra" not in vivas, vivas


def test_the_directive_discrimination_carries_its_own_weight():
    """Anulacion: sin ella, el cuerpo de CUALQUIER directiva pasa por literal.

    Es el defecto medido de `check_vocabulario_prosa.block_spans`, que abre
    tramo ante cualquier `::` final. Retirada la discriminacion tiene que caer
    **exactamente** la cita del `seealso` — la del `code-block` ya estaba fuera
    y sigue estandolo.
    """
    import re as _re

    antes = {d for d, _ in cit.iter_citations(TEXTO_CON_DIRECTIVAS, "x/y")}
    original = cit._DIRECTIVE_OPENING
    try:
        cit._DIRECTIVE_OPENING = _re.compile(r"(?!)")   # no casa nunca
        despues = {d for d, _ in cit.iter_citations(TEXTO_CON_DIRECTIVAS, "x/y")}
    finally:
        cit._DIRECTIVE_OPENING = original

    caidas = antes - despues
    assert caidas == {"/requisitos/casos-uso/auth/uc-auth-01-registrar"}, caidas


if __name__ == "__main__":
    import traceback
    _fallos = 0
    for _nombre, _caso in sorted(list(globals().items())):
        if not _nombre.startswith("test_") or not callable(_caso):
            continue
        try:
            _caso()
            print(f"  ok    {_nombre}")
        except Exception:
            _fallos += 1
            print(f"  FALLO {_nombre}")
            traceback.print_exc()
    print(f"resumen: {_fallos} fallo(s)")
    raise SystemExit(1 if _fallos else 0)
