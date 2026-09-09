"""Cuánto se carga en CADA sesión antes de que nadie escriba una línea.

El piso de instrucciones es lo que el cliente inyecta incondicionalmente: los
``CLAUDE.md`` del árbol y los ``.claude/rules/*.md`` **sin** campo ``paths:``.
La documentación del cliente lo dice del otro lado —*«Rules without a `paths`
field are loaded unconditionally and apply to all files»*— y ``I-009`` de
``thyrox-invariants`` lo recoge.

Por qué se mide, y no se transcribe
------------------------------------

El piso es una **propiedad de un artefacto vivo**: crece con cada regla nueva
y encoge con cada ``paths:`` declarado. Una cifra copiada a prosa fue correcta
el día que se escribió y falsa a la semana, que es lo que
``calibration-verified-numbers`` prohíbe en su corolario. Por eso este módulo
existe: la prosa nombra el comando, y el comando publica el número.

Sus dos consecuencias, que son la razón de medirlo:

1. Cuanto mayor el piso, antes se llena la ventana y **más seguido compacta**
   la sesión. Y una compactación no es compresión sin pérdida: conserva las
   directivas verbatim y **reescribe la evidencia**, así que una cifra medida
   a mitad de sesión puede volver como paráfrasis.
2. **Cada subagente vuelve a pagarlo.** Un subagente hereda toda la jerarquía
   de ``CLAUDE.md`` y las reglas de proyecto, así que el piso multiplica por el
   número de agentes despachados, no por el de sesiones.

El eje que separa el piso de lo condicional
--------------------------------------------

``paths:`` cuenta **sólo en el frontmatter**, no en el cuerpo. Una regla que
explica el campo en su prosa —y las hay— sigue cargando siempre; contarla como
condicional publicaría un piso menor que el real, que es el sentido más caro
del error.

*Métrica:* bytes de los ``.claude/rules/*.md`` sin ``paths:`` en frontmatter,
más ``CLAUDE.md`` y ``.claude/CLAUDE.md``, por raíz.
*Ciega a:* lo que el cliente inyecta y no vive en el árbol —el prompt de
sistema, los esquemas de herramienta, la inyección de auto mode—; y a los
``@import`` que una regla pueda arrastrar. Es una **cota inferior** del piso.
"""
from __future__ import annotations

import re
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

#: Los archivos que el cliente carga incondicionalmente por raíz, además de
#: las reglas.
ALWAYS_LOADED_FILES = ("CLAUDE.md", ".claude/CLAUDE.md")

#: Dónde viven las reglas de un clon.
RULES_DIR = Path(".claude") / "rules"

#: El campo que hace condicional a una regla, medido SÓLO en el frontmatter:
#: al principio del archivo, entre dos líneas de guiones.
_FRONTMATTER = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n", re.DOTALL)
_PATHS_FIELD = re.compile(r"^paths:", re.MULTILINE)

#: Divisor para ESTIMAR tokens desde bytes. No es una medición: es la razón de
#: conversión que se declara junto a la cifra, nunca un conteo de tokens.
BYTES_PER_TOKEN = 4


def estimated_tokens(byte_count: int) -> int:
    """Tokens estimados. Se publica siempre con su divisor a la vista."""
    return byte_count // BYTES_PER_TOKEN


def is_conditional(text: str) -> bool:
    """¿La regla declara ``paths:`` en su frontmatter?"""
    front = _FRONTMATTER.match(text)
    return bool(front and _PATHS_FIELD.search(front.group(1)))


@dataclass(frozen=True)
class Floor:
    """El piso de UNA raíz: cuántas reglas siempre, cuántas acotadas, y su peso."""

    root: str
    always_loaded: int
    conditional: int
    bytes: int


def floor_of(root: Path) -> Floor:
    """Mide una raíz. Una sin ``.claude/rules`` da ceros, no una excepción."""
    always = conditional = total = 0
    rules = root / RULES_DIR
    if rules.is_dir():
        for rule in sorted(rules.glob("*.md")):
            try:
                text = rule.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            if is_conditional(text):
                conditional += 1
            else:
                always += 1
                total += len(text.encode("utf-8"))
    for name in ALWAYS_LOADED_FILES:
        path = root / name
        if path.is_file():
            total += path.stat().st_size
    return Floor(root=root.name, always_loaded=always,
                 conditional=conditional, bytes=total)


@dataclass(frozen=True)
class Survey:
    """El piso agregado del árbol, con el detalle por raíz intacto.

    El detalle no se descarta: el agregado dice cuánto cuesta arrancar, y las
    filas dicen qué raíz lo domina — que es lo único accionable.
    """

    floors: list[Floor]
    always_loaded: int
    conditional: int
    bytes: int


def survey(roots: Sequence[Path]) -> Survey:
    """Suma el piso de varias raíces."""
    floors = [floor_of(Path(root)) for root in roots]
    return Survey(floors=floors,
                  always_loaded=sum(f.always_loaded for f in floors),
                  conditional=sum(f.conditional for f in floors),
                  bytes=sum(f.bytes for f in floors))


def _cli() -> int:
    """Publica el piso del árbol alcanzable. La prosa nombra ESTE comando.

    Las raíces salen del mecanismo de alcance (``paths.reach``), no de una
    lista escrita a mano: una lista literal se queda atrás en cuanto el árbol
    gana o pierde un clon, y sería la segunda fuente de verdad que nadie
    sincroniza.
    """
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from paths.reach import clone_names, thyrox_root, tree_root

    # `clone_names()` da los consumidores CON su prefijo; `reach_roots()` da
    # los nombres desnudos («api», «db») que no son directorios del arbol. Y
    # thyrox no esta en ninguna de las dos: es el PROVEEDOR, y su .claude
    # tambien carga.
    tree = tree_root()
    roots = [tree / name for name in clone_names()] + [thyrox_root()]
    roots = [root for root in roots if root.is_dir()]
    result = survey(roots)
    for floor in sorted(result.floors, key=lambda f: -f.bytes):
        print(f"  {floor.root:<20} {floor.always_loaded:3d} siempre  "
              f"{floor.conditional:3d} acotadas  {floor.bytes:8d} bytes")
    print(f"  {'TOTAL':<20} {result.always_loaded:3d} siempre  "
          f"{result.conditional:3d} acotadas  {result.bytes:8d} bytes")
    print(f"\n  piso estimado: ~{estimated_tokens(result.bytes)} tokens "
          f"(bytes medidos / {BYTES_PER_TOKEN}; los tokens NO se miden aquí)")
    print(f"  alcance medido: {len(roots)} raíz/raíces")
    # Sin reglas medidas, «ninguna declara paths:» seria un verde falso: no
    # distingue «todas cargan siempre» de «no habia nada que medir».
    if result.always_loaded and not result.conditional:
        print("  ninguna regla declara `paths:`: el piso es TODO lo que hay.")
    elif not result.always_loaded:
        print("  NO SE MIDIO NINGUNA REGLA: revisa el alcance antes de leer el 0.")
    return 0


if __name__ == "__main__":
    raise SystemExit(_cli())
