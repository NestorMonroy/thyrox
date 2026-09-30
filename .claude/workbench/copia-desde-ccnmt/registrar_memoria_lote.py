#!/usr/bin/env python3
"""Paso 3b del plan v2.2.0 para un lote de copias: la entrada de memoria.

Un lote de `source_copy_step.py` aplica un mismo arreglo a muchos archivos
—copiar el archivo de la fuente sobre el que se desvió— y eso es el paso 4 del
plan. Pero hasta el lote 05 no dejaba entrada en la memoria del lazo
(`patterns.jsonl`): sólo en `copy-ledger.jsonl`, que no tiene los 4 campos y
que el lazo no lee. Este guion la escribe o la amplía:

  patron         file-diverged-from-source
  señal          diagnósticos en los archivos donde el arreglo ya se aplicó
  fix_generico   copiar el archivo de ccnmt con el alias reescrito, quedándose
                 sólo con lo que no trae diagnósticos nuevos ni rompe pruebas
  aplicados      la unión de los copiados de todos los lotes

y publica, como evidencia, cuántos diagnósticos del «antes» desaparecieron: en
total y en los archivos del lote. Las dos cifras hacen falta — medido en los
lotes 01 a 04, casi todo lo que bajó estaba en los CONSUMIDORES de lo copiado,
no en lo copiado, y una sola cifra por archivo habría dicho que no bajaba nada. `cerrar_lote.sh` se niega a cerrar un lote cuyos
copiados no estén en `applied`: es el gate del paso 3b.

Uso: registrar_memoria_lote.py <run> <banco-del-lote> <log-antes> <log-despues>
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "src"))
from verify.batch_verification import _new_diagnostics  # noqa: E402
from verify.tsc_sweep import add_pattern, load_patterns, mark_applied  # noqa: E402

NAME = "file-diverged-from-source"
FIX = ("Un archivo cuyo codigo se desvio del de ccnmt y que nadie toco despues de "
       "llegar se sobrescribe con el de la fuente, con el alias reescrito "
       "(src/verify/source_copy_step.py). Se queda solo si no trae diagnosticos "
       "nuevos a su archivo ni a sus consumidores, y si las pruebas que lo "
       "importan siguen en verde frente a HEAD (pruebas_de_lote.sh).")


def main(run: Path, bench: Path, before: Path, after: Path) -> int:
    copied = [f"src/packages/{line}" for line in (bench / "copiados.txt").read_text().split()]
    if not copied:
        print("registrar_memoria_lote: el lote no copio nada; no hay memoria que escribir")
        return 0
    removed, _ = _new_diagnostics(after.read_text().splitlines(), before.read_text().splitlines())
    in_batch = [k for k in removed if k.split(": ", 1)[0] in set(copied)]
    applied = set(load_patterns(run).get(NAME, {}).get("applied", [])) | set(copied)
    signal = r"^(?:" + "|".join(sorted(re.escape(f) for f in applied)) + r"): TS\d+: "
    add_pattern(run, {"name": NAME, "signal": signal, "fix": FIX})
    mark_applied(run, NAME, copied)
    print(f"memoria {NAME}: {len(copied)} archivo(s) del lote, {len(applied)} en total; "
          f"el lote quito {len(removed)} diagnostico(s) en total, {len(in_batch)} en sus propios archivos "
          f"(el resto, en consumidores)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(*map(Path, sys.argv[1:5])))
