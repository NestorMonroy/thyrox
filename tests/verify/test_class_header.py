#!/usr/bin/env python3
"""El nivel CABECERA del porte, con su vocabulario y su lector como parametros.

MITAD ROJA, medida antes de escribir el modulo — el nivel vive en un CONSUMIDOR
y no bajo el proveedor:

    $ ls /home/user/thyrox/src/verify/class_header.py
    ls: cannot access '...': No such file or directory
    $ wc -l /home/user/kaupamex-api/scripts/check_model_class_attributes.py
    429

CONTROLES DE ANULACION — los casos 3 a 6 son los que miden la separacion
DEC-04, que es el punto del porte. Cada uno retira un parametro y exige que el
veredicto CAMBIE:

- 3 fija `relocated` en las dos direcciones: si el motor ignorara el predicado,
  las dos ramas darian el mismo conteo y el verde no las distinguiria;
- 4 vacia `tracked`: con el vocabulario cableado, los hallazgos seguirian
  saliendo;
- 5 pasa un localizador que siempre devuelve `None`: con la contraparte
  cableada, seguiria encontrandola;
- 6 pasa un lector de OTRO lenguaje, escrito aqui: con `ast` cableado, el motor
  no veria ningun simbolo en un archivo que no es Python.

Un verde de los casos 1-2 sin los cuatro controles no distinguiria «los cuatro
son parametro» de «los cuatro estan cableados y apuntan a algo que existe».
"""
import importlib.util
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "class_header", HERE / "src" / "verify" / "class_header.py")
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


# --- el contrato de prueba: la FORMA del que el consumidor declara -----------
#
# El vocabulario es dominio del consumidor; aqui se declara para ejercitar el
# mecanismo, no como catalogo del proveedor. Reproduce la cabecera que destapo
# el nivel: atributos de ORM mas objetos de tabla, que se reubican.
HEADER = engine.Header(
    name='atributos de clase de modelo',
    tracked=frozenset({'_name', '_description', '_order', '_rec_name'}),
    special_calls=frozenset({'Constraint', 'Index'}),
)

AST = reader.AstReader()

REFERENCE = (
    "class Registry:\n"
    "    _name = 'stock.picking.type'\n"
    "    _description = 'Picking Type'\n"
    "    _order = 'sequence, id'\n"
    "    _size_uniq = Constraint('unique(name)', 'ya existe')\n"
    "    _CACHE_LIMIT = 64\n"
    "    def method(self):\n"
    "        return 1\n"
    "\n"
    "class Absent:\n"
    "    _name = 'sin.contraparte'\n"
)

# Declara dos de los cuatro rastreados y reubica el objeto de tabla en `Meta`.
OURS = (
    "class Registry:\n"
    "    _name = 'stock.picking.type'\n"
    "    _description = 'Picking Type'\n"
    "    _CACHE_LIMIT = 64\n"
    "    class Meta:\n"
    "        db_table = 'stock_picking_type'\n"
    "    def method(self):\n"
    "        return 1\n"
)


print("\n1. container_attributes — la familia sale del PRIMER nombre invocado")
with tempfile.TemporaryDirectory() as tmp:
    source = Path(tmp) / "registry.py"
    source.write_text(REFERENCE)
    tracked, special = engine.container_attributes(
        source, 'Registry', HEADER, AST)
    check("los rastreados son los del vocabulario",
          ['_description', '_name', '_order'], sorted(tracked))
    check("el objeto de tabla cae en su propia familia",
          ['_size_uniq'], sorted(special))
    check("una constante de modulo en mayusculas no es ninguna de las dos",
          False, '_CACHE_LIMIT' in tracked or '_CACHE_LIMIT' in special)
    check("una clase anidada no es contenedor de nivel superior",
          ['Absent', 'Registry'],
          sorted(engine.top_level_containers(source, AST)))

