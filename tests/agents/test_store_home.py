#!/usr/bin/env python3
"""Un solo store, y es el del PROVEEDOR — el control del hogar unico.

Decision del ejecutor 2026-09-07: *«queremos que solo se llene uno, porque si
no existen los silos de informacion; el que se tiene que quedar es
`thyrox/agent-results/agent_store.sqlite3` por ser producer»*.

El silo que esto impide esta medido en :ref:`h-docs-1237`: DOS stores
versionados, los dos escribiendose, ninguno superconjunto del otro. La causa
fue que cada mitad del mecanismo resolvia la ruta por su cuenta, asi que este
control mide **la ruta que cada escritor resuelve**, no que el archivo exista.

CONTROL DE ANULACION: cada caso declara que lo haria fallar. Un control de ruta
que solo comprobara `Path.is_file()` pasaria con el silo intacto — mediria que
hay UN archivo donde mira, no que no haya OTRO.
"""

import os
import subprocess
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "src"))

from agents import agents_paths  # noqa: E402

#: El hogar decidido. Se escribe una vez aqui y los casos lo citan: si la
#: decision cambia, cambia en un sitio y los rojos dicen donde mirar.
HOGAR = RAIZ / "agent-results" / "agent_store.sqlite3"

#: El silo que se retiro. Ningun resolvedor debe devolver una ruta bajo aqui.
SILO = "kaupamex-docs"


