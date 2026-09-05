#!/usr/bin/env python3
"""Prueba de ``gates.package_boundary`` — la frontera entre paquetes hermanos.

Es la mitad ROJA escrita ANTES del módulo (TDD). El import de abajo falla
mientras ``src/gates/package_boundary.py`` no exista, y ese fallo se persiste.

Qué cubre cada bloque, y por qué existe — cada uno nace de un defecto MEDIDO en
``kaupamex-docs: .claude/packages`` (:ref:`h-docs-1075`), no de una preferencia:

1. **Las tres clases de import se separan** — un cruce a otro paquete no es lo
   mismo que salir de la raíz hacia un directorio que no declara superficie. El
   hallazgo mide 7 de la primera clase y 1 de la segunda, y el veredicto de la
   segunda es una decisión abierta (#134). Un gate que las colapse obliga a
   decidir las dos juntas.
2. **La pertenencia se decide por el paquete que declara, no por profundidad** —
   ``harness/src/context/x.ts`` y ``harness/bin/y.ts`` pertenecen al mismo
   paquete aunque estén a distinta altura, y el número de ``../`` no lo dice.
3. **El especificador se normaliza contra el DIRECTORIO del archivo** — la misma
   cadena ``'../../../agent/src/models.ts'`` cruza o no según desde dónde se
   escriba. Comparar la cadena en vez de la ruta resuelta es medir el
   significante y concluir sobre el significado.
4. **El import por nombre de paquete NO es hallazgo** — es la conducta que el
   gate existe para promover. Marcarlo sería premiar el defecto.
5. **El alcance se publica con su denominador** — un conteo sin universo no
   distingue un instrumento ciego de uno correcto.
6. **Los controles pueden fallar** — cada bloque de veredicto trae su gemelo con
   la causa RETIRADA, y exige que el veredicto CAMBIE. Un verde que no cambia al
   quitarle la causa no está midiendo la causa (sub-patrón D de
   ``metrica-decide-la-conclusion.md``).

Uso:  python3 tests/gates/test_package_boundary.py
"""

import json
import pathlib
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
THYROX_ROOT = HERE.parents[2]
sys.path.insert(0, str(THYROX_ROOT / "src"))

from gates import package_boundary  # noqa: E402  (la ruta se compone arriba)

PASS = 0
FAIL = 0


def check(label: str, expected, actual) -> None:
    global PASS, FAIL
    if expected == actual:
        PASS += 1
        print(f"  ok    {label}")
    else:
        FAIL += 1
        print(f"  FALLA {label}\n          esperado: {expected!r}\n          real:     {actual!r}")


def build_tree(base: pathlib.Path) -> pathlib.Path:
    """Un árbol sintético con la forma medida en ``.claude/packages``.

    Dos paquetes hermanos que declaran ``exports``, más un directorio vecino
    que NO declara nada — que es la tercera clase del hallazgo.
    """
    root = base / "packages"
    for name, exports in (
        ("agent", {".": "./src/index.ts", "./models": "./src/models.ts"}),
        ("harness", {".": "./src/index.ts"}),
    ):
        pkg = root / name
        (pkg / "src").mkdir(parents=True, exist_ok=True)
        (pkg / "package.json").write_text(
            json.dumps({"name": f"@thyrox/{name}", "exports": exports}), encoding="utf-8"
        )
    (root / "agent" / "src" / "models.ts").write_text("export const MODELS = {}\n", encoding="utf-8")
    (base / "config" / "settings").mkdir(parents=True, exist_ok=True)
    (base / "config" / "settings" / "load.ts").write_text("export const load = 1\n", encoding="utf-8")
    return root


def write(path: pathlib.Path, text: str) -> pathlib.Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


print("\n1. Las tres clases de import se separan")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    root = build_tree(base)
    consumer = root / "harness" / "src" / "cost.ts"

    check(
        "cruce al src/ ajeno -> cruza-paquete",
        "cruza-paquete",
        package_boundary.classify(consumer, "../../agent/src/models.ts", root),
    )
    check(
        "salida de la raiz de paquetes -> sale-de-la-raiz",
        "sale-de-la-raiz",
        package_boundary.classify(consumer, "../../../config/settings/load.ts", root),
    )
    check(
        "dentro del propio paquete -> interno",
        "interno",
        package_boundary.classify(consumer, "./types.ts", root),
    )
    check(
        "nombre de paquete -> no-relativo",
        "no-relativo",
        package_boundary.classify(consumer, "@thyrox/agent/models", root),
    )

