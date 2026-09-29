"""Renombra identificadores por posición de token NAME; cadenas y comentarios intactos."""
import io
import sys
import tokenize

RENAMES = {
    "src/task/task_ids.py": {
        "fila": "card_row", "layer_cita": "layer_citation", "ocupante": "occupant",
        "siguiente_task_id": "next_task_id", "sin_ordinal": "missing_ordinal",
        "tocada": "touched",
    },
    "tests/task/test_task_ids.py": {"despues": "after", "filas3": "rows3"},
    "tests/task/test_board_ordinal_identity.py": {
        "_board_con": "_board_conn", "_store_con": "_store_conn", "con": "connection",
        "ag_sin_indice": "ag_without_index", "ag_sin_ordinal": "ag_without_ordinal",
        "kx_sin_guard": "kx_without_guard", "cita_inicial": "initial_citation",
        "duplico": "duplicated", "fijado": "pinned", "filas": "rows", "filas_b": "rows_b",
        "filas_e2e": "rows_e2e", "n_filas_ord5": "n_rows_ord5", "intacta": "intact",
        "ordinal_escrito": "written_ordinal", "protegido": "protected", "tarjetas": "cards",
    },
}


def rename(path: str, mapping: dict[str, str]) -> int:
    source = open(path, encoding="utf-8").read()
    lines = source.splitlines(keepends=True)
    offsets = [0]
    for line in lines:
        offsets.append(offsets[-1] + len(line))
    edits = [
        (offsets[tok.start[0] - 1] + tok.start[1], len(tok.string), mapping[tok.string])
        for tok in tokenize.generate_tokens(io.StringIO(source).readline)
        if tok.type == tokenize.NAME and tok.string in mapping
    ]
    for start, length, new in sorted(edits, reverse=True):
        source = source[:start] + new + source[start + length:]
    open(path, "w", encoding="utf-8").write(source)
    return len(edits)


if __name__ == "__main__":
    for file_path, names in RENAMES.items():
        print(f"{file_path}: {rename(file_path, names)} token(s)")
    sys.exit(0)
