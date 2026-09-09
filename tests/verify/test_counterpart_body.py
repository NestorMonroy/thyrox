#!/usr/bin/env python3
"""El nivel CUERPO del porte, con su localizador de contraparte como parametro.

MITAD ROJA, medida 2026-09-09T22:38 antes de escribir el modulo. Los cuatro
niveles de verificacion de porte viven en un CONSUMIDOR y ninguno bajo el
proveedor:

    === MITAD ROJA: los cuatro niveles bajo thyrox/src ===
    counterpart_body                   0 archivo(s) en thyrox/src
    check_porte_completo               0 archivo(s) en thyrox/src
    check_model_class_attributes       0 archivo(s) en thyrox/src
    check_symbol_home                  0 archivo(s) en thyrox/src

Y el consumidor SI mide, con cifra no trivial — es el control positivo real de
este porte, no un ejemplo fabricado (`kaupamex-api: scripts/check_write_path.py`,
mismo turno):

    check_write_path: 0 hallazgo(s) nuevo(s) (17 en total; 17 en baseline)
    (alcance medido: 89 par(es) de metodo que escriben en ambos lados, sobre
    121 archivo(s) con contraparte de 212 recorrido(s); 8 indeterminado(s) por
    granularidad de metodo)

CONTROL DE ANULACION — el caso 5 es el que mide la separacion DEC-04, que es el
punto del porte. Si `compare` ignorara su parametro `counterpart` y usara uno
cableado (como la version del consumidor), los casos 3 y 4 seguirian en verde:
miden que la comparacion clasifica bien, no de donde sale la contraparte. El 5
pasa un localizador que devuelve `None` siempre y exige 0 archivos con
contraparte; con el localizador cableado ese caso caeria solo.

Un verde de los casos 1-4 sin el 5 no distinguiria «el localizador es
parametro» de «el localizador esta cableado y apunta a algo que existe».
"""
import importlib.util
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "counterpart_body", HERE / "src" / "verify" / "counterpart_body.py")
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)
reader = engine.reader_module

OK = FALLOS = 0


def check(etiqueta, esperado, obtenido):
    global OK, FALLOS
    if esperado == obtenido:
        print(f"  ok    {etiqueta}"); OK += 1
    else:
        print(f"  FALLO {etiqueta}\n        esperado=[{esperado}]"
              f"\n        obtenido=[{obtenido}]"); FALLOS += 1


# --- el eje de prueba: la FORMA del que el consumidor declara ---------------
#
# Los vocabularios son dominio del consumidor; aqui se declaran para ejercitar
# el mecanismo, no como catalogo del proveedor. Reproducen el eje que destapo
# H-API-1058: escribir por el enganche del ORM contra escribir por debajo.
VIA_HOOK = 'por el enganche'
BELOW = 'por debajo'
CROSSES_GUARD = 'cruza una guarda que la fuente esquiva'
SKIPS_HOOK = 'se salta un enganche que la fuente usa'

AXIS = engine.Axis(
    name='camino de escritura',
    ours=engine.Vocabulary(
        'nuestro',
        frozenset({'save', 'create', 'update_or_create'}),
        frozenset({'bulk_create', 'execute'})),
    reference=engine.Vocabulary(
        'la fuente',
        frozenset({'create', 'write'}),
        frozenset({'upsert_en', 'execute_query'})),
    first_name=VIA_HOOK,
    second_name=BELOW,
    directions={
        (VIA_HOOK, BELOW): CROSSES_GUARD,
        (engine.BOTH, BELOW): CROSSES_GUARD,
        (BELOW, VIA_HOOK): SKIPS_HOOK,
        (engine.BOTH, VIA_HOOK): SKIPS_HOOK,
    },
)


AST = reader.AstReader()


def body(source):
    """El nodo de la unica funcion del fragmento — la forma que AstReader da."""
    import ast
    return ast.parse(source).body[0]


print("\n1. classify — la categoria sale del vocabulario de SU lado")
check("nuestro update_or_create es 'por el enganche'", VIA_HOOK,
      engine.classify(body("def f():\n    M.update_or_create(x=1)\n"),
                      AXIS.ours, AXIS, AST))
check("de la fuente, upsert_en es 'por debajo'", BELOW,
      engine.classify(body("def f():\n    self.upsert_en(x)\n"),
                      AXIS.reference, AXIS, AST))
check("un cuerpo sin senal es ABSENT", engine.ABSENT,
      engine.classify(body("def f():\n    return 1\n"), AXIS.ours, AXIS, AST))
check("los dos vocabularios a la vez son BOTH", engine.BOTH,
      engine.classify(body("def f():\n    M.save()\n    M.bulk_create([])\n"),
                      AXIS.ours, AXIS, AST))

print("\n2. direction — tres desenlaces, no dos")
check("categorias iguales: sin desacuerdo", None,
      engine.direction(VIA_HOOK, VIA_HOOK, AXIS))
check("un lado sin senal: no se compara", None,
      engine.direction(engine.ABSENT, BELOW, AXIS))
check("BOTH contra una categoria: indeterminado", engine.INDETERMINATE,
      engine.direction(engine.BOTH, BELOW, AXIS))
check("H-API-1058: nuestro por el enganche, la fuente por debajo",
      CROSSES_GUARD, engine.direction(VIA_HOOK, BELOW, AXIS))
check("la inversa NO es el mismo nombre", SKIPS_HOOK,
      engine.direction(BELOW, VIA_HOOK, AXIS))

