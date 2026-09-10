#!/usr/bin/env python3
"""parallel.py — el `parallel()` del cliente, con SU semántica, en Python.

Por qué existe
--------------
Directiva del ejecutor 2026-08-28: *«realizar la implementación de parallel()
como lo hacen los binarios de Claude Code»*. Nuestros guiones reparten trabajo
a mano —cada uno con su criterio— mientras el canal `Workflow` ya tiene una
semántica declarada y medida. Adoptarla evita inventar una segunda.

La semántica, leída del ejecutable (evento `parallel-como-el-binario-*`)
-----------------------------------------------------------------------
Cinco reglas, cada una con su cadena de origen:

1. **Cap por ejecución** — `Math.min(16,Math.max(2,r-2))` sobre el número de
   CPUs. **Tiene piso 2**: con 3 CPUs o menos el cap sigue siendo 2.

2. **Es una COLA, no un fan-out** — *«excess calls queue and run as slots free
   up»*. Con cap C y N ítems, C corren a la vez y el siguiente arranca cuando
   uno termina. El reloj de pared es ≈ Σtᵢ/C, no max(tᵢ).

3. **Todos los ítems completan** — *«You can still pass 100 items to
   parallel()/pipeline() and they all complete; only ~10 run at any moment»*.
   El cap limita la concurrencia, no el trabajo.

4. **Exceder el cap de ítems es error EXPLÍCITO** — *«passing more is an
   explicit error, not a silent truncation»*. Se rehúsa antes de empezar.

5. **Cota de vida** — *«Total agent count across a workflow's lifetime is
   capped at 1000 — a runaway-loop backstop»*. Esa cifra sí está en claro.

Lo que NO se copia, y por qué
-----------------------------
El cap de ítems por llamada el cliente lo **interpola** (`at most ${Uy}
items`), así que no es legible desde las cadenas. Aquí es un parámetro con
default declarado como **cota nuestra**, no como el cap del cliente.

La ironía que lo origina
------------------------
La prosa del propio ejecutable dice `min(16, available CPUs - 2)` —**sin el
piso**— mientras su código dice `Math.min(16,Math.max(2,r-2))`. Nuestras dos
reglas de api copiaron la prosa, no el código. Por eso esta implementación
deriva el cap del **literal**, y `report_client_caps.py` lo publica.
"""
from __future__ import annotations

import concurrent.futures
import os
from typing import Callable, Iterable, Sequence, TypeVar

T = TypeVar("T")
R = TypeVar("R")

#: Cota de vida por ejecución. El ejecutable la declara en claro: «Total agent
#: count across a workflow's lifetime is capped at 1000».
LIFETIME_CAP = 1000

#: Cota NUESTRA de ítems por llamada — el cliente interpola la suya.
DEFAULT_ITEM_CAP = 50


class ParallelError(RuntimeError):
    """Rechazo explícito, nunca truncamiento silencioso (regla 4)."""


def width_cap(cpus: int | None = None) -> int:
    """El cap de anchura, con la fórmula del ejecutable — piso 2, techo 16.

    El piso es lo que una paráfrasis pierde: con `cpus` <= 3 la forma sin
    `max(2, ...)` predice 1 (o 0) donde el real es 2.
    """
    if cpus is None:
        cpus = os.cpu_count() or 1
    return min(16, max(2, cpus - 2))


def parallel(
    items: Sequence[T],
    fn: Callable[[T], R],
    *,
    cap: int | None = None,
    item_cap: int = DEFAULT_ITEM_CAP,
) -> list[R]:
    """Aplica `fn` a cada ítem con la semántica del cliente.

    Devuelve los resultados **en el orden de `items`**, no en orden de
    terminación: el llamador correlaciona por índice sin llevar contabilidad.

    Levanta `ParallelError` si `items` excede `item_cap` (regla 4) — antes de
    empezar, no a mitad.
    """
    items = list(items)
    if len(items) > item_cap:
        raise ParallelError(
            f"parallel() recibió {len(items)} ítems y la cota por llamada es "
            f"{item_cap}. Es un error explícito, no un truncamiento silencioso: "
            f"parte la llamada en tandas de <= {item_cap}.")
    if not items:
        return []

    ancho = cap if cap is not None else width_cap()
    ancho = max(1, min(ancho, len(items)))

    # ThreadPoolExecutor.map YA es la cola de la regla 2: con `max_workers`
    # servidores, el siguiente ítem arranca cuando uno libera su ranura. Y
    # conserva el orden de entrada, que es la regla de correlación de arriba.
    with concurrent.futures.ThreadPoolExecutor(max_workers=ancho) as pool:
        return list(pool.map(fn, items))


def pipeline(
    items: Sequence[T],
    etapa1: Callable[[T], R],
    etapa2: Callable[[R], object],
    *,
    cap: int | None = None,
    item_cap: int = DEFAULT_ITEM_CAP,
) -> list[object]:
    """Dos etapas encadenadas por ítem, sin barrera entre ellas.

    El ejecutable lo dice así: *«Separate stages ≠ synchronized stages»* — el
    ítem que termina su etapa 1 entra a la 2 sin esperar a los demás. Una
    barrera entre etapas serializaría lo que no hace falta serializar.
    """
    return parallel(items, lambda x: etapa2(etapa1(x)),
                    cap=cap, item_cap=item_cap)


if __name__ == "__main__":
    print(f"parallel: cap de anchura {width_cap()} "
          f"(alcance medido: nproc={os.cpu_count()}; "
          f"cota de vida {LIFETIME_CAP}; cota de ítems {DEFAULT_ITEM_CAP})")
