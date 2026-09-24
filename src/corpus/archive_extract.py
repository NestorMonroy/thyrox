#!/usr/bin/env python3
"""Abre un archivo comprimido, con el extractor mas ligero que haya.

Existe porque el arbol recibe material en `.7z` —un lote de noticias, un
corpus de referencia— y **no habia con que abrirlo**. Medido antes de
escribir una linea, que es lo que lo vuelve una carencia y no una suposicion::

    for c in 7z 7za 7zr p7zip bsdtar; do command -v "$c"; done   -> los cinco AUSENTES
    python3 -c 'import py7zr'                                    -> ModuleNotFoundError

Por que el binario y no la biblioteca
=====================================

La misma pregunta que ya decidio ``pdf_to_text``, medida de nuevo porque la
respuesta anterior no se hereda:

=====================  ==================  ===========================
Eje                    ``apt 7zip``        ``pip py7zr``
=====================  ==================  ===========================
paquetes               **2**               10
descarga               **1 846 156 B**     4 798 442 B  (2.6x)
instalado              6 158 KB            los 10 wheels, descomprimidos
arrastra               nada nuevo          pycryptodomex, brotli, psutil...
=====================  ==================  ===========================

*Metrica:* ``Size``/``Installed-Size`` de ``apt-cache show`` contra la suma
de los ``size`` que PyPI declara para la rueda x86-64 de cada dependencia que
``uv pip install --dry-run py7zr`` resuelve.
*Ciega a:* la velocidad de cada uno, que no se midio; y al caso de un ``.7z``
cifrado, donde la biblioteca da una superficie mas comoda.

**zip y tar no necesitan nada.** Los cubre la biblioteca estandar, asi que el
unico eje que exige binario externo es 7z. Confundir «no puedo abrir este
7z» con «no puedo abrir nada» seria declarar una carencia mas ancha que la
real.

El formato se lee de los BYTES, nunca del nombre
================================================

Un sufijo es lo unico que cualquiera puede escribir sin tocar un byte, y el
archivo que origina este modulo llega con nombre generado por el cliente
(``62a5cdf5-Noticias_-_7f7a.7z``). Leer el formato del nombre es medir el
significante para concluir sobre el significado.

Lo que NO hace, declarado
=========================

- **No descifra.** Un archivo con contrasena falla con el error del extractor;
  no se pide contrasena por la entrada estandar.
- **No lee lo que hay DENTRO.** Sacar un PDF de un ``.7z`` no es poder leerlo:
  eso es el eje de ``pdf_to_text`` y de ``thyrox_toolchain_require_pdf_text``,
  y no se deduce de este.
- **No conserva el enlace simbolico** de un miembro: se extrae como archivo o
  se rehusa. Un enlace dentro de un archivo comprimido es la otra via de
  escape del destino, y aqui no hay caso que la exija.

Uso
---

    bash bin/archive_extract ARCHIVO --list
    bash bin/archive_extract ARCHIVO --dest DIRECTORIO
"""
from __future__ import annotations

import argparse
import os
import pathlib
import shutil
import subprocess
import sys
import tarfile
import zipfile

#: Los binarios de 7-Zip, en el orden en que se prueban. `7zz` es el nombre
#: del ejecutable oficial de Igor Pavlov; `7z`/`7za` los de la distribucion.
SEVENZ_BINS = ("7z", "7zz", "7za")

#: El marcador que la sonda busca en la SALIDA. No se lee el codigo de salida:
#: un guion que haga `exit 0` sale 0 ante cualquier argumento, y ese fue el
#: defecto real de la sonda de PDF de este mismo arbol.
SEVENZ_MARKER = "7-Zip"

#: Firma -> formato. El desplazamiento importa: el de `tar` no esta al inicio.
MAGIC = (
    (0, b"7z\xbc\xaf\x27\x1c", "7z"),
    (0, b"PK\x03\x04", "zip"),
    (0, b"PK\x05\x06", "zip"),          # zip vacio
    (0, b"PK\x07\x08", "zip"),          # zip fragmentado
    (257, b"ustar", "tar"),
)

#: Cuantos bytes hay que leer para decidir. Sale del desplazamiento mayor mas
#: su firma, no de un numero redondo elegido a ojo.
MAGIC_READ = 257 + 8


class ExtractorMissing(RuntimeError):
    """No hay con que abrir ESTE formato. No es «el archivo venia vacio»."""


class UnknownFormat(ValueError):
    """Los bytes no corresponden a ningun formato conocido."""


class UnsafeMember(ValueError):
    """Un miembro escribiria fuera del destino."""


def kind(source) -> str | None:
    """El formato, leido de los bytes. ``None`` si no es ninguno conocido."""
    source = pathlib.Path(source)
    with source.open("rb") as fh:
        head = fh.read(MAGIC_READ)
    for offset, signature, name_text in MAGIC:
        if head[offset:offset + len(signature)] == signature:
            return name_text
    return None


def sevenz_bin() -> str | None:
    """El binario de 7-Zip que responde, medido por CONDUCTA.

    Se compara la SALIDA contra ``SEVENZ_MARKER``, no el codigo de salida.
    La diferencia no es teorica: la sonda hermana de PDF declaraba presente un
    extractor inexistente porque `true` sale 0 ante cualquier argumento.
    """
    for name_text in SEVENZ_BINS:
        path = shutil.which(name_text)
        if path is None:
            continue
        try:
            output = subprocess.run([path, "i"], capture_output=True,
                                    text=True, timeout=20)
        except (OSError, subprocess.SubprocessError):
            continue
        if SEVENZ_MARKER in (output.stdout or "") + (output.stderr or ""):
            return path
    return None