# --- el banco de los casos 2 a 5: dos archivos reales en disco --------------
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "src").mkdir()
    (root / "ref").mkdir()
    ours = root / "src" / "registry.py"
    source = root / "ref" / "registry.py"
    ours.write_text(OURS)
    source.write_text(REFERENCE)
    locator = lambda p: root / "ref" / Path(p).name

    print("\n2. compare_headers — sale lo ausente, no lo presente")
    findings, scope = engine.compare_headers([ours], HEADER, locator, AST)
    check("dos hallazgos", 2, len(findings))
    check("y son el rastreado ausente y el objeto de tabla",
          [('special', '_size_uniq'), ('tracked', '_order')],
          sorted((f.kind, f.attribute) for f in findings))
    check("con la linea de la FUENTE, que es donde se lee el contrato",
          4, next((f.lineno for f in findings if f.attribute == '_order'), None))
    check("la clase sin contraparte NO entra al denominador",
          1, scope.containers_compared)
    check("el denominador de atributos es el de la fuente",
          4, scope.attributes_compared)
    check("un archivo recorrido, uno con contraparte",
          (1, 1), (scope.files_scanned, scope.files_with_counterpart))

    print("\n3. CONTROL — `relocated` es PARAMETRO, y decide en los dos sentidos")
    # Si el motor ignorara el predicado, las dos ramas darian lo mismo.
    never = engine.Header(HEADER.name, HEADER.tracked, HEADER.special_calls,
                          relocated=lambda *_: False)
    always = engine.Header(HEADER.name, HEADER.tracked, HEADER.special_calls,
                           relocated=lambda *_: True)
    kinds = lambda h: sorted(f.kind for f in
                             engine.compare_headers([ours], h, locator, AST)[0])
    check("3.1 sin reubicacion, el objeto de tabla es hallazgo",
          ['special', 'tracked'], kinds(never))
    check("3.2 con reubicacion declarada, se descuenta",
          ['tracked'], kinds(always))
    # El predicado recibe el contenedor NUESTRO: sin el no puede mirar `Meta`.
    seen = []
    watcher = engine.Header(HEADER.name, HEADER.tracked, HEADER.special_calls,
                            relocated=lambda a, c: seen.append((a, c.name)))
    engine.compare_headers([ours], watcher, locator, AST)
    check("3.3 y lo recibe con el atributo y NUESTRO contenedor",
          [('_size_uniq', 'Registry')], seen)

    print("\n4. CONTROL — el vocabulario es PARAMETRO, no esta cableado")
    empty = engine.Header(HEADER.name, frozenset(), HEADER.special_calls)
    findings_empty, scope_empty = engine.compare_headers(
        [ours], empty, locator, AST)
    check("4.1 sin vocabulario no hay hallazgo rastreado",
          [], [f for f in findings_empty if f.kind == 'tracked'])
    check("4.2 y el denominador de atributos cae con el",
          1, scope_empty.attributes_compared)

    print("\n5. CONTROL — el localizador es PARAMETRO, no esta cableado")
    absent = engine.compare_headers([ours], HEADER, lambda _p: None, AST)
    check("5.1 sin localizador no hay contraparte",
          0, absent[1].files_with_counterpart)
    check("5.2 y por tanto no hay hallazgos", 0, len(absent[0]))
    check("5.3 pero el recorrido SI se declara", 1, absent[1].files_scanned)


