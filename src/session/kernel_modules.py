#!/usr/bin/env python3
"""¿El kernel que corre admite modulos cargables? Se mide por CONDUCTA.

El defecto que este modulo cierra
----------------------------------
El analisis de Vagrant concluyo dos veces sobre la capacidad de cargar un
modulo sin medirla:

1. Atribuyo a ``virtualbox`` la falta de ``/dev/kvm``, que es el requisito de
   QEMU y libvirt. VirtualBox carga su propio modulo, ``vboxdrv``.
2. Midio la ausencia de ``/lib/modules`` y de ``modprobe``. El ejecutor lo
   señalo: *«que no lo tengas no significa que no lo puedas instalar»*.
   Correcto — los dos son archivos, y este arbol instala paquetes a diario.

Las dos veces se midio la FORMA —que hay o no hay en el disco— y se concluyo
sobre el FONDO —si la operacion se puede hacer—. Es el sub-patron C de
``metrica-decide-la-conclusion.md``, cometido dentro del documento escrito
para corregir otro sub-patron C.

Lo que decide es el errno
--------------------------
``init_module`` es una llamada al sistema. Un kernel compilado **sin**
``CONFIG_MODULES`` no la implementa y el nucleo responde ``ENOSYS``. Uno que
si los admite responde otra cosa segun el permiso y el contenido: ``EPERM``
sin ``CAP_SYS_MODULE``, ``EFAULT`` con puntero invalido, ``ENOEXEC`` con una
imagen que no es un modulo. **Sólo ``ENOSYS`` significa ausencia.**

Ningun paquete cambia eso: la llamada la implementa el kernel del anfitrion,
que compartimos.

Por que la sonda no puede cargar nada
--------------------------------------
Llama con **puntero nulo y longitud cero**. No hay imagen que el kernel pueda
aceptar, asi que la sonda no puede tener exito ni por accidente. Mide si la
puerta existe; no la cruza. ``PROBE_ARGUMENTS`` lo declara para que un
control pueda fijarlo.

*Ciego a:* un kernel que implemente la llamada y la tenga desactivada en
caliente (``modules_disabled``), que responderia ``EPERM`` y aqui se lee como
«presente» — lo es: la interfaz esta, y el veto es de politica, no de
compilacion. Y ciego a un ``seccomp`` que filtre la llamada antes de que
llegue al nucleo, caso en que el errno lo pone el filtro y no el kernel.
"""
from __future__ import annotations

import ctypes
import errno
import os
import pathlib
import platform

#: El numero de ``init_module`` **por arquitectura**. No es universal: en
#: x86_64 es la 175 y en aarch64 la 105. Fijar una constante haria que la
#: sonda midiera OTRA llamada en la maquina equivocada, y su ``ENOSYS`` no
#: diria nada del soporte de modulos.
INIT_MODULE_NUMBERS: dict[str, int] = {
    "x86_64": 175,
    "aarch64": 105,
}

#: Los argumentos de la sonda, declarados para que un control los fije:
#: imagen nula, longitud cero, parametros vacios. Sin imagen no hay carga
#: posible.
PROBE_ARGUMENTS: tuple = (None, 0, b"")

#: Los errno que significan «la interfaz existe». Cada uno por una razon
#: distinta, y ninguna es la ausencia.
PRESENT_ERRNOS: frozenset[int] = frozenset({
    errno.EPERM,    # existe; falta CAP_SYS_MODULE o esta vetada en caliente
    errno.EFAULT,   # existe; el puntero es invalido, que es lo que pasamos
    errno.ENOEXEC,  # existe; la imagen no es un modulo
    errno.EINVAL,   # existe; los argumentos no valen
    errno.EBUSY,    # existe; hay otra carga en curso
})

#: Las rutas que el kernel crea cuando admite modulos cargables. Son
#: INDICIOS, no el veredicto: se reportan aparte para que nadie vuelva a
#: derivar la conclusion de un `ls`.
HINT_PATHS: tuple[str, ...] = (
    "/proc/modules",
    "/proc/sys/kernel/modules_disabled",
    "/proc/sys/kernel/modprobe",
)


def init_module_number(machine: str | None = None) -> int | None:
    """El numero de la llamada para esta arquitectura, o ``None``.

    Rehusa en vez de adivinar: sondear un numero que en esta maquina es otra
    llamada produce un errno que no responde a la pregunta.
    """
    return INIT_MODULE_NUMBERS.get(machine or platform.machine())


def classify(code: int) -> str:
    """El veredicto que corresponde a un errno: absent, present o unknown.

    ``ENOSYS`` es la **unica** ausencia. Colapsar los demas en ella —la
    lectura natural de «fallo»— publicaria «sin modulos» sobre un kernel que
    si los tiene y solo nos negaba el permiso.
    """
    if code == errno.ENOSYS:
        return "absent"
    if code in PRESENT_ERRNOS:
        return "present"
    return "unknown"


def _hints() -> dict[str, bool]:
    """Las rutas indicio, cada una con su existencia. No deciden nada."""
    return {path: pathlib.Path(path).exists() for path in HINT_PATHS}


def probe(machine: str | None = None) -> dict:
    """Llama a ``init_module`` con argumentos vacios y clasifica su errno.

    Devuelve ``{verdict, errno, errno_name, syscall, machine, hints}``. El
    veredicto sale del **errno**; los ``hints`` viajan aparte y no lo tocan.
    """
    number = init_module_number(machine)
    hints = _hints()
    if number is None:
        return {"verdict": "unknown", "errno": None, "errno_name": None,
                "syscall": None, "machine": machine or platform.machine(),
                "hints": hints,
                "reason": "arquitectura sin numero de llamada declarado; "
                          "NO se sondea un numero ajeno."}

    libc = ctypes.CDLL(None, use_errno=True)
    image, length, parameters = PROBE_ARGUMENTS
    ctypes.set_errno(0)
    libc.syscall(ctypes.c_long(number), ctypes.c_void_p(image),
                 ctypes.c_ulong(length), ctypes.c_char_p(parameters))
    code = ctypes.get_errno()
    return {"verdict": classify(code), "errno": code,
            "errno_name": errno.errorcode.get(code, str(code)),
            "syscall": number, "machine": machine or platform.machine(),
            "hints": hints}


def main(argv=None) -> int:
    import argparse  # noqa: PLC0415
    import json      # noqa: PLC0415

    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    report = probe()
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0

    print(f"llamada init_module: {report['syscall']} ({report['machine']})")
    print(f"errno: {report['errno_name']} ({report['errno']})")
    print("veredicto: " + {
        "absent": "el kernel NO admite modulos cargables",
        "present": "el kernel SI admite modulos cargables",
        "unknown": "NO se puede decidir con este errno",
    }[report["verdict"]])
    print("\nindicios (NO deciden — se reportan aparte):")
    for path, exists in report["hints"].items():
        print(f"  {'exists ' if exists else 'ausente'}  {path}")
    print(f"\ncapacidad del proceso: "
          f"uid={os.getuid()} — el permiso se lee del errno, no de aqui.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
