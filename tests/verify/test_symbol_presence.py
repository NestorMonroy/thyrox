#!/usr/bin/env python3
"""El nivel PRESENCIA del porte, con sus ocho parametros de consumidor.

MITAD ROJA, medida antes de escribir el modulo — el nivel vivia en un
CONSUMIDOR y no bajo el proveedor:

    check_porte_completo               0 archivo(s) en thyrox/src

Y el consumidor SI mide, con cifra no trivial: es el control positivo real de
este porte, no un ejemplo fabricado.

CONTROLES DE ANULACION — uno por parametro. La pregunta que cada uno responde
no es «el motor clasifica bien» sino «el motor CONSULTA este parametro». Si
`compare_presence` ignorara uno y usara la version cableada del consumidor, los
casos de clasificacion seguirian en verde: miden otra cosa.

Cada control parte del mismo banco y cambia UN parametro. Su veredicto tiene
que moverse; si no se mueve, el parametro no se estaba consultando.
"""
import importlib.util
import sys
import tempfile
from pathlib import Path

# La aritmetica de ruta se usa SOLO para alimentar `sys.path` y poder
# preguntarle a `reach`, que es la excepcion que `check_path_arithmetic`
# admite. La raiz de la que cuelga el sujeto sale de `reach.thyrox_root()`,
# no de contar directorios: contarlos es lo que la mudanza a thyrox invalido.
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from paths import reach  # noqa: E402

spec = importlib.util.spec_from_file_location(
    "symbol_presence",
    reach.thyrox_root() / "src" / "verify" / "symbol_presence.py")
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)
reader = engine.reader_module

OK = FAILURES = 0


def check(label, expected, got):
    global OK, FAILURES
    if expected == got:
        print(f"  ok    {label}"); OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}]"
              f"\n        obtenido=[{got}]"); FAILURES += 1


def summary(findings):
    """`(kind, container, miembros)` — la forma que los casos comparan."""
    return sorted((f.kind, f.container, f.members) for f in findings)


AST = reader.AstReader()


