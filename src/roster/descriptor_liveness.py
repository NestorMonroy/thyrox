"""Diagnosticar si una entrada del roster sigue viva — sin PID y sin ledger.

Adaptación de ``Ft(n)`` del cliente Claude Code (build 2.1.266,
``thyrox: _references/claude-code-bin/2.1.266/claude_strings.txt``), el tercer
módulo de vivacidad de este paquete. Leer antes a sus dos hermanos:
``job_liveness`` fija el vocabulario (veredicto por causa, procedencia
adjunta, cuarentena distinta de un vacío legítimo) y ``process_liveness``
porta la vía del PID.

Por qué hacen falta TRES, y no dos
-----------------------------------

Los dos hermanos cubren dos mitades del universo y dejan una tercera fuera:

===================== ============================== =========================
Módulo                Qué sabe de antemano           Qué mide
===================== ============================== =========================
``job_liveness``      nada                           el CONTENIDO de la entrada
``process_liveness``  un PID anotado en el ledger    ese PID
``descriptor_liveness`` nada                         quién la tiene ABIERTA
===================== ============================== =========================

La tercera fila existe porque las otras dos no alcanzan a una tarea de
``Bash(run_in_background)`` del harness: no pasa por el ledger —así que no hay
PID que sondear— y su ``.output`` **ya tiene contenido** mientras el proceso
sigue escribiendo. Todo instrumento que mire contenido la lee como cerrada.

Medido en :ref:`h-docs-1258`: dos trabajos vivos que el ejecutor tuvo que
señalar. Uno llevaba 1 h 05 min bloqueado leyendo stdin con su ``SyntaxError``
ya escrito en el ``.output``; el otro, huérfano en ``ppid 1``, al 100 % de un
núcleo durante 20 min con ``[exited with code 144]`` en el suyo. El marcador
terminal lo escribe el **harness** al abandonar la tarea, o un informe de
caída — no el proceso al terminar. Confundir las dos cosas es el sub-patrón C
de ``metrica-decide-la-conclusion.md``: se mide el marcador (el significante)
y se concluye sobre la vida del trabajo (el significado).

El flujo de la fuente, leído antes de la primera línea
-------------------------------------------------------

.. code-block:: js

    async function Ft(n){
      let e=`socket:[${n}]`,o;
      try{o=await Le("/proc")}catch{return}
      let r=o.filter((c)=>/^\\d+$/.test(c)),
          s=await Promise.all(r.map((c)=>Le(`/proc/${c}/fd`).catch(()=>[]))),
          p=[];
      for(let c=0;c<r.length;c++)for(let m of s[c])p.push({pid:r[c],fd:m});
      let u=(await Promise.all(p.map((c)=>Dt(`/proc/${c.pid}/fd/${c.fd}`)
            .catch(()=>"")))).indexOf(e);
      return u===-1?void 0:p[u].pid}

Seis pasos, y los tres ``catch`` son la mitad del diseño:

1. listar ``/proc``; si no se puede, salir — la plataforma no tiene procfs;
2. quedarse con las entradas numéricas (``/^\\d+$/``) — son los PID;
3. listar el ``fd/`` de cada una, y **un fallo aporta lista vacía**, no un
   error: un proceso que muere entre los dos ``readdir`` es una carrera
   normal, no una avería;
4. aplanar a pares ``{pid, fd}``;
5. resolver cada enlace, y **un fallo aporta cadena vacía** — que nunca casa;
6. comparar con el objetivo.

Las tres divergencias, declaradas
----------------------------------

1. **El objetivo es una ruta, no un ``socket:[inodo]``.** La fuente compara
   contra una identidad ya codificada en la cadena; aquí se resuelve la ruta
   con ``realpath`` antes de comparar, porque las entradas del roster **son
   symlinks** (``thyrox: src/roster/orphan_task.py``, tarea #285) y
   ``readlink`` de un descriptor devuelve siempre la ruta resuelta.

2. **Se devuelven TODOS los tenedores, no el primero.** La fuente usa
   ``indexOf`` porque un socket tiene un dueño; un ``.output`` admite al
   escritor y a un ``tail`` a la vez, y el orden numérico de PID no pone al
   escritor primero. Quedarse con el primero perdería justo al que importa.

3. **``unavailable`` es un veredicto propio.** La fuente colapsa los dos
   desenlaces en ``undefined``: el ``catch`` de ``/proc`` y el ``indexOf``
   que no halla nada devuelven lo mismo. Aquí NO se colapsan, por la misma
   razón por la que ``process_liveness`` añade su quinto valor ``stopped``:
   lo exige el consumidor. Un cero que no distingue «nadie lo sostiene» de
   «no pude mirar» es el sub-patrón D de ``metrica-decide-la-conclusion.md``,
   y es el defecto que este módulo existe para cerrar.

Qué se inyecta (DEC-04)
------------------------

- ``list_dir``/``read_link`` — cómo se lista un directorio y cómo se resuelve
  un enlace. Los valores por defecto leen el procfs de este sistema; un
  consumidor que sondee otro host o simule un roster inyecta los suyos, igual
  que ``job_liveness`` inyecta ``read_shape``.
- ``procfs`` — la raíz, por si no es ``/proc``.
"""
from __future__ import annotations