print("\n3. mirrored_counterpart — los pares son parametro")
check("un prefijo declarado traduce a su destino",
      "/ref/odoo/orm/fields.py",
      str(engine.mirrored_counterpart(
          "src/orm/fields.py", [(('src', 'orm'), ('odoo', 'orm'))], "/ref")))
check("una ruta que ninguna raiz cubre da None", None,
      engine.mirrored_counterpart(
          "otro/sitio/x.py", [(('src', 'orm'), ('odoo', 'orm'))], "/ref"))
check("el segundo par tambien se consulta",
      "/ref/odoo/tools/sql.py",
      str(engine.mirrored_counterpart(
          "src/tools/sql.py",
          [(('src', 'orm'), ('odoo', 'orm')),
           (('src', 'tools'), ('odoo', 'tools'))], "/ref")))

# --- el banco de los casos 4 y 5: dos archivos reales en disco --------------
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    (raiz / "src" / "orm").mkdir(parents=True)
    (raiz / "ref" / "odoo" / "orm").mkdir(parents=True)
    nuestro = raiz / "src" / "orm" / "registry.py"
    fuente = raiz / "ref" / "odoo" / "orm" / "registry.py"
    # La forma de H-API-1058: el mismo metodo, escrito por caminos distintos.
    nuestro.write_text(
        "class Registry:\n"
        "    def _reflect_models(self):\n"
        "        Model.update_or_create(name=n)\n"
        "    def _sin_escritura(self):\n"
        "        return 1\n")
    fuente.write_text(
        "class Registry:\n"
        "    def _reflect_models(self):\n"
        "        self.upsert_en(cr, rows)\n"
        "    def _sin_escritura(self):\n"
        "        return 1\n")

    def localizador(path):
        return engine.mirrored_counterpart(
            Path(path).relative_to(raiz),
            [(('src', 'orm'), ('ref', 'odoo', 'orm'))], raiz)

    print("\n4. compare — el par divergente sale, el mudo no")
    hallazgos, alcance = engine.compare([nuestro], AXIS, localizador)
    check("un hallazgo", 1, len(hallazgos))
    check("y es el metodo que escribe", "_reflect_models",
          hallazgos[0].symbol if hallazgos else None)
    check("con la direccion del eje", CROSSES_GUARD,
          hallazgos[0].direction if hallazgos else None)
    check("el par sin senal NO entra al denominador", 1, alcance.pairs_compared)
    check("un archivo con contraparte", 1, alcance.files_with_counterpart)

    print("\n5. CONTROL — el localizador es PARAMETRO, no esta cableado")
    # Si `compare` usara un localizador propio, este caso seguiria encontrando
    # la contraparte y el verde no distinguiria las dos implementaciones.
    sin_contraparte = engine.compare([nuestro], AXIS, lambda _p: None)
    check("sin localizador no hay contraparte", 0,
          sin_contraparte[1].files_with_counterpart)
    check("y por tanto no hay hallazgos", 0, len(sin_contraparte[0]))
    check("pero el recorrido SI se declara", 1,
          sin_contraparte[1].files_scanned)

# --- 6. el LECTOR es parametro: el mismo eje sobre otro lenguaje -----------
#
# La correccion del ejecutor en este turno: sacar el vocabulario del dominio y
# dejar cableado el LENGUAJE deja el nivel util para un solo arbol de los que
# el proveedor gobierna. `ui` es JavaScript y `_references/claude-code-bin/`
# es TypeScript; los dos son arboles que THYROX tiene que poder leer.
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    (raiz / "src").mkdir(); (raiz / "ref").mkdir()
    nuestro = raiz / "src" / "store.ts"
    fuente = raiz / "ref" / "store.ts"
    nuestro.write_text(
        "export function persist(rows) {\n"
        "  return Model.update_or_create(rows)\n"
        "}\n")
    fuente.write_text(
        "export function persist(rows) {\n"
        "  return db.upsert_en(rows)\n"
        "}\n")
    localizar_ts = lambda p: raiz / "ref" / Path(p).name
    TS = reader.PatternReader()

    print("\n6. CONTROL — el lector es PARAMETRO, no esta cableado a Python")
    f_ts, s_ts = engine.compare([nuestro], AXIS, localizar_ts, TS)
    check("6.1 con el lector de patrones, el par de TypeScript se compara",
          1, s_ts.pairs_compared)
    check("6.2 y sale el mismo desacuerdo que en Python", CROSSES_GUARD,
          f_ts[0].direction if f_ts else None)
    # Con el lector de Python el MISMO arbol no da nada: no es que no haya
    # divergencia, es que el lector no ve el archivo. Sin este caso, un motor
    # cableado a Python publicaria 0 y el verde no lo distinguiria.
    f_py, s_py = engine.compare([nuestro], AXIS, localizar_ts, AST)
    check("6.3 el lector de Python NO ve simbolos ahi (por eso es parametro)",
          (0, 0), (len(f_py), s_py.pairs_compared))
    check("6.4 y las extensiones salen del lector, no del motor",
          ('.ts', '.tsx', '.js', '.jsx'), TS.extensions)
    check("6.5 tree_files recorre lo que el lector declara", [nuestro],
          list(engine.tree_files([raiz / "src"], TS.extensions)))

print(f"\n{OK} ok, {FALLOS} fallos")
sys.exit(1 if FALLOS else 0)
