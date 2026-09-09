#!/usr/bin/env python3
"""Un nombre diferido por PEP 562 no se lee DESNUDO en su propio modulo.

El defecto que cierra es de esta sesion y es mio (ERR-065). Al bajar el rehuse
del proveedor a `reach.consumer_root` (TASK-DOCS-0286), cinco modulos reventaban
al IMPORTAR porque ligaban su raiz a nivel de modulo. Los diferi con el
`__getattr__` de PEP 562 —la misma solucion que `reach.py` ya usa para
`REACH_ROOTS`— y con eso introduje una segunda averia, mas silenciosa:

    `__getattr__` resuelve el acceso por ATRIBUTO del modulo (`modulo.NOMBRE`).
    NO resuelve el nombre DESNUDO dentro de una funcion del propio modulo.

Asi que `RAIZ` diferido y leido como `RAIZ` dentro de `main()` es un
`NameError` en tiempo de EJECUCION, no de import. El import pasa, el modulo
carga, y el fallo aparece cuando alguien invoca la funcion — que fue como se
descubrio: el `pre-commit` de kaupamex-docs murio con
`NameError: name 'RAIZ' is not defined` sobre `check_rst_convenciones.py:228`.

Poblacion medida ANTES del arreglo, con este mismo recorrido:

    src/corpus/census_scripts.py             ROOT, CATALOGUE, BASELINE
    src/verify/check_rst_convenciones.py     RAIZ                (3 usos)
    src/verify/check_cifra_de_artefacto_vivo.py  RAIZ_DEFECTO    (1 uso)
    src/session/clone_bootstrap.py           CONSUMER_ROOT, PAYLOAD,
                                             REPO_SETTINGS, SYNC_MODULE

**Que lo hace un control y no un adorno.** Falla, y ya fallo: sobre el arbol de
antes del arreglo marca los cuatro modulos. La anulacion es de un solo eje —
devolver UNA lectura desnuda a cualquiera de ellos— y el caso cae.

Metrica: nombres que el `__getattr__` de un modulo resuelve, leidos como
`ast.Name` en carga dentro de una funcion o clase del MISMO modulo.
Ciega a: la lectura desnuda que ocurra en un `exec`/`eval` o via `globals()`,
que el AST no ve; y al modulo que difiera sin `__getattr__`, que no es PEP 562.
"""
import ast
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve()
while ROOT != ROOT.parent and not (ROOT / "src/paths/reach.py").is_file():
    ROOT = ROOT.parent


def deferred_names(tree: ast.Module) -> set[str]:
    """Los nombres que el `__getattr__` del modulo resuelve, si lo tiene."""
    for node in tree.body:
        if not (isinstance(node, ast.FunctionDef) and node.name == "__getattr__"):
            continue
        names: set[str] = set()
        for child in ast.walk(node):
            # `if name == 'X'` y `if name in ('X', 'Y')`
            if isinstance(child, ast.Compare) and isinstance(child.left, ast.Name) \
                    and child.left.id == "name":
                for other in child.comparators:
                    if isinstance(other, ast.Constant) and isinstance(other.value, str):
                        names.add(other.value)
                    elif isinstance(other, (ast.Tuple, ast.List, ast.Set)):
                        names.update(e.value for e in other.elts
                                     if isinstance(e, ast.Constant)
                                     and isinstance(e.value, str))
                    elif isinstance(other, ast.Name):
                        # `if name in _DERIVED`: las claves de la tabla nombrada
                        names.update(_table_keys(tree, other.id))
        return names
    return set()


def _table_keys(tree: ast.Module, table: str) -> set[str]:
    """Las claves literales de un dict de modulo, por su nombre."""
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == table \
                    and isinstance(node.value, ast.Dict):
                return {k.value for k in node.value.keys
                        if isinstance(k, ast.Constant) and isinstance(k.value, str)}
    return set()


def bare_reads(path: pathlib.Path) -> list[tuple[str, int]]:
    """Lecturas desnudas de un nombre diferido, dentro de funcion o clase."""
    try:
        tree = ast.parse(path.read_text(encoding="utf8"))
    except (SyntaxError, UnicodeDecodeError):
        return []
    deferred = deferred_names(tree)
    if not deferred:
        return []
    found: list[tuple[str, int]] = []
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == "__getattr__":
            continue  # su cuerpo es el resolvedor, no un consumidor
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        for child in ast.walk(node):
            if isinstance(child, ast.Name) and isinstance(child.ctx, ast.Load) \
                    and child.id in deferred:
                found.append((child.id, child.lineno))
    return found


class TestDeferredNamesNotUsedBare(unittest.TestCase):
    def test_1_ningun_modulo_lee_desnudo_lo_que_difiere(self):
        offenders = {}
        measured = 0
        for path in sorted((ROOT / "src").rglob("*.py")):
            measured += 1
            bare = bare_reads(path)
            if bare:
                offenders[str(path.relative_to(ROOT))] = bare
        self.assertEqual(
            offenders, {},
            f"lecturas desnudas de nombres diferidos (alcance medido: "
            f"{measured} archivos bajo src/): {offenders}")

    def test_2_el_recorrido_ve_el_defecto_cuando_existe(self):
        """El control positivo: sin esto, el caso 1 pasaria por no mirar nada."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            mal = pathlib.Path(tmp) / "mal.py"
            mal.write_text(
                "def __getattr__(name):\n"
                "    if name == 'RAIZ':\n"
                "        return 1\n"
                "    raise AttributeError(name)\n"
                "\n"
                "def usa():\n"
                "    return RAIZ\n",
                encoding="utf8")
            self.assertEqual(bare_reads(mal), [("RAIZ", 7)])

    def test_3_el_acceso_por_atributo_no_es_defecto(self):
        """`modulo.RAIZ` desde fuera SI lo resuelve PEP 562: no se marca."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            bien = pathlib.Path(tmp) / "bien.py"
            bien.write_text(
                "def raiz():\n    return 1\n"
                "\n"
                "def __getattr__(name):\n"
                "    if name == 'RAIZ':\n"
                "        return raiz()\n"
                "    raise AttributeError(name)\n"
                "\n"
                "def usa():\n"
                "    return raiz()\n",
                encoding="utf8")
            self.assertEqual(bare_reads(bien), [])


if __name__ == "__main__":
    sys.exit(0 if unittest.main(exit=False, verbosity=2).result.wasSuccessful() else 1)