# --- 6. `selects` decide el universo de candidatos ---------------------------
#
# Banco propio: la fuente declara un atributo SIN guion bajo que el puerto no
# tiene. Con el criterio por defecto no es candidato y no hay hallazgo; con uno
# propio, si. Si el motor cableara el prefijo, las dos ramas darian lo mismo.
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "src").mkdir()
    (root / "ref").mkdir()
    ours = root / "src" / "registry.py"
    source = root / "ref" / "registry.py"
    source.write_text("class Registry:\n"
                      "    table_name = 'stock_picking_type'\n")
    ours.write_text("class Registry:\n"
                    "    pass\n")
    locator = lambda p: root / "ref" / Path(p).name
    naming = engine.Header('nombre de tabla', frozenset({'table_name'}))

    print("\n6. CONTROL — `selects` es PARAMETRO: decide que nombre es candidato")
    default_findings, default_scope = engine.compare_headers(
        [ours], naming, locator, AST)
    check("6.1 con el default, un nombre sin guion bajo no es candidato",
          (0, 0), (len(default_findings), default_scope.attributes_compared))
    wide = engine.Header(naming.name, naming.tracked, selects=lambda _n: True)
    wide_findings, wide_scope = engine.compare_headers(
        [ours], wide, locator, AST)
    check("6.2 con un `selects` propio, el mismo par SI da hallazgo",
          (['table_name'], 1),
          ([f.attribute for f in wide_findings], wide_scope.attributes_compared))


# --- 7. el LECTOR es parametro: el motor no toca `ast` ----------------------
#
# La misma correccion que el nivel CUERPO ya recibio: sacar el vocabulario del
# dominio y dejar cableado el LENGUAJE deja el nivel util para un solo arbol de
# los que el proveedor gobierna. `PatternReader` no sirve de control aqui —su
# ceguera declarada incluye la clase duena, y sin `owner` no hay cabecera que
# medir—, asi que el control es un lector escrito para esta prueba.
class MarkupReader:
    """Lector de un formato de juguete. Prueba que el motor no asume Python.

    Cada linea es `clase` o `  atributo = valor`, y un valor `call:Nombre`
    declara una llamada. No hay `ast` de por medio en ningun punto.
    """

    extensions = ('.hdr',)

    def _parse(self, path):
        owner = ''
        for number, line in enumerate(Path(path).read_text().splitlines(), 1):
            if not line.strip():
                continue
            if not line.startswith(' '):
                owner = line.strip()
                yield ('class', owner, '', number, None)
            else:
                name, _, value = line.strip().partition(' = ')
                yield ('assign', name, owner, number, value)

    def symbols(self, path):
        return [reader.Symbol(name, kind, owner, number, body)
                for kind, name, owner, number, body in self._parse(path)]

    def top_level(self, path):
        return [s for s in self.symbols(path) if s.kind == 'class']

    def called_names(self, body):
        if isinstance(body, str) and body.startswith('call:'):
            yield body[len('call:'):]


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "src").mkdir()
    (root / "ref").mkdir()
    ours = root / "src" / "registry.hdr"
    source = root / "ref" / "registry.hdr"
    source.write_text("Registry\n"
                      "  _name = stock.picking.type\n"
                      "  _order = sequence, id\n"
                      "  _size_uniq = call:Constraint\n")
    ours.write_text("Registry\n"
                    "  _name = stock.picking.type\n")
    locator = lambda p: root / "ref" / Path(p).name

    print("\n7. CONTROL — el lector es PARAMETRO, no esta cableado a Python")
    markup_findings, markup_scope = engine.compare_headers(
        [ours], HEADER, locator, MarkupReader())
    check("7.1 con otro lector, el contenedor de otro lenguaje se compara",
          1, markup_scope.containers_compared)
    check("7.2 y salen las dos familias, como en Python",
          [('special', '_size_uniq'), ('tracked', '_order')],
          sorted((f.kind, f.attribute) for f in markup_findings))
    # Con el lector de Python el MISMO arbol no da nada: no es que no haya
    # divergencia, es que el lector no ve el archivo.
    python_findings, python_scope = engine.compare_headers(
        [ours], HEADER, locator, AST)
    check("7.3 el lector de Python NO ve contenedores ahi",
          (0, 0), (len(python_findings), python_scope.containers_compared))

print(f"\n{OK} ok, {FAILURES} fallos")
sys.exit(1 if FAILURES else 0)
