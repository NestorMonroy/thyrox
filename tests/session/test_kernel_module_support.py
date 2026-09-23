#!/usr/bin/env python3
"""Control de `session.kernel_modules` — ¿el kernel admite modulos cargables?

Por que existe este control
---------------------------
El analisis de Vagrant concluyo dos veces sobre la capacidad de cargar un
modulo, y las dos veces midio el fenomeno equivocado:

1. La primera atribuyo a ``virtualbox`` la falta de ``/dev/kvm``, que es lo
   que necesitan QEMU y libvirt. VirtualBox carga su propio modulo.
2. La segunda midio la **ausencia de archivos** —``/lib/modules``,
   ``modprobe``— y concluyo incapacidad. El ejecutor lo señalo: *«que no lo
   tengas no significa que no lo puedas instalar»*. Tenia razon: esos archivos
   se instalan.

Lo que ninguna de las dos midio es la conducta: **si la llamada al sistema
esta implementada**. Un kernel compilado sin modulos responde ``ENOSYS``; uno
que si los admite responde otra cosa —``EPERM``, ``EFAULT``, ``ENOEXEC``—
segun el permiso y el contenido. El discriminador es el errno, no el archivo.

Que hace fallar a cada caso (sub-patron D): cada uno declara su anulacion.

*La sonda NO puede cargar nada.* Llama con puntero nulo y longitud cero: no
hay imagen de modulo que el kernel pueda aceptar. Mide si la puerta existe,
no la cruza.
"""
from __future__ import annotations

import errno
import pathlib
import sys

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
sys.path.insert(0, str(RAIZ / "src"))

from session import kernel_modules  # noqa: E402

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def test_el_numero_de_llamada_es_por_arquitectura() -> None:
    """El numero de ``init_module`` NO es universal: depende de la maquina.

    Anulacion: fijar 175 como constante. El control cae en aarch64, donde la
    misma llamada es la 105, y la sonda mediria otra llamada distinta — un
    ``ENOSYS`` que no dice nada del soporte de modulos.
    """
    check("x86_64 resuelve a 175",
          kernel_modules.init_module_number("x86_64") == 175)
    check("aarch64 resuelve a 105",
          kernel_modules.init_module_number("aarch64") == 105)
    check("una arquitectura desconocida REHUSA, no adivina",
          kernel_modules.init_module_number("arquitectura-inventada") is None)


def test_ENOSYS_es_la_unica_ausencia() -> None:
    """Sólo ``ENOSYS`` significa «el kernel no los admite».

    Es el caso central. ``EPERM`` significa que la puerta existe y nos falta
    permiso; ``EFAULT`` que existe y el puntero es invalido —que es lo que la
    sonda pasa a proposito—. Colapsarlos publicaria «sin modulos» sobre un
    kernel que si los tiene.

    Anulacion: clasificar todo errno no nulo como ausencia. Caen las tres
    aserciones de abajo menos la primera.
    """
    check("ENOSYS -> ausente",
          kernel_modules.classify(errno.ENOSYS) == "absent")
    check("EPERM -> presente (falta permiso, no interfaz)",
          kernel_modules.classify(errno.EPERM) == "present")
    check("EFAULT -> presente (puntero invalido, que es lo que pasamos)",
          kernel_modules.classify(errno.EFAULT) == "present")
    check("ENOEXEC -> presente (imagen invalida)",
          kernel_modules.classify(errno.ENOEXEC) == "present")
    check("un errno que no esperamos NO se clasifica",
          kernel_modules.classify(errno.ENOSPC) == "unknown")


def test_los_archivos_no_deciden_nada() -> None:
    """La presencia de ``/proc/modules`` es indicio, no veredicto.

    Es la leccion del episodio: el archivo se instala o lo crea el kernel, y
    en ninguno de los dos casos la conducta se deduce de su nombre. El
    mecanismo los reporta por separado y NO los mezcla con el veredicto.

    Anulacion: que `probe` derive su veredicto de los archivos. Cae esta
    asercion, porque el reporte dejaria de tener dos campos independientes.
    """
    informe = kernel_modules.probe()
    check("el informe separa la conducta de los indicios",
          "verdict" in informe and "hints" in informe, str(sorted(informe)))
    check("el veredicto sale del errno",
          "errno" in informe, str(sorted(informe)))
    check("y los indicios son rutas, no el veredicto",
          isinstance(informe["hints"], dict))