import os
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

#: La raíz del procfs. Es un parámetro, no un literal esparcido por el cuerpo.
PROCFS = "/proc"

#: Sufijo que el núcleo añade al destino de un descriptor cuyo archivo ya se
#: desenlazó. El propio binario lo reconoce (``I.endsWith(" (deleted)")``) y
#: rechaza esa ruta como inválida; aquí no se rechaza el tenedor — se marca
#: (ver ``Holder.deleted``).
DELETED_SUFFIX = " (deleted)"

#: El veredicto — tres valores nombrados por su causa, nunca un booleano:
#:
#: - ``held``        — algún proceso mantiene la entrada abierta. Está viva.
#: - ``unheld``      — el procfs se pudo recorrer y nadie la sostiene.
#: - ``unavailable`` — no se pudo recorrer el procfs. NO es ``unheld``: no hay
#:   dato, y decir que no hay tenedores sería afirmar lo que no se midió.
VERDICTS = ("held", "unheld", "unavailable")


@dataclass(frozen=True)
class Holder:
    """Un descriptor abierto que apunta a la entrada.

    ``deleted`` viaja con el tenedor en vez de decidirse aquí: un proceso que
    sostiene el inodo de un archivo ya desenlazado **sigue vivo y sigue
    escribiendo**, pero no necesariamente sobre el archivo que hoy ocupa esa
    ruta. Las dos lecturas son legítimas según para qué se pregunte, así que
    el módulo informa y quien llama decide.
    """

    pid: int
    fd: str
    deleted: bool


@dataclass(frozen=True)
class Diagnosis:
    """El veredicto de UNA entrada, con los tenedores que lo sostienen.

    ``holders`` está vacío en ``unheld`` y en ``unavailable`` — y por eso el
    veredicto no se deriva de su longitud: los dos casos publican cero y sólo
    uno significa que nadie la sostiene.
    """

    verdict: str
    holders: tuple[Holder, ...]


def _list_dir(path: str) -> list[str]:
    """El ``Le`` de la fuente: listar un directorio del procfs real."""
    return os.listdir(path)


def _read_link(path: str) -> str:
    """El ``Dt`` de la fuente: resolver un descriptor del procfs real."""
    return os.readlink(path)


def diagnose(entry: str | Path,
             *,
             list_dir: Callable[[str], list[str]] = _list_dir,
             read_link: Callable[[str], str] = _read_link,
             procfs: str = PROCFS) -> Diagnosis:
    """¿Algún proceso mantiene ``entry`` abierta?

    Reproduce los seis pasos de ``Ft`` con sus tres ``catch``, y se detiene en
    ``unavailable`` cuando el primero falla — la fuente hace lo mismo
    (``catch{return}``), sólo que sin nombrar el desenlace.
    """
    target = os.path.realpath(str(entry))
    try:
        names = list_dir(procfs)
    except OSError:
        return Diagnosis(verdict="unavailable", holders=())

    holders: list[Holder] = []
    for name in names:
        if not name.isdigit():
            continue
        fd_dir = f"{procfs}/{name}/fd"
        try:
            descriptors = list_dir(fd_dir)
        except OSError:
            # Carrera normal, no avería: el proceso murió entre los dos
            # listados, o su fd/ no es legible. Aporta cero y el barrido sigue.
            continue
        for fd in descriptors:
            try:
                resolved = read_link(f"{fd_dir}/{fd}")
            except OSError:
                continue
            deleted = resolved.endswith(DELETED_SUFFIX)
            if deleted:
                resolved = resolved[: -len(DELETED_SUFFIX)]
            if resolved == target:
                holders.append(Holder(pid=int(name), fd=fd, deleted=deleted))

    verdict = "held" if holders else "unheld"
    return Diagnosis(verdict=verdict, holders=tuple(holders))


def is_alive(diagnosis: Diagnosis) -> bool:
    """El resumen booleano — análogo a ``S6e`` encima de ``dbt``.

    Sólo ``held`` cuenta como vivo. ``unavailable`` devuelve ``False`` porque
    no hay evidencia de vida, **no** porque haya evidencia de muerte: quien
    necesite distinguirlas lee el veredicto, que para eso tiene nombre propio.
    """
    return diagnosis.verdict == "held"


def sweep(entries: Sequence[str | Path],
          *,
          list_dir: Callable[[str], list[str]] = _list_dir,
          read_link: Callable[[str], str] = _read_link,
          procfs: str = PROCFS) -> Mapping[str, Diagnosis]:
    """Diagnostica varias entradas recorriendo el procfs UNA vez por entrada.

    No hay cuarentena aquí —a diferencia de ``job_liveness.sweep``— porque no
    hay entrada ilegible que separar: un fallo de lectura ya tiene su propio
    veredicto (``unavailable``) o se absorbe como carrera dentro del recorrido.
    """
    return {str(entry): diagnose(entry, list_dir=list_dir,
                                 read_link=read_link, procfs=procfs)
            for entry in entries}
