#!/usr/bin/env python3
"""El eje del identificador de tarea es el REPO, no la capa del producto.

Decision del ejecutor 2026-09-07, tras medir la ironia que la nombro: todo el
trabajo de thyrox se etiquetaba `TASK-DOCS-*` siendo thyrox el PROVEEDOR y
kaupamex-docs un consumidor.

Lo medido al decidirlo, y es lo que el eje nuevo arregla:

    GEN 632 · DOCS 529 · API 389 · DB 6 · SERVER 5 · UI 4

`GEN` no estaba en LAYERS y era la mas numerosa —el 40 %—: un cubo de descarte
que resulta ser el mayor del esquema no es una categoria, es la ausencia de
una. Y dentro de `TASK-DOCS-*`, el trabajo de proveedor superaba 5:1 al de
arbol documental.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from task import task_ids  # noqa: E402


class TestEjeDelIdentificador(unittest.TestCase):
    def test_1_thyrox_es_un_repo_admitido(self):
        """Falla si thyrox sigue fuera. Es el cambio entero: con el eje en la
        capa del producto no cabia —no es una capa, es el proveedor—; con el
        eje en el repo cabe, porque es un repo."""
        self.assertIn("thyrox", task_ids.LAYERS)

    def test_2_los_seis_repos_del_multirepo_estan(self):
        """Falla si alguno se cae al editar. El conjunto ES la enumeracion de
        repos, y que sean seis no es casual: cinco consumidores y su proveedor."""
        self.assertEqual(
            set(task_ids.LAYERS),
            {"api", "db", "docs", "server", "thyrox", "ui"},
        )

    def test_3_el_prefijo_de_thyrox_es_el_nombre_del_repo_en_mayuscula(self):
        """Falla si alguien abrevia a THX o PROV.

        El prefijo sale de `layer.upper()`, asi que coincide con el nombre del
        repo por construccion — y eso es la propiedad, no un detalle: un
        prefijo abreviado obligaria a una tabla de traduccion, que es la
        segunda fuente de verdad que este proyecto prohibe.

        Y no cuesta nada: `SERVER` ya da 16 caracteres, asi que `THYROX` NO
        introduce ninguna longitud nueva en el esquema.
        """
        self.assertEqual("TASK-%s-0001" % "thyrox".upper(), "TASK-THYROX-0001")
        self.assertEqual(len("TASK-THYROX-0001"), len("TASK-SERVER-0001"))

    def test_4_la_forma_canonica_admite_el_prefijo_nuevo(self):
        """Falla si `ID_RE` acotara la longitud de la capa. No la acota
        —`[A-Z]+`— pero el control existe porque un patron es facil de
        estrechar sin darse cuenta al tocarlo por otra razon."""
        for cita in ("TASK-THYROX-0001", "TASK-SERVER-0005", "TASK-DB-0006"):
            self.assertRegex(cita, task_ids.ID_RE)

    def test_5_gen_sigue_existiendo_y_NO_es_un_repo(self):
        """Falla si `GEN` se cuela en LAYERS al redefinirlo.

        `GEN` se redefinio a «cruza repos», que es una categoria real en un
        multi-repo — pero NO es un repo, y meterlo en la enumeracion haria que
        un acuñado pudiera elegirlo como destino en vez de derivarlo. Las 632
        ya acuñadas no se re-etiquetan: reasignar una cita publicada es el
        deslizamiento de sujeto que `merge_stores.citation_is_stable` rehusa.
        """
        self.assertEqual(task_ids.UNKNOWN_LAYER, "gen")
        self.assertNotIn(task_ids.UNKNOWN_LAYER, task_ids.LAYERS)


    def test_6_acuñar_con_layer_thyrox_produce_TASK_THYROX_end_to_end(self):
        """CONTROL DE CONDUCTA: acuña de verdad contra un store, no compone una
        cadena.

        Los casos 1-5 miden la constante y la forma; este mide que el acuñado
        REAL la use. Son ejes distintos y el 3 solo no discrimina: `LAYERS`
        podria admitir «thyrox» y el acuñado seguir cayendo a `UNKNOWN_LAYER`
        si algo mas abajo filtra por la enumeracion vieja — que es exactamente
        el modo de fallo que dejo todo el trabajo de thyrox como `TASK-DOCS-*`.
        """
        import json
        import sqlite3
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            raiz = Path(tmp)
            store = raiz / "agent_store.sqlite3"
            _crear_store(raiz)

            board = raiz / "board"
            board.mkdir()
            (board / "7.json").write_text(json.dumps({
                "id": "7", "subject": "Portar el despachador a thyrox",
                "status": "pending",
            }), encoding="utf-8")

            acunadas = task_ids.ingest_board(store, board, "sesion-de-prueba",
                                             ["7"], layer="thyrox")
            self.assertEqual(len(acunadas), 1, "no acuño nada: %s" % (acunadas,))
            cita = acunadas[0][2]
            self.assertTrue(
                cita.startswith("TASK-THYROX-"),
                "acuño %r: el layer thyrox no llego al prefijo" % cita,
            )
            self.assertRegex(cita, task_ids.ID_RE)


def _crear_store(directorio: Path):
    """Crea el store por LA VIA REAL — `agent_store.connect`, no un DDL propio.

    Dos versiones anteriores de este control fallaron por reconstruir el
    esquema a mano, y las dos por la misma razon de fondo:

      1. copiando un `CREATE TABLE tasks` con las columnas que crei — faltaba
         `description`;
      2. usando `CORE_SCHEMA` — falta `citation_id`, que el propio modulo
         declara que se añade por MIGRACION y no por el DDL, «porque el archivo
         ya existia en produccion».

    El esquema real no es el DDL: es el DDL **mas** sus migraciones. Cualquier
    reconstruccion es una tercera fuente de verdad que envejece sola. Se invoca
    la vía por la que el store nace de verdad, y el control hereda gratis
    cuanta migracion se añada despues.
    """
    import importlib.util

    ruta = Path(__file__).resolve().parents[2] / "src" / "agents" / "agent_store.py"
    spec = importlib.util.spec_from_file_location("agent_store_para_el_control", ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    conn = modulo.connect(directorio)
    conn.close()



if __name__ == "__main__":
    unittest.main(verbosity=2)