print("\n2. La pertenencia la decide el paquete que declara, no la profundidad")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    root = build_tree(base)
    hondo = root / "harness" / "src" / "context" / "nested" / "deep.ts"
    somero = root / "harness" / "bin" / "cli.ts"

    check("un archivo hondo pertenece a su paquete", "harness",
          package_boundary.package_of(hondo, root))
    check("uno somero, al mismo", "harness",
          package_boundary.package_of(somero, root))
    check("un archivo fuera de la raiz no pertenece a ninguno", None,
          package_boundary.package_of(base / "config" / "settings" / "load.ts", root))

print("\n3. El especificador se resuelve contra el DIRECTORIO del archivo")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    root = build_tree(base)
    # La MISMA cadena, escrita desde dos alturas: cruza desde una y no desde la otra.
    hondo = root / "harness" / "src" / "context" / "deep.ts"
    somero = root / "harness" / "src" / "cost.ts"
    misma = "../../agent/src/models.ts"

    check("desde src/cost.ts cruza", "cruza-paquete",
          package_boundary.classify(somero, misma, root))
    check("desde src/context/deep.ts NO cruza (se queda en harness)", "interno",
          package_boundary.classify(hondo, misma, root))
    check(
        "control — comparar la cadena daria el mismo veredicto para los dos",
        True,
        package_boundary.classify(somero, misma, root)
        != package_boundary.classify(hondo, misma, root),
    )

print("\n4. El recorrido encuentra los especificadores, y sólo ésos")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    root = build_tree(base)
    fuente = write(
        root / "harness" / "src" / "cost.ts",
        "import { A } from '../../agent/src/models.ts'\n"
        'import type { B } from "../../agent/src/types.ts"\n'
        "import { C } from './local.ts'\n"
        "import { D } from '@thyrox/agent/models'\n"
        "const e = await import('../../agent/src/tarde.ts')\n"
        "// import { F } from '../../agent/src/comentado.ts'\n",
    )
    hallado = package_boundary.specifiers(fuente.read_text(encoding="utf-8"))
    check("cinco especificadores, no seis (el comentario no cuenta)", 5, len(hallado))
    check("el dinamico entra", True,
          any(s == "../../agent/src/tarde.ts" for _, s in hallado))
    check("el numero de linea acompana", 1, hallado[0][0])

print("\n5. El barrido publica su denominador")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    root = build_tree(base)
    write(root / "harness" / "src" / "cost.ts",
          "import { A } from '../../agent/src/models.ts'\n")
    write(root / "harness" / "src" / "clean.ts",
          "import { B } from '@thyrox/agent/models'\n")
    write(root / "harness" / "bin" / "cli.ts",
          "import { C } from '../../../config/settings/load.ts'\n")

    informe = package_boundary.scan(root)
    check("un cruce de paquete", 1, len(informe.crossings))
    check("una salida de la raiz", 1, len(informe.escapes))
    # Cuatro, no tres: el fixture escribe tambien agent/src/models.ts.
    check("cuatro archivos medidos (3 de harness + el models.ts de agent)",
          4, informe.files_measured)
    check("tres especificadores vistos", 3, informe.specifiers_seen)
    check("el cruce nombra su destino", "agent", informe.crossings[0].target)

print("\n6. Controles de anulación — retirada la causa, el veredicto CAMBIA")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    root = build_tree(base)
    cruce = write(root / "harness" / "src" / "cost.ts",
                  "import { A } from '../../agent/src/models.ts'\n")

    check("con el cruce, hay hallazgo", 1, len(package_boundary.scan(root).crossings))
    # Retirar la CAUSA: el import entra por la superficie declarada.
    cruce.write_text("import { A } from '@thyrox/agent/models'\n", encoding="utf-8")
    check("control — reescrito al nombre, el hallazgo desaparece",
          0, len(package_boundary.scan(root).crossings))

with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    root = build_tree(base)
    write(root / "harness" / "src" / "cost.ts",
          "import { A } from '../../agent/src/models.ts'\n")

    check("con dos paquetes, el cruce se ve", 1, len(package_boundary.scan(root).crossings))
    # Retirar la CAUSA de la frontera: si `agent` deja de declararse paquete,
    # el destino ya no es "otro paquete" — es una ruta interna cualquiera.
    (root / "agent" / "package.json").unlink()
    check("control — sin package.json vecino, ya no es cruce de paquete",
          0, len(package_boundary.scan(root).crossings))

print("\n7. Rehúsa nombrando cuando la raíz no es una raíz de paquetes")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    (base / "vacio").mkdir()
    try:
        package_boundary.scan(base / "vacio")
        FAIL += 1
        print("  FALLA raiz sin paquetes: no alzó nada")
    except package_boundary.PackageRootError:
        PASS += 1
        print("  ok    raiz sin paquetes rehúsa con PackageRootError")
    except Exception as err:  # noqa: BLE001 — el tipo equivocado también es fallo
        FAIL += 1
        print(f"  FALLA raiz sin paquetes: alzó {type(err).__name__}")

print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
sys.exit(1 if FAIL else 0)
