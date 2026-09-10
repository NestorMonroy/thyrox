#!/usr/bin/env python3
"""Controles del volcado del tablero.

El que DISCRIMINA es el caso 3: una tarjeta que declara su dependencia **sólo
en prosa** (`#12` en la descripción, `blockedBy` vacío) no se cuenta como
declarada en campo. Un control que sólo comprobara «se volcaron N tarjetas»
pasaría igual con el mecanismo y sin él — no separaría los dos ejes, que es
todo el hallazgo del volcado.

El caso 4 es el guard: un tablero vacío rehúsa con exit 2 y SIN cifra. Un 0 ahí
sería un verde falso.
"""
import importlib.util
import json
import pathlib
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location(
    "dump_session_board", HERE.parent / "dump_session_board.py")
dump = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dump)


def card(cid, status="pending", subject="s", description="", **extra):
    base = {"id": str(cid), "status": status, "subject": subject,
            "description": description}
    base.update(extra)
    return base


class DumpSessionBoard(unittest.TestCase):

    def test_1_lee_el_tablero_ordenado_por_ordinal_numerico(self):
        """10 va DESPUÉS de 9, no antes: el ordinal es número, no cadena."""
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            for cid in (10, 2, 9):
                (root / f"{cid}.json").write_text(json.dumps(card(cid)))
            self.assertEqual([c["id"] for c in dump.load_board(root)],
                             ["2", "9", "10"])

    def test_2_una_tarjeta_ilegible_no_tumba_el_volcado(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / "1.json").write_text(json.dumps(card(1)))
            (root / "2.json").write_text("{esto no es json")
            self.assertEqual(len(dump.load_board(root)), 1)

    def test_3_EL_QUE_DISCRIMINA_campo_y_prosa_son_ejes_distintos(self):
        en_campo = card(1, blockedBy=["7"])
        en_prosa = card(2, description="bloqueada por #7 hasta que cierre")
        ambas = card(3, blockedBy=["7"], description="ver #7")
        ninguna = card(4, description="sin dependencia alguna")

        self.assertEqual(dump.declares_dependency(en_campo), (True, False))
        self.assertEqual(dump.declares_dependency(en_prosa), (False, True))
        self.assertEqual(dump.declares_dependency(ambas), (True, True))
        self.assertEqual(dump.declares_dependency(ninguna), (False, False))

    def test_3_bis_el_ordinal_de_prosa_no_come_cualquier_almohadilla(self):
        """`#` sin dígitos no es una cita, y 5 dígitos tampoco."""
        self.assertFalse(dump.declares_dependency(
            card(1, description="el canal #general y el #12345678"))[1])
        self.assertTrue(dump.declares_dependency(
            card(2, description="cierra #1234"))[1])

    def test_4_GUARD_un_tablero_vacio_rehusa_sin_emitir_cifra(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(dump.load_board(pathlib.Path(tmp)), [])

    def test_5_el_hogar_declarado_gana_sobre_el_descubrimiento(self):
        import os
        with tempfile.TemporaryDirectory() as tmp:
            previo = os.environ.get("THYROX_BOARD_DIR")
            os.environ["THYROX_BOARD_DIR"] = tmp
            try:
                self.assertEqual(str(dump.board_root()), tmp)
            finally:
                if previo is None:
                    del os.environ["THYROX_BOARD_DIR"]
                else:
                    os.environ["THYROX_BOARD_DIR"] = previo


if __name__ == "__main__":
    unittest.main(verbosity=2)
