#!/usr/bin/env python3
"""Control de paridad entre las dos mitades del hogar de reglas.

Qué haría fallar a este control (sub-patrón D): cambiar `RULES_DIR_VAR` o
`RULES_SEGMENT` en una mitad y no en la otra. Ese par es UNA declaración
partida en dos lenguajes, y su deriva es SILENCIOSA — las dos mitades seguirían
corriendo, cada una resolviendo un hogar distinto, y el emisor escribiría donde
el registro de `declarations.py` no mira.

No se comprueba «las dos constantes existen»: eso pasaría igual con valores
distintos. Se comprueba que sean IGUALES, que es lo que la paridad afirma.

Ciega a: la deriva de `defaultRulesDir`/`default_rules_dir`, cuyo cuerpo no se
compara — sólo sus dos insumos declarados. Un cambio de composición en una sola
mitad no lo ve este control.
"""
from __future__ import annotations

import os
import pathlib
import re
import sys
import unittest
from pathlib import Path

# Bootstrap canónico (`paths.reach.BOOTSTRAP`): ascenso con detección hasta
# el marcador, NO `parents[N]`. Un offset acierta a UNA profundidad y falla en
# silencio al mover el archivo; el ascenso sobrevive el cambio de anidamiento.
# Es el único punto donde `paths.reach` todavía no se puede importar — de ahí
# en adelante la raíz sale de `reach.thyrox_root()`, no de más aritmética.
_AQUI = Path(__file__).resolve()
_RAIZ = next((p for p in _AQUI.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _RAIZ is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))

from paths import reach  # noqa: E402
from rules import paths as rules  # noqa: E402

THYROX = reach.thyrox_root()
TS = THYROX / "src" / "rules" / "paths.ts"

#: Las constantes que las dos mitades declaran, y su lector en el lado TS.
#: Se leen del FUENTE y no de un `bun -e` a propósito: el control no debe
#: exigir que el otro toolchain esté instalado para poder emitir veredicto.
PATRON = r"export const {name} = '([^']*)'"


def literal_ts(name: str) -> str:
    fuente = TS.read_text(encoding="utf-8")
    hallado = re.search(PATRON.format(name=name), fuente)
    if hallado is None:
        raise AssertionError(
            f"{TS} no declara `export const {name} = '...'`. El control REHÚSA "
            f"en vez de dar por buena la paridad: un veredicto verde aquí no "
            f"distinguiría «coinciden» de «no pude leer una de las dos»."
        )
    return hallado.group(1)