class TestHogarUnico(unittest.TestCase):
    def test_1_la_mitad_python_resuelve_al_proveedor(self):
        """Falla si `agent_store_path` vuelve a componer la ruta del consumidor."""
        ruta = agents_paths.agent_store_path()
        self.assertEqual(ruta.resolve(), HOGAR.resolve())
        self.assertNotIn(SILO, str(ruta))

    def test_2_la_mitad_TS_resuelve_al_proveedor(self):
        """Falla si `storePath()` vuelve a caer en `docsRoot()`.

        Es el caso que importa: el escritor mayoritario es el hook TS —69 de
        las 108 filas del 2026-09-07— y era el que apuntaba al consumidor
        mientras Python ya apuntaba al proveedor.
        """
        salida = subprocess.run(
            ["bun", "-e",
             "import {storePath} from './src/packages/observability/src/store.ts';"
             "console.log(storePath())"],
            cwd=RAIZ, capture_output=True, text=True,
            env={k: v for k, v in os.environ.items()
                 if k not in ("THYROX_STORE", "THYROX_CONSUMER")},
        )
        self.assertEqual(salida.returncode, 0, salida.stderr)
        ruta = salida.stdout.strip()
        self.assertEqual(Path(ruta).resolve(), HOGAR.resolve())
        self.assertNotIn(SILO, ruta)

    def test_3_las_dos_mitades_coinciden(self):
        """Falla si divergen. Es el defecto de H-DOCS-1237 en su forma pura:
        las dos resolvian, las dos «funcionaban», y apuntaban a archivos
        distintos. Ninguna de las dos, por si sola, lo habria delatado."""
        salida = subprocess.run(
            ["bun", "-e",
             "import {storePath} from './src/packages/observability/src/store.ts';"
             "console.log(storePath())"],
            cwd=RAIZ, capture_output=True, text=True,
            env={k: v for k, v in os.environ.items()
                 if k not in ("THYROX_STORE", "THYROX_CONSUMER")},
        )
        self.assertEqual(
            Path(salida.stdout.strip()).resolve(),
            agents_paths.agent_store_path().resolve(),
        )

    def test_4_ningun_modulo_de_src_compone_la_ruta_del_STORE_en_el_silo(self):
        """Falla en cuanto alguien vuelva a componer la ruta del store del silo.

        Es el control que cierra el grifo: la fusion arregla el pasado, esto
        impide que el silo se reabra. Mide el ARBOL, no una invocacion — un
        escritor nuevo con su propia composicion no se delata al correr, se
        delata al leerlo.

        EL EJE ES EL STORE, NO EL DIRECTORIO, y esa distincion costo una
        version. La primera busco `kaupamex-docs.*agent-results` y devolvio
        TRES infractores, los tres falsos: dos comentarios que describen el
        defecto ya corregido, y un guion cuyas cadenas apuntan a
        `settings_local.base.json` —que SI es del consumidor, igual que
        `registro-de-agentes.md` y los `.base-*.json`—. Medir la cadena y
        concluir sobre la composicion es el sub-patron C de
        `metrica-decide-la-conclusion.md`, cometido dentro del control escrito
        para evitar el D.

        Lo que se mide ahora: una linea de CODIGO —no comentario— que nombre
        `agent_store.sqlite3` o `STORE_FILE` junto a una raiz de consumidor.
        """
        raices = ("kaupamex-docs", "kaupamex_docs", "DOCS_ROOT", "docsRoot")
        objetivos = ("agent_store.sqlite3", "STORE_FILE")
        infractores = []
        for f in sorted(list((RAIZ / "src").rglob("*.py")) + list((RAIZ / "src").rglob("*.ts"))):
            rel = str(f.relative_to(RAIZ))
            if "__tests__" in rel or "/tests/" in rel:
                continue
            if "packages/harness" in rel:      # se elimina; #81/#172/#224/#226
                continue
            for n, linea in enumerate(f.read_text(errors="ignore").splitlines(), 1):
                codigo = linea.split("#", 1)[0].split("//", 1)[0]
                if any(r in codigo for r in raices) and any(o in codigo for o in objetivos):
                    infractores.append("%s:%d" % (rel, n))
        self.assertEqual(infractores, [], "componen la ruta del store en el silo: %s" % infractores)

    def test_5_las_cinco_tablas_existen_en_el_hogar(self):
        """Falla si la fusion dejo el hogar incompleto. No mide CUANTAS filas
        —eso es propiedad de un artefacto vivo— sino que ninguna tabla falte:
        una tabla ausente aqui significa que su escritor sigue en otro sitio."""
        import sqlite3
        c = sqlite3.connect("file:%s?mode=ro" % HOGAR, uri=True)
        try:
            tablas = {r[0] for r in c.execute(
                "SELECT name FROM sqlite_master WHERE type='table'")}
        finally:
            c.close()
        for t in ("agent_sessions", "tasks", "documents",
                  "findings_history", "cleared_tool_results"):
            self.assertIn(t, tablas)


    def test_6_las_cinco_tablas_tienen_filas_en_el_hogar(self):
        """Falla si una tabla del hogar quedo VACIA.

        El caso 5 mide que la tabla EXISTA; este, que tenga dato. Son ejes
        distintos y el 5 solo no discrimina: una tabla creada por el DDL y
        nunca escrita pasa el 5 y significa que su escritor sigue en otro
        sitio — que es literalmente el silo, una tabla a la vez.

        No fija un minimo por tabla: el conteo es propiedad de un artefacto
        vivo (`calibration-verified-numbers.md`) y clavarlo aqui obligaria a
        editar el test en cada sesion. Lo que se afirma es `> 0`.
        """
        import sqlite3
        c = sqlite3.connect("file:%s?mode=ro" % HOGAR, uri=True)
        try:
            vacias = [t for t in ("agent_sessions", "tasks", "documents",
                                  "findings_history", "cleared_tool_results")
                      if c.execute('SELECT count(*) FROM "%s"' % t).fetchone()[0] == 0]
        finally:
            c.close()
        self.assertEqual(vacias, [], "tablas sin dato en el hogar: %s" % vacias)

    def test_7_toda_tarea_del_hogar_tiene_cita_durable(self):
        """Falla si una fila de `tasks` nace sin `citation_id`.

        Es el defecto de :ref:`h-docs-1236` en su forma medible: la cita vive en
        esta columna, y una fila sin ella no se puede citar — la prosa acaba
        citando el ordinal, que fuera de su sesion nombra otro sujeto.

        Medido al cerrarlo: 258 de 258 tarjetas del board vivo acunadas con
        `board_sync.mint_created_card`, `tasks` de 1466 a 1565 filas, 0 sin cita.
        """
        import sqlite3
        c = sqlite3.connect("file:%s?mode=ro" % HOGAR, uri=True)
        try:
            sin = c.execute(
                "SELECT count(*) FROM tasks WHERE citation_id IS NULL OR citation_id = ''"
            ).fetchone()[0]
            total = c.execute("SELECT count(*) FROM tasks").fetchone()[0]
        finally:
            c.close()
        self.assertEqual(sin, 0, "%d de %d filas de tasks sin cita durable" % (sin, total))



if __name__ == "__main__":
    unittest.main(verbosity=2)
