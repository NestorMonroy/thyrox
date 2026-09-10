#!/usr/bin/env python3
"""Gate: el aislamiento que un agente DECLARA y el que ANUNCIA tienen que coincidir.

Qué mide
--------
Un agente declara `isolation: worktree` en su frontmatter, y su `description`
—la que lee quien lo despacha— puede anunciarlo o callarlo. Cuando los dos
signos discrepan, alguien opera bajo una premisa falsa:

  declara y NO anuncia  → quien lo despacha no sabe que la salida del agente
                          aterriza en `.claude/worktrees/agent-<id>/` y exige un
                          pase de consolidacion. Es el defecto de H-DOCS-311.
  anuncia y NO declara  → promesa vacia: la description afirma un aislamiento
                          que el frontmatter ya no pide.

Qué NO mide
-----------
Si el aislamiento esta JUSTIFICADO. Ese criterio es de juicio y vive en
`.claude/references/coordinator-integration.md`: hacen falta las dos
condiciones que el tool `Agent` exige —mutar en paralelo Y chocar sin
aislamiento—. El gate acota el universo; la eleccion la hace quien escribe.

Uso
---
    python3 .claude/scripts/gates/check_agent_isolation.py            # reporte
    python3 .claude/scripts/gates/check_agent_isolation.py --strict   # exit 1 si hay
    python3 .claude/scripts/gates/check_agent_isolation.py --dir RUTA # otro arbol
"""
import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "paths"))
import reach  # noqa: E402

# --- constantes de forma -----------------------------------------------------
DIR_AGENTES = pathlib.Path(".claude") / "agents"
EXTENSION_AGENTE = "*.md"
DELIMITADOR_FRONTMATTER = "---"

# La description puede anunciar el aislamiento de varias formas; se aceptan las
# que el arbol uso de hecho, no una gramatica inventada.
ANUNCIA = re.compile(r"worktree\s+aislad|aislad\w*\s+en\s+worktree|isolated\s+worktree",
                     re.IGNORECASE)
DECLARA = re.compile(r"^isolation:\s*worktree\s*$", re.MULTILINE)
CLAVE_DESCRIPTION = re.compile(r"^description:\s*(.*)$", re.MULTILINE)

FALTA_ANUNCIO = "declara y NO anuncia"
FALTA_DECLARACION = "anuncia y NO declara"


def frontmatter(texto):
    """El bloque entre los dos `---` de apertura. Vacio si no hay frontmatter."""
    if not texto.startswith(DELIMITADOR_FRONTMATTER):
        return ""
    inicio = len(DELIMITADOR_FRONTMATTER)
    cierre = texto.find("\n" + DELIMITADOR_FRONTMATTER, inicio)
    return texto[:cierre] if cierre != -1 else texto


def describe(bloque):
    """El valor de `description:` dentro del frontmatter, o cadena vacia."""
    m = CLAVE_DESCRIPTION.search(bloque)
    return m.group(1) if m else ""


def revisar(directorios):
    """Devuelve (medidos, declaran, incoherentes) sobre los .md de cada dir."""
    medidos, declaran, incoherentes = 0, [], []
    for d in directorios:
        raiz = pathlib.Path(d)
        if not raiz.is_dir():
            continue
        for archivo in sorted(raiz.glob(EXTENSION_AGENTE)):
            texto = archivo.read_text(encoding="utf-8", errors="replace")
            bloque = frontmatter(texto)
            if not bloque:
                continue
            medidos += 1
            declarado = bool(DECLARA.search(bloque))
            anunciado = bool(ANUNCIA.search(describe(bloque)))
            if declarado:
                declaran.append(archivo)
            if declarado != anunciado:
                incoherentes.append(
                    (archivo, FALTA_ANUNCIO if declarado else FALTA_DECLARACION))
    return medidos, declaran, incoherentes


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dir", action="append", default=None,
                   help=f"directorio de agentes (repetible); default {DIR_AGENTES}")
    p.add_argument("--strict", action="store_true", help="exit 1 si hay incoherentes")
    p.add_argument("--quiet", action="store_true", help="solo el conteo")
    args = p.parse_args(argv)

    # El consumidor, no el proveedor: los agentes que se miden son los suyos.
    raiz = reach.consumer_root()
    directorios = args.dir or [str(raiz / DIR_AGENTES)]
    medidos, declaran, incoherentes = revisar(directorios)

    if args.quiet:
        print(len(incoherentes))
    elif incoherentes:
        print(f"check-agent-isolation: {len(incoherentes)} agente(s) con "
              f"aislamiento incoherente:")
        for archivo, falta in incoherentes:
            print(f"  {archivo.name}: {falta}")
        print()
        print("Los dos signos tienen que coincidir. Si el aislamiento es correcto,")
        print("anunciarlo en la description Y asumir el pase de consolidacion que")
        print("`coordinator-integration.md` describe; si no lo es, retirar ambos.")
    else:
        print(f"check-agent-isolation: OK — 0 incoherentes, "
              f"{len(declaran)} declaran aislamiento")
        print(f"  (alcance medido: {medidos} agente(s) con frontmatter en "
              f"{len(directorios)} directorio(s))")

    return 1 if (args.strict and incoherentes) else 0


if __name__ == "__main__":
    sys.exit(main())