# --- el banco: un arbol de fuente y su puerto incompleto -------------------
#
# Reproduce las tres formas que el consumidor distingue: un archivo con
# contraparte y un miembro sin portar, una clase de solo campos, y un archivo
# entero que nadie porto.
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "ref" / "models").mkdir(parents=True)
    (root / "ours" / "models").mkdir(parents=True)
    registry_ref = root / "ref" / "models" / "registry.py"
    orphan_ref = root / "ref" / "models" / "orphan.py"
    registry_ours = root / "ours" / "models" / "registry.py"
    registry_ref.write_text(
        "class Registry:\n"
        "    def _reflect_models(self):\n"
        "        pass\n"
        "    def _load(self):\n"
        "        pass\n"
        "class Empty:\n"
        "    name = 1\n")
    orphan_ref.write_text(
        "class Orphan:\n"
        "    def a(self):\n"
        "        pass\n")
    registry_ours.write_text(
        "class Registry:\n"
        "    def _reflect_models(self):\n"
        "        pass\n")

    SOURCES = [registry_ref, orphan_ref]

    def locate(path):
        ours = root / "ours" / "models" / Path(path).name
        return ours if ours.exists() else None

    def measure(presence, counterpart=locate):
        return engine.compare_presence(SOURCES, presence, counterpart, AST)

    print("\n1. Linea base — los tres veredictos que el banco produce")
    findings, scope = measure(engine.Presence())
    check("1.1 tres hallazgos",
          [(engine.CLASS_ABSENT, 'Empty', ()),
           (engine.FILE_NOT_PORTED, '', ('Orphan',)),
           (engine.MEMBERS_ABSENT, 'Registry', ('_load',))],
          summary(findings))
    check("1.2 el denominador cuenta LOS DOS archivos de la fuente",
          (2, 1), (scope.files_scanned, scope.files_with_counterpart))
    check("1.3 y solo la clase con contraparte entra al conteo comparado",
          (1, 2), (scope.containers_compared, scope.members_compared))

    print("\n2. GUARDA — una clase AUSENTE sin miembros sigue siendo hallazgo")
    # `Empty` no declara ni una funcion. Suprimirla seria leer «no tiene
    # metodos» como «esta portada»: la fuente declara clases de solo campos.
    check("2.1 aparece con lista vacia", 1,
          len([f for f in findings if f.kind == engine.CLASS_ABSENT]))

    print("\n3. CONTROL `installed` — vuelve EXTENDIDA la clase, y la suprime")
    # Misma clase, otro veredicto: es lo que distingue «no esta» de «esta
    # cubierta por lo que el puerto le instala encima». Y con lista vacia la
    # segunda guarda la suprime, al reves que la primera.
    extended = engine.Presence(
        installed=lambda name: {'x'} if name == 'Empty' else None)
    check("3.1 la clase de solo campos desaparece del reporte",
          [(engine.FILE_NOT_PORTED, '', ('Orphan',)),
           (engine.MEMBERS_ABSENT, 'Registry', ('_load',))],
          summary(measure(extended)[0]))
    # Y sobre una clase CON miembros el mismo parametro absuelve por cobertura.
    covers = engine.Presence(
        installed=lambda name: {'a'} if name == 'Orphan' else None)
    check("3.2 y en la rama sin archivo pareado tambien absuelve",
          [(engine.CLASS_ABSENT, 'Empty', ()),
           (engine.MEMBERS_ABSENT, 'Registry', ('_load',))],
          summary(measure(covers)[0]))

    print("\n4. CONTROL `located` — AUSENTE contra FUERA DE SITIO")
    elsewhere = engine.Presence(
        located=lambda name: set() if name == 'Empty' else None)
    check("4.1 la clase pasa a estar portada en otro archivo",
          [(engine.CLASS_OUT_OF_FILE, 'Empty', ()),
           (engine.FILE_NOT_PORTED, '', ('Orphan',)),
           (engine.MEMBERS_ABSENT, 'Registry', ('_load',))],
          summary(measure(elsewhere)[0]))
    check("4.2 y entra al denominador comparado", 2,
          measure(elsewhere)[1].containers_compared)

    print("\n5. CONTROL `key_source` — el alias resucita un miembro ausente")
    # El consumidor declara equivalencias que dependen del archivo y de la
    # clase; el motor solo las consulta. Sin este parametro, `_load` seguiria
    # contandose ausente.
    aliased = engine.Presence(
        key_source=lambda member, container, path:
            '_reflect_models' if member == '_load' else member)
    check("5.1 el miembro deja de faltar",
          [(engine.CLASS_ABSENT, 'Empty', ()),
           (engine.FILE_NOT_PORTED, '', ('Orphan',))],
          summary(measure(aliased)[0]))

    print("\n6. CONTROL `absolved` — la equivalencia declarada en el archivo")
    forgiven = engine.Presence(absolved=lambda our_path: {'_load'})
    check("6.1 el miembro absuelto no es ausencia",
          [(engine.CLASS_ABSENT, 'Empty', ()),
           (engine.FILE_NOT_PORTED, '', ('Orphan',))],
          summary(measure(forgiven)[0]))

    print("\n7. CONTROL `file_members` — AUSENTE contra FUERA DE SITIO")
    # El mismo miembro, distinto veredicto: existe en NUESTRO archivo pero no
    # en la clase que le toca. Sin el parametro los dos casos se colapsan en
    # «ausente», que es medir presencia del nombre en vez de su sitio.
    loose = engine.Presence(file_members=lambda our_path: {'_load'})
    check("7.1 pasa a fuera de sitio",
          [(engine.CLASS_ABSENT, 'Empty', ()),
           (engine.FILE_NOT_PORTED, '', ('Orphan',)),
           (engine.OUT_OF_PLACE, 'Registry', ('_load',))],
          summary(measure(loose)[0]))

    print("\n8. CONTROL `demoted` — presente, con la visibilidad cambiada")
    lowered = engine.Presence(
        demoted=lambda member, container, source, ours:
            member == '_reflect_models')
    check("8.1 un miembro presente puede seguir siendo hallazgo",
          [(engine.CLASS_ABSENT, 'Empty', ()),
           (engine.DEMOTED, 'Registry', ('_reflect_models',)),
           (engine.FILE_NOT_PORTED, '', ('Orphan',)),
           (engine.MEMBERS_ABSENT, 'Registry', ('_load',))],
          summary(measure(lowered)[0]))

    print("\n9. CONTROL `counterpart` — el localizador es PARAMETRO")
    # Si `compare_presence` resolviera la contraparte por su cuenta, los casos
    # 1-8 seguirian en verde: ninguno mide de donde sale la ruta nuestra.
    orphaned, orphan_scope = measure(engine.Presence(),
                                     counterpart=lambda _p: None)
    check("9.1 sin localizador los DOS archivos quedan sin portar",
          [(engine.FILE_NOT_PORTED, '', ('Empty', 'Registry')),
           (engine.FILE_NOT_PORTED, '', ('Orphan',))],
          summary(orphaned))
    check("9.2 y el recorrido se declara igual", (2, 0),
          (orphan_scope.files_scanned, orphan_scope.files_with_counterpart))

    print("\n10. La direccion del localizador es la INVERSA de los otros niveles")
    # `counterpart` recibe la ruta de LA FUENTE. Un localizador cableado al
    # reves —que espere la nuestra— no encontraria nada, y ese cero se leeria
    # como conformidad. El vigilante lo fija por conducta, no por lectura.
    seen = []

    def watching(path):
        seen.append(str(path))
        return locate(path)

    engine.compare_presence(SOURCES, engine.Presence(), watching, AST)
    check("10.1 el localizador recibe la ruta de la fuente",
          [str(registry_ref), str(orphan_ref)], seen)