class RulesPathsParity(unittest.TestCase):
    def test_la_variable_de_entorno_es_la_misma(self):
        self.assertEqual(rules.RULES_DIR_VAR, literal_ts("RULES_DIR_VAR"))

    def test_el_segmento_es_el_mismo(self):
        self.assertEqual(rules.RULES_SEGMENT, literal_ts("RULES_SEGMENT"))

    def test_el_segmento_de_estado_no_se_escribe_en_ninguna_mitad(self):
        """DEC-01: el tramo `.claude` lo declara `stateDir`, no esta familia.

        Componerlo a mano en cualquiera de las dos mitades sería la segunda
        fuente de verdad de la partición producto/estado.
        """
        for mitad in (TS, THYROX / "src" / "rules" / "paths.py"):
            cuerpo = "\n".join(
                l for l in mitad.read_text(encoding="utf-8").splitlines()
                if not l.lstrip().startswith(("*", "#", "//"))
            )
            self.assertNotIn("'.claude'", cuerpo, f"{mitad} compone el tramo a mano")
            self.assertNotIn('".claude"', cuerpo, f"{mitad} compone el tramo a mano")

    def test_la_clave_por_clon_es_la_misma(self):
        self.assertEqual(rules.RULES_CLONE_PREFIX, literal_ts("RULES_CLONE_PREFIX"))

    def test_las_dos_mitades_componen_igual_el_nombre_por_clon(self):
        """La gramática del nombre, no sólo su prefijo.

        Dos familias con dos gramaticas obligarian a quien declara a recordar
        cual es cual; y una sola familia con dos gramaticas —una por lenguaje—
        hace que la mitad TS lea una clave que la mitad Python nunca escribe.
        """
        fuente = TS.read_text(encoding="utf-8")
        self.assertIn("toUpperCase().replace(/-/g, '_')", fuente,
                      "la mitad TS dejó de componer como `rules_home_name`")
        self.assertEqual(rules.rules_home_name("mi-clon"), "THYROX_RULES_MI_CLON")

    def test_declarar_un_clon_no_mueve_a_los_demas(self):
        """El control que faltaba, y el defecto que ya ocurrió.

        Qué lo haría fallar: que el hogar se resuelva por una clave GLOBAL. Con
        `THYROX_RULES_DIR` como única entrada, declarar el hogar de un clon le
        daba a los otros cuatro **ese mismo hogar** — medido, las cinco filas de
        `declarations.py` imprimían la misma ruta y ninguna avisaba.

        No se comprueba «el declarado cambia»: eso pasaría igual con la clave
        global. Se comprueba que los OTROS no se muevan, que es lo que la
        familia por clon afirma.
        """
        roots = reach.roots()
        objetivo = "db" if "db" in roots else sorted(roots)[0]
        antes = {r: rules.consumer_rules_dir(p) for r, p in roots.items()}

        clave = rules.rules_home_name(objetivo)
        previo = os.environ.get(clave)
        os.environ[clave] = "/tmp/hogar-de-un-solo-clon"
        try:
            despues = {r: rules.consumer_rules_dir(p) for r, p in roots.items()}
        finally:
            if previo is None:
                del os.environ[clave]
            else:
                os.environ[clave] = previo

        movidos = {r for r in antes if antes[r] != despues[r]}
        self.assertEqual(movidos, {objetivo},
                         f"declarar {clave} movió {movidos}, no sólo {objetivo}")

    def test_la_clave_de_familia_como_segmento_relativo_no_colisiona(self):
        """La clave de FAMILIA con un segmento relativo dice lo correcto para todos.

        Qué lo haría fallar: que el valor declarado se devuelva crudo, sin
        pasar por `resolve_home`. Entonces `THYROX_RULES_DIR` sólo puede llevar
        una ruta absoluta, y una absoluta le da a los cinco clones **el hogar
        de uno** — que es el defecto medido: las cinco filas de
        `declarations.py` imprimían la ruta de `db`.

        Como segmento, la MISMA cadena compone un hogar distinto por clon,
        cada uno dentro de su propia raíz.
        """
        roots = reach.roots()
        previo = os.environ.get(rules.RULES_DIR_VAR)
        os.environ[rules.RULES_DIR_VAR] = "reglas-declaradas"
        try:
            hogares = {r: rules.consumer_rules_dir(p) for r, p in roots.items()}
        finally:
            if previo is None:
                del os.environ[rules.RULES_DIR_VAR]
            else:
                os.environ[rules.RULES_DIR_VAR] = previo

        self.assertEqual(len(set(hogares.values())), len(roots),
                         f"la clave de familia colapsó los hogares: {hogares}")
        for repo, home in hogares.items():
            self.assertEqual(home, pathlib.Path(roots[repo]) / "reglas-declaradas")

    def test_la_clave_de_familia_absoluta_SI_colisiona(self):
        """Y es correcto que lo haga — el control que impide sobre-afirmar.

        Sin este caso, el anterior se leería como «la clave de familia nunca
        colisiona», que es falso. Quien escribe una ruta absoluta está nombrando
        un sitio concreto, no un patrón; la resolución respeta esa intención en
        vez de reinterpretarla.
        """
        roots = reach.roots()
        previo = os.environ.get(rules.RULES_DIR_VAR)
        os.environ[rules.RULES_DIR_VAR] = "/srv/reglas-de-uno"
        try:
            hogares = {r: rules.consumer_rules_dir(p) for r, p in roots.items()}
        finally:
            if previo is None:
                del os.environ[rules.RULES_DIR_VAR]
            else:
                os.environ[rules.RULES_DIR_VAR] = previo

        self.assertEqual(set(hogares.values()), {pathlib.Path("/srv/reglas-de-uno")})

    def test_la_familia_sigue_siendo_el_ultimo_recurso(self):
        """Sin clave por clon, la de familia manda — y eso NO es el defecto.

        Declarar una ruta para todos es una decisión legítima del consumidor.
        Lo que la familia por clon cierra es que sea la ÚNICA forma de decirlo.
        """
        previo = os.environ.get(rules.RULES_DIR_VAR)
        os.environ[rules.RULES_DIR_VAR] = "/tmp/para-todos"
        try:
            for repo, root in reach.roots().items():
                with self.subTest(repo=repo):
                    self.assertEqual(str(rules.consumer_rules_dir(root)),
                                     "/tmp/para-todos")
        finally:
            if previo is None:
                del os.environ[rules.RULES_DIR_VAR]
            else:
                os.environ[rules.RULES_DIR_VAR] = previo

    def test_el_hogar_del_consumidor_cae_dentro_del_consumidor(self):
        """El defecto de #286: resolver el hogar del consumidor DENTRO del proveedor."""
        for repo, root in reach.roots().items():
            with self.subTest(repo=repo):
                self.assertTrue(
                    str(rules.consumer_rules_dir(root)).startswith(str(root)),
                    f"{repo}: el hogar cae fuera de su propia raíz",
                )


if __name__ == "__main__":
    unittest.main()
