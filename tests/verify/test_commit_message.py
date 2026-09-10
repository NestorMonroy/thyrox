#!/usr/bin/env python3
"""Control de `src/verify/commit_message.py` — el ancho de línea, medido.

Por qué existe este mecanismo
-----------------------------
La regla Tim Pope fija el cuerpo del commit a 72, y hasta hoy **ningún** hook
de los seis repos lo medía: los cinco `commit-msg` de los consumidores validan
el subject y nada más, y el proveedor no tenía hook. El ancho del cuerpo se
comprobaba a mano con `awk`, y el `awk` de esta máquina es **mawk**, que no es
UTF-8 aware: `length()` cuenta bytes. Una línea de prosa española con dos
em-dashes se reporta como cuatro caracteres más larga de lo que es.

Qué haría fallar a este control
-------------------------------
Que `overlong_lines` vuelva a contar bytes. El caso `acentos` cae; el caso
`ascii` NO cae — ése es el par que discrimina, porque en ASCII las tres
medidas coinciden y un instrumento roto pasa igual.
"""
import importlib.util
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
THYROX = HERE.parent.parent
spec = importlib.util.spec_from_file_location(
    "commit_message", THYROX / "src" / "verify" / "commit_message.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

ok = failures = 0


def assert_equal(name: str, expected, obtained) -> None:
    global ok, failures
    if expected == obtained:
        print(f"  ok    {name}")
        ok += 1
    else:
        print(f"  FALLO {name}\n        esperado={expected!r} obtenido={obtained!r}")
        failures += 1


print("== las tres medidas son tres, y se distinguen ==")

# «—» es U+2014: 3 bytes, 1 code point, 1 columna.
raya = "a—b"
assert_equal("bytes cuenta octetos", 5, mod.byte_length(raya))
assert_equal("caracteres cuenta code points", 3, mod.character_count(raya))
assert_equal("columnas cuenta ancho en terminal", 3, mod.display_width(raya))

# «日» es U+65E5: 3 bytes, 1 code point, 2 columnas. Es el único caso donde
# caracteres y columnas divergen — el que justifica que sean dos funciones.
assert_equal("un ideograma ocupa dos columnas", 2, mod.display_width("日"))
assert_equal("...y un solo code point", 1, mod.character_count("日"))

print()
print("== overlong_lines mide columnas, no bytes ==")

# 71 caracteres de los cuales 4 son em-dash: 71 columnas, 83 bytes. Bajo un
# instrumento que cuente bytes se reporta como violación; no lo es.
frontera = "x" * 67 + "————"
assert_equal("71 columnas con em-dashes NO es violacion", [],
             mod.overlong_lines(frontera, limit=72))
assert_equal("...y en bytes habria dado 79", 79, mod.byte_length(frontera))

# El control positivo: 73 columnas de ASCII puro sí es violación, y el
# instrumento roto también lo veria — por eso este caso solo no basta.
assert_equal("73 columnas de ascii SI es violacion",
             [(1, 73)], [(n, w) for n, w, _ in mod.overlong_lines("y" * 73, limit=72)])

print()
print("== check_commit_message aplica el limite a las dos partes ==")

sano = "Asunto corto\n\nCuerpo dentro del limite, con em-dash — y acentuación.\n"
assert_equal("un mensaje sano no reporta nada", [], mod.check_commit_message(sano))

largo = "Asunto corto\n\n" + "z" * 90 + "\n"
problemas = mod.check_commit_message(largo)
assert_equal("una linea de cuerpo larga se reporta", 1, len(problemas))
assert_equal("...y se nombra su numero de linea real", 3, problemas[0][0])

subject_largo = "S" * 80 + "\n\ncuerpo\n"
assert_equal("el subject tiene su propio limite", 1,
             len(mod.check_commit_message(subject_largo)))

print()
print(f"== {ok} ok · {failures} fallas ==")
sys.exit(1 if failures else 0)