# --- 11. el banco de `key_container`: dos clases homonimas mal escritas -----
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "ref").mkdir(); (root / "ours").mkdir()
    source_file = root / "ref" / "sale.py"
    ours_file = root / "ours" / "sale.py"
    source_file.write_text(
        "class SaleOrder:\n"
        "    def confirm(self):\n"
        "        pass\n")
    ours_file.write_text(
        "class Sale_Order:\n"
        "    def confirm(self):\n"
        "        pass\n")
    pairing = lambda _p: ours_file

    print("\n11. CONTROL `key_container` — el emparejamiento de dos clases")
    strict = engine.compare_presence([source_file], engine.Presence(), pairing,
                                     AST)
    check("11.1 con la llave por defecto, la clase no se empareja",
          [(engine.CLASS_ABSENT, 'SaleOrder', ('confirm',))],
          summary(strict[0]))
    relaxed = engine.compare_presence(
        [source_file],
        engine.Presence(key_container=lambda name: name.replace('_', '')),
        pairing, AST)
    check("11.2 con la del consumidor, se empareja y no hay hallazgo",
          [], summary(relaxed[0]))
    check("11.3 y entra al denominador comparado",
          (1, 1), (relaxed[1].containers_compared, relaxed[1].members_compared))

# --- 12. el LECTOR es parametro: el mismo nivel sobre otro lenguaje --------
#
# `PatternReader` NO sirve aqui: su ceguera declarada incluye `owner`, asi que
# no resuelve la clase duena de un metodo y este nivel no puede usarlo. Un
# lector escrito a mano lo demuestra: el motor no toca `ast` en ningun punto.
BRACKET = """\
class Registry
  fn _reflect_models
  fn _load
"""


class MarkupReader:
    """Lector de un formato de juguete — la prueba de que el motor no ve Python."""

    extensions = ('.mk',)

    def _lines(self, path):
        return Path(path).read_text().splitlines()

    def top_level(self, path):
        return [reader.Symbol(line.split()[1], 'class', '', number, line)
                for number, line in enumerate(self._lines(path), 1)
                if line.startswith('class ')]

    def symbols(self, path):
        found, owner = [], ''
        for number, line in enumerate(self._lines(path), 1):
            if line.startswith('class '):
                owner = line.split()[1]
                found.append(
                    reader.Symbol(owner, 'class', '', number, line))
            elif line.strip().startswith('fn '):
                found.append(reader.Symbol(line.split()[1], 'function', owner,
                                           number, line))
        return found

    def called_names(self, body):
        return iter(())


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    source_file = root / "registry.mk"
    ours_file = root / "port.mk"
    source_file.write_text(BRACKET)
    ours_file.write_text("class Registry\n  fn _reflect_models\n")

    print("\n12. CONTROL — el lector es PARAMETRO, no esta cableado a Python")
    marked = engine.compare_presence(
        [source_file], engine.Presence(), lambda _p: ours_file, MarkupReader())
    check("12.1 el nivel corre sobre un formato que `ast` no parsea",
          [(engine.MEMBERS_ABSENT, 'Registry', ('_load',))],
          summary(marked[0]))
    # Con el lector de Python el MISMO arbol no da nada: no es que no haya
    # divergencia, es que el lector no ve el archivo. Sin este caso, un motor
    # cableado a Python publicaria un cero y el verde no lo distinguiria.
    blind = engine.compare_presence(
        [source_file], engine.Presence(), lambda _p: ours_file, AST)
    check("12.2 el lector de Python no ve nada ahi (por eso es parametro)",
          ([], 0), (summary(blind[0]), blind[1].containers_compared))

print(f"\n{OK} ok, {FAILURES} fallos")
sys.exit(1 if FAILURES else 0)
