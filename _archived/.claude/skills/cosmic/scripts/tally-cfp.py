#!/usr/bin/env python3
"""tally-cfp.py — suma y valida CFP de una medición COSMIC en markdown.

Determinístico: evita los errores de suma manual (en ÉPICA 45 dos conteos manuales
dieron subtotales equivocados aunque los valores por-proceso eran correctos).

Convención de entrada: cada proceso funcional declara su tamaño con una línea
    - **COSMIC:** <N> CFP
y (opcionalmente) su encabezado `## UC-...` y su `Flujo principal:` con marcadores (E)/(X)/(R)/(W).

Valida los invariantes del Manual COSMIC v5.0:
  - Regla 10c: cada proceso funcional >= 2 CFP.
  - Cada proceso tiene >= 1 Entrada (E) en su flujo (si hay 'Flujo principal').
Reporta: nº de procesos, suma de CFP, y violaciones con su ubicación.

Uso:
    python3 tally-cfp.py <archivo.md> [<archivo2.md> ...]
    python3 tally-cfp.py --expect 376 methodology-ucs.md   # falla si la suma != 376

Salida: código 0 si todo OK (y suma == --expect si se dio); 1 si hay violaciones o mismatch.
"""
import sys
import re

CFP_RE = re.compile(r'COSMIC:\*\*\s*(\d+)\s*CFP', re.I)
UC_RE = re.compile(r'^##\s+(UC-[^\n]+)', re.M)


def analyze(path):
    text = open(path, encoding='utf-8').read()
    # Bloques por encabezado UC; si no hay UCs, tratar el archivo como un bloque.
    parts = re.split(r'^##\s+(UC-[^\n]+)$', text, flags=re.M)
    procs = []
    if len(parts) > 1:
        it = iter(parts[1:])
        for title, body in zip(it, it):
            m = CFP_RE.search(body)
            if not m:
                continue
            cfp = int(m.group(1))
            flow = re.search(r'Flujo principal:\*\*(.+?)(?:\n- \*\*|\Z)', body, re.S)
            has_entry = bool(flow and re.search(r'\(E\)', flow.group(1)))
            flow_present = bool(flow)
            procs.append((title.strip(), cfp, has_entry, flow_present))
    else:
        for m in CFP_RE.finditer(text):
            procs.append(("(proceso sin encabezado UC)", int(m.group(1)), True, False))
    return procs


def main():
    args = sys.argv[1:]
    expect = None
    if '--expect' in args:
        i = args.index('--expect')
        expect = int(args[i + 1])
        del args[i:i + 2]
    if not args:
        print("uso: tally-cfp.py [--expect N] <archivo.md> ...", file=sys.stderr)
        return 2

    grand_total = 0
    grand_count = 0
    violations = []
    for path in args:
        procs = analyze(path)
        subtotal = sum(c for _, c, _, _ in procs)
        grand_total += subtotal
        grand_count += len(procs)
        print(f"{path}: {len(procs)} procesos · {subtotal} CFP")
        for title, cfp, has_entry, flow_present in procs:
            if cfp < 2:
                violations.append(f"  [Regla 10c] {path} :: {title} = {cfp} CFP (< 2)")
            if flow_present and not has_entry:
                violations.append(f"  [sin Entrada] {path} :: {title} — flujo sin (E)")

    print(f"\nTOTAL: {grand_count} procesos · {grand_total} CFP")

    rc = 0
    if violations:
        print("\nVIOLACIONES DE INVARIANTES:")
        print("\n".join(violations))
        rc = 1
    if expect is not None and grand_total != expect:
        print(f"\nMISMATCH: suma {grand_total} != esperado {expect}")
        rc = 1
    if rc == 0:
        print("\n[OK] invariantes COSMIC cumplidos" + (f"; suma == {expect}" if expect is not None else ""))
    return rc


if __name__ == '__main__':
    sys.exit(main())