def is_confined(dest, member: str) -> bool:
    """¿El miembro aterriza DENTRO del destino?

    Se compara por COMPONENTES de ruta resuelta, no por prefijo de cadena:
    ``/dest`` y ``/dest-ajeno`` comparten prefijo de texto y no de arbol, y un
    ``startswith`` los confunde. Tampoco basta mirar si empieza por ``..`` —
    el ascenso puede ir enterrado (``notas/../../fuera``).
    """
    if os.path.isabs(member) or member.startswith("\\"):
        return False
    root = pathlib.Path(dest).resolve()
    target = pathlib.Path(os.path.normpath(str(root / member)))
    return root == target or root in target.parents


def _sevenz_members(binary: str, source: pathlib.Path) -> list[str]:
    """Los miembros que ``7z l -slt`` declara, sin los directorios.

    Se usa ``-slt`` y no la tabla de columnas porque un nombre con espacios
    parte la tabla y no el par ``clave = valor``.
    """
    output = subprocess.run([binary, "l", "-slt", "-ba", str(source)],
                            capture_output=True, text=True)
    if output.returncode != 0:
        raise RuntimeError(output.stderr.strip() or "7z l fallo")
    names: list[str] = []
    path: str | None = None
    for line in output.stdout.splitlines():
        if line.startswith("Path = "):
            path = line[len("Path = "):]
        elif line.startswith("Attributes = ") and path is not None:
            if "D" not in line[len("Attributes = "):].split("_")[0]:
                names.append(path)
            path = None
    return names


def members(source) -> list[str]:
    """Los miembros del archivo, SIN extraer nada."""
    source = pathlib.Path(source)
    format = kind(source)
    if format is None:
        raise UnknownFormat("formato no reconocido: %s" % source)
    if format == "zip":
        with zipfile.ZipFile(source) as z:
            return [i.filename for i in z.infolist() if not i.is_dir()]
    if format == "tar":
        with tarfile.open(source) as t:
            return [m.name for m in t.getmembers() if m.isfile()]
    binary = sevenz_bin()
    if binary is None:
        raise ExtractorMissing(
            "no hay extractor de 7z. Remedio: apt-get install -y p7zip-full")
    return _sevenz_members(binary, source)


def extract(source, dest, *, only: list[str] | None = None) -> list[pathlib.Path]:
    """Extrae a ``dest`` y devuelve los archivos que aterrizaron.

    **La comprobacion va ANTES de escribir el primer byte.** Validar mientras
    se extrae deja a medias un destino que ya recibio los miembros sanos que
    precedian al malicioso, y entonces el rechazo no es un rechazo.
    """
    source = pathlib.Path(source)
    dest = pathlib.Path(dest)
    names = members(source)
    if only is not None:
        names = [n for n in names if n in set(only)]

    dest.mkdir(parents=True, exist_ok=True)
    for name_text in names:
        if not is_confined(dest, name_text):
            raise UnsafeMember(
                "el miembro %r escribiria fuera de %s" % (name_text, dest))

    format = kind(source)
    if format == "zip":
        with zipfile.ZipFile(source) as z:
            for name_text in names:
                output = dest / name_text
                output.parent.mkdir(parents=True, exist_ok=True)
                with z.open(name_text) as src, output.open("wb") as dst:
                    shutil.copyfileobj(src, dst)
    elif format == "tar":
        with tarfile.open(source) as t:
            for name_text in names:
                output = dest / name_text
                output.parent.mkdir(parents=True, exist_ok=True)
                src = t.extractfile(name_text)
                if src is None:
                    continue
                with src, output.open("wb") as dst:
                    shutil.copyfileobj(src, dst)
    else:
        binary = sevenz_bin()
        order = [binary, "x", "-y", "-o%s" % dest, str(source)]
        if only is not None:
            order.extend(names)
        output = subprocess.run(order, capture_output=True, text=True)
        if output.returncode != 0:
            raise RuntimeError(output.stderr.strip() or "7z x fallo")

    return [dest / n for n in names if (dest / n).is_file()]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("entrada", help="el archivo comprimido")
    parser.add_argument("--list", action="store_true",
                        help="lista los miembros y no extrae nada")
    parser.add_argument("--dest", help="el directorio de destino")
    args = parser.parse_args(argv)

    source = pathlib.Path(args.entrada)
    if not source.is_file():
        print("archive_extract: no existe o no es un archivo: %s" % source,
              file=sys.stderr)
        print("                 NO se emite conteo.", file=sys.stderr)
        return 2

    try:
        names = members(source)
    except UnknownFormat:
        print("archive_extract: formato no reconocido por sus bytes: %s" % source,
              file=sys.stderr)
        print("                 El sufijo del nombre NO decide.", file=sys.stderr)
        return 2
    except ExtractorMissing as err:
        print("archive_extract: %s" % err, file=sys.stderr)
        print("                 NO se emite conteo: un 0 aqui se leeria como"
              " «el archivo venia vacio».", file=sys.stderr)
        return 2

    if args.list or not args.dest:
        for name_text in names:
            print(name_text)
        print("miembros: %d" % len(names), file=sys.stderr)
        return 0

    try:
        extracted = extract(source, args.dest)
    except UnsafeMember as err:
        print("archive_extract: %s" % err, file=sys.stderr)
        print("                 No se extrajo NADA.", file=sys.stderr)
        return 3
    print("extraidos: %d de %d en %s" % (len(extracted), len(names), args.dest))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