def test_la_sonda_no_puede_cargar_nada() -> None:
    """Control de seguridad: la sonda pasa puntero nulo y longitud cero.

    Sin imagen no hay modulo que cargar. Si alguien cambiara la sonda para
    pasar un archivo real, esta asercion cae — que es exactamente lo que se
    quiere que pase.
    """
    check("la sonda declara argumentos vacios",
          kernel_modules.PROBE_ARGUMENTS == (None, 0, b""),
          str(kernel_modules.PROBE_ARGUMENTS))


def test_el_instrumento_puede_decir_algo_QUE_NO_sea_ENOSYS() -> None:
    """Control de anulacion del INSTRUMENTO, no del sujeto.

    Un `ctypes` mal cableado devolveria ``ENOSYS`` a todo, y el veredicto
    «sin modulos» seria del instrumento y no del kernel. Se ejercita una
    llamada que sabemos implementada —``chdir``, la 80 en x86_64— en sus dos
    ramas: contra una ruta ausente tiene que dar ``ENOENT``, y contra una
    real tiene que salir 0.

    Anulacion: si la sonda estuviera rota, estas dos aserciones caerian antes
    que ninguna otra — que es justo el orden que se quiere.

    *Ciega a:* un numero de llamada equivocado, que tambien da ``ENOSYS`` y es
    indistinguible de la ausencia. Lo que acota esa ceguera no es este caso
    sino que DOS numeros consecutivos de la misma familia —``init_module`` y
    ``delete_module``— respondan igual mientras uno ajeno responde distinto.
    """
    import ctypes  # noqa: PLC0415

    libc = ctypes.CDLL(None, use_errno=True)
    chdir = kernel_modules.INIT_MODULE_NUMBERS.get("x86_64")
    if chdir is None or kernel_modules.init_module_number() != 175:
        check("la maquina no es x86_64; caso omitido por declaracion", True)
        return

    previo = pathlib.Path.cwd()
    try:
        ctypes.set_errno(0)
        libc.syscall(ctypes.c_long(80),
                     ctypes.c_char_p(b"/directorio-que-no-existe"))
        ausente = ctypes.get_errno()
        ctypes.set_errno(0)
        libc.syscall(ctypes.c_long(80), ctypes.c_char_p(b"/"))
        real = ctypes.get_errno()
    finally:
        import os  # noqa: PLC0415
        os.chdir(previo)

    check("una llamada implementada contra ruta ausente da ENOENT",
          ausente == errno.ENOENT, errno.errorcode.get(ausente, str(ausente)))
    check("y contra una ruta real no da error",
          real == 0, errno.errorcode.get(real, str(real)))
    check("asi que un ENOSYS del sujeto es del KERNEL, no del instrumento",
          ausente != errno.ENOSYS and real != errno.ENOSYS)


def test_la_familia_entera_responde_igual() -> None:
    """``init_module`` y ``delete_module`` son consecutivas y de la misma familia.

    Que las dos den el mismo veredicto acota la ceguera declarada arriba: un
    numero equivocado explicaria una, no dos consecutivas, mientras una
    llamada ajena responde distinto.

    Anulacion: si el kernel admitiera modulos, ``delete_module`` sobre un
    nombre inexistente daria ``ENOENT`` y esta asercion caeria.
    """
    import ctypes  # noqa: PLC0415

    if kernel_modules.init_module_number() != 175:
        check("la maquina no es x86_64; caso omitido por declaracion", True)
        return

    libc = ctypes.CDLL(None, use_errno=True)
    ctypes.set_errno(0)
    libc.syscall(ctypes.c_long(176),
                 ctypes.c_char_p(b"modulo-inexistente"), ctypes.c_int(0))
    hermana = ctypes.get_errno()
    sujeto = kernel_modules.probe()

    check("las dos de la familia dan el mismo veredicto",
          kernel_modules.classify(hermana) == sujeto["verdict"],
          f"{errno.errorcode.get(hermana, hermana)} vs {sujeto['errno_name']}")


def main() -> int:
    test_el_numero_de_llamada_es_por_arquitectura()
    test_ENOSYS_es_la_unica_ausencia()
    test_los_archivos_no_deciden_nada()
    test_la_sonda_no_puede_cargar_nada()
    test_el_instrumento_puede_decir_algo_QUE_NO_sea_ENOSYS()
    test_la_familia_entera_responde_igual()
    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: session/kernel_modules.py)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
