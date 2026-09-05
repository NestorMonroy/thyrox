#!/usr/bin/env python3
"""Prueba de ``derive_submodule`` — el derivador de capa de ``tasks`` (#851).

El id de una tarea es un ordinal global y **no declara su capa**; meterla en el
id (``API-042``) es exactamente lo que :ref:`h-docs-317` prohibe. La columna
``tasks.submodule`` la puebla ``derive_submodule``, que **no inventa el dato:
lo rescata** del texto que la tarea ya trae.

Lo que se cubre, y por que cada bloque existe:

1. **La precedencia** — el registro de hallazgos gana al prefijo del id. No es
   preferencia: son **5 desacuerdos medidos** en el store, donde el prefijo
   dice una capa y ``findings_history`` dice otra.
2. **El control que puede fallar** — los mismos casos con el mapa **vacio**.
   Si al vaciarlo NO cambia el veredicto, la consulta al registro no estaba
   decidiendo nada y el bloque 1 seria un verde que no discrimina
   (sub-patron D de ``metrica-decide-la-conclusion.md``).
3. **La senal de ruta** — solo decide cuando es **inequivoca**; dos capas
   nombradas en el mismo texto devuelven ``None``, no la primera.
4. **La procedencia** — cada veredicto viaja con COMO se supo. Un contador
   unico para «lo lei del registro» y «lo adivine por un token de ruta» da el
   mismo numero con un derivador fiable y con uno ciego.

Uso:  python3 .claude/scripts/tests/test_derive_submodule.py
"""

from __future__ import annotations

import importlib.util
import pathlib
import sys

# El SUT vive un nivel arriba (``.claude/scripts/``), hermano de este
# directorio. Se carga por ruta con importlib — mismo patron que
# ``test_vecinos_de_tarea.py``.
HERE = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("agent_store", HERE / "agents" / "agent_store.py")
store = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(store)

PASS = 0
FAIL = 0


def check(desc: str, expected, got) -> None:
    global PASS, FAIL
    if expected == got:
        PASS += 1
        print(f"  ok    {desc}")
    else:
        FAIL += 1
        print(f"  FALLA {desc}\n        esperado: {expected}\n        obtenido: {got}")


def check_true(desc: str, condition: bool) -> None:
    check(desc, True, bool(condition))


# Los cinco desacuerdos REALES del store (medidos 2026-08-24 cruzando el
# prefijo citado en cada tarea contra `findings_history.submodule`). Son el
# positivo del repo que `hallazgo-abierto-genera-sucesor.md` exige: un caso
# fabricado por quien escribio el derivador heredaria su encuadre.
DESACUERDOS_MEDIDOS = {
    "H-SERVER-16": "api",    # tareas #259, #260 — prefijo dice server
    "H-API-556": "docs",     # tarea  #315       — prefijo dice api
    "H-API-557": "docs",     # tareas #316, #330 — prefijo dice api
}

print("== 1. precedencia: el registro de hallazgos gana al prefijo ==")

capa, origen = store.derive_submodule(
    "Barrer las tareas periodicas caidas en disoluciones de addon (H-SERVER-16)",
    None,
    DESACUERDOS_MEDIDOS,
)
check("H-SERVER-16 resuelve a la capa del REGISTRO, no a la del prefijo", "api", capa)
check("...y declara que lo supo del registro", "hallazgo_store", origen)

capa, origen = store.derive_submodule(
    "Reconciliar el drift del contrato (H-API-557)", None, DESACUERDOS_MEDIDOS
)
check("H-API-557 resuelve a docs aunque su prefijo diga api", "docs", capa)

print("\n== 2. el control que puede fallar: mismo caso, registro VACIO ==")

# Si al vaciar el mapa el veredicto NO cambiara, el bloque 1 estaria pasando
# por una razon distinta de la que afirma. Este par es lo unico que separa
# «la consulta decide» de «el prefijo ya daba api por su cuenta».
capa_sin, origen_sin = store.derive_submodule(
    "Barrer las tareas periodicas caidas en disoluciones de addon (H-SERVER-16)",
    None,
    {},
)
check("sin registro, H-SERVER-16 CAE al prefijo", "server", capa_sin)
check("...y lo declara: hallazgo_prefijo", "hallazgo_prefijo", origen_sin)
check_true(
    "el veredicto CAMBIA al vaciar el registro (el control discrimina)",
    capa_sin != "api",
)

capa_sin, _ = store.derive_submodule(
    "Reconciliar el drift del contrato (H-API-557)", None, {}
)
check("sin registro, H-API-557 cae a api (su prefijo)", "api", capa_sin)

print("\n== 3. la description tambien cuenta, no solo el subject ==")

capa, origen = store.derive_submodule(
    "Cerrar el pendiente que quedo abierto",           # subject sin marca
    "Sucesor de H-DOCS-393; la capa vive en el cuerpo",  # description con marca
    {},
)
check("una marca solo en la description SI se lee", "docs", capa)
check("...con la misma procedencia de prefijo", "hallazgo_prefijo", origen)

print("\n== 4. senal de ruta: solo cuando es inequivoca ==")

capa, origen = store.derive_submodule(
    "Portar src/addons/stock/models/stock_picking_type.py", None, {}
)
check("un token de src/addons resuelve a api", "api", capa)
check("...y declara que fue por ruta, no por hallazgo", "ruta", origen)

# El derivador es CONSERVADOR a proposito, y esto lo fija: el nombre de un
# modelo no es un token de ruta. «Portar stock_picking_type» describe trabajo
# de api sin nombrar ninguna ruta, y devuelve None en vez de adivinar. Es la
# ceguera declarada de la metrica — la misma que el hallazgo publica.
capa, _ = store.derive_submodule("Portar stock_picking_type de la referencia", None, {})
check("el nombre de un modelo NO basta como senal (cota inferior)", None, capa)

capa, origen = store.derive_submodule(
    "Sincronizar source/gestion con src/addons tras el porte", None, {}
)
check("dos capas nombradas a la vez NO deciden", None, capa)
check("...y no fabrican procedencia", None, origen)

capa, origen = store.derive_submodule("Revisar el pendiente de ayer", None, {})
check("un texto sin ninguna senal devuelve None", None, capa)

print("\n== 5. el valor y su procedencia viajan juntos ==")

# Las cuatro procedencias posibles, cada una con su caso. Nunca se emite un
# valor sin decir como se supo: es lo que permite triar despues «lo lei del
# registro» aparte de «lo adivine por un token de ruta».
casos = [
    ("hallazgo_store", "Cerrar H-SERVER-16", DESACUERDOS_MEDIDOS),
    ("hallazgo_prefijo", "Cerrar H-UI-07", {}),
    ("ruta", "Tocar src/addons/sale", {}),
    (None, "Sin senal alguna", {}),
]
for esperado, texto, mapa in casos:
    _, origen = store.derive_submodule(texto, None, mapa)
    check(f"procedencia de «{texto}»", esperado, origen)

print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
sys.exit(1 if FAIL else 0)
