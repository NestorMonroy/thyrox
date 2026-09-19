#!/usr/bin/env python3
"""Separa la ausencia declarada de la decision de diseno, y mide si la
ausencia sigue siendo cierta.

Un puerto declara sus divergencias en comentarios. Algunas dicen «esto no
esta en este arbol», y esa afirmacion CADUCA en cuanto el hermano que
nombra aterriza: el comentario sigue ahi, el codigo sigue con su
reimplementacion local, y nadie se entera. Otras declaran una decision de
diseno, que no caduca. Colapsar las dos bajo la etiqueta «DIVERGENCIA
DECLARADA» es medir un rotulo y concluir sobre dos fenomenos.

Metrica: bloques de comentario que llevan el rotulo, clasificados por la
  FORMA de su razon, y -- solo para los de ausencia -- la resolucion del
  referente que nombran contra el arbol de hoy.
Ciega a: una ausencia declarada en prosa que no nombre su referente entre
  acentos graves (se reporta INDECIDIBLE, no como vigente); y a que el
  referente resuelva por un camino que este modulo no conoce -- mide
  hermano de workspace, node_modules y simbolo exportado, nada mas.
"""

from __future__ import annotations

import enum
import json
import pathlib
import re
import sys

MARKER = "DIVERGENCIA DECLARADA"

# La razon declara una AUSENCIA: es la unica forma que caduca sola.
ABSENCE_PATTERNS = (
    r"no est[aá] en este [aá]rbol",
    r"ausente de este [aá]rbol",
    r"no existe en este [aá]rbol",
    r"ausente en este [aá]rbol",
)

# La razon declara una DECISION: no caduca porque el arbol crezca.
DESIGN_PATTERNS = (
    r"por dise[nñ]o",
    r"\bPAR[AÁ]METRO\b",
    r"es dominio del consumidor",
    r"COLISI[OÓ]N",
)


class Verdict(enum.Enum):
    """Que clase de razon declara el bloque."""

    ABSENCE = "ausencia"
    DESIGN = "diseno"
    NONE = "ninguna"


def classify_block(text: str) -> Verdict:
    """La clase de la razon. «ninguna» gana, luego diseno, luego ausencia.

    El orden importa: un bloque que dice «BLOQUEADO por diseno» y ademas
    menciona una ausencia es una decision, no una afirmacion que caduque.
    """
    limpio = text.strip().lower()
    if re.match(r"^ninguna\b", limpio):
        return Verdict.NONE
    for patron in DESIGN_PATTERNS:
        if re.search(patron, text, re.I):
            return Verdict.DESIGN
    for patron in ABSENCE_PATTERNS:
        if re.search(patron, text, re.I):
            return Verdict.ABSENCE
    return Verdict.DESIGN


def extract_referent(text: str) -> str | None:
    """El referente que la ausencia nombra: el acento grave mas cercano
    ANTES de la frase de ausencia.

    Devuelve `None` cuando no hay ninguno, en vez de inventar uno: sin
    referente el bloque es INDECIDIBLE, que no es lo mismo que vigente.
    """
    plano = " ".join(text.split())
    posicion = None
    for patron in ABSENCE_PATTERNS:
        m = re.search(patron, plano, re.I)
        if m and (posicion is None or m.start() < posicion):
            posicion = m.start()
    if posicion is None:
        return None
    anteriores = [m for m in re.finditer(r"`([^`]+)`", plano) if m.end() <= posicion]
    return anteriores[-1].group(1) if anteriores else None


def extract_referents(text: str) -> list[str]:
    """TODOS los referentes que la ausencia puede nombrar, del mas cercano
    al mas lejano.

    El mas cercano no siempre es el sujeto: «`Progress` vive en
    `tool-registry`, ausente de este arbol» nombra el CONTENEDOR ultimo y el
    SIMBOLO antes. La afirmacion caduca si CUALQUIERA de los dos resuelve.
    """
    plano = " ".join(text.split())
    posicion = None
    for patron in ABSENCE_PATTERNS:
        m = re.search(patron, plano, re.I)
        if m and (posicion is None or m.start() < posicion):
            posicion = m.start()
    if posicion is None:
        return []
    return [
        m.group(1)
        for m in re.finditer(r"`([^`]+)`", plano)
        if m.end() <= posicion
    ][::-1]


def _workspace_packages(root: pathlib.Path) -> dict[str, pathlib.Path]:
    """Los hermanos de workspace, por el nombre que su manifiesto declara."""
    manifiesto = root / "package.json"
    if not manifiesto.is_file():
        return {}
    fuera: dict[str, pathlib.Path] = {}
    for patron in json.loads(manifiesto.read_text()).get("workspaces", []):
        for ruta in root.glob(patron):
            propio = ruta / "package.json"
            if not propio.is_file():
                continue
            try:
                nombre = json.loads(propio.read_text()).get("name")
            except json.JSONDecodeError:
                continue
            if nombre:
                fuera[nombre] = ruta
    return fuera


def _looks_like_specifier(referent: str) -> bool:
    """Un especificador de modulo, no un simbolo."""
    return referent.startswith("@") or "/" in referent or ":" in referent or (
        referent.islower() and "-" in referent
    )


def resolves_today(referent: str, root: pathlib.Path) -> bool:
    """Si el referente resuelve HOY contra este arbol."""
    root = pathlib.Path(root)
    # #478 renombro el alcance del puerto. Un comentario que aun nombre el
    # viejo esta describiendo un arbol que ya no existe: se resuelve contra
    # el nombre de hoy, que es lo que decide si la ausencia sigue siendo
    # cierta.
    referent = referent.replace("@claude-code-how-works/", "@thyrox/")
    if _looks_like_specifier(referent):
        paquetes = _workspace_packages(root)
        partes = referent.split("/")
        base = "/".join(partes[:2]) if referent.startswith("@") else partes[0]
        subpath = "./" + "/".join(partes[2:]) if referent.startswith("@") else (
            "./" + "/".join(partes[1:])
        )
        if base in paquetes:
            if len(partes) == (2 if referent.startswith("@") else 1):
                return True
            exportados = json.loads(
                (paquetes[base] / "package.json").read_text()
            ).get("exports", {})
            return subpath in exportados
        return (root / "node_modules" / base).exists()
    # Un simbolo: resuelve si algun hermano lo exporta.
    patron = re.compile(
        r"^export\s+(?:declare\s+)?(?:async\s+)?"
        r"(?:function|const|class|type|interface|enum)\s+" + re.escape(referent) + r"\b",
        re.M,
    )
    for ruta in (root / "src" / "packages").rglob("*.ts"):
        try:
            if patron.search(ruta.read_text(errors="ignore")):
                return True
        except OSError:
            continue
    return False


def iter_blocks(root: pathlib.Path):
    """Cada bloque de comentario que lleva el rotulo, con su archivo."""
    raiz_paquetes = root / "src" / "packages"
    patron = re.compile(re.escape(MARKER) + r"(.{0,900}?)\*/", re.S)
    for ruta in sorted(
        list(raiz_paquetes.rglob("*.ts")) + list(raiz_paquetes.rglob("*.tsx"))
    ):
        try:
            texto = ruta.read_text(errors="ignore")
        except OSError:
            continue
        for m in patron.finditer(texto):
            cuerpo = " ".join(m.group(1).replace("*", " ").split())
            linea = texto[: m.start()].count("\n") + 1
            yield ruta.relative_to(root), linea, cuerpo


def main(argv: list[str]) -> int:
    estricto = "--strict" in argv
    posicionales = [a for a in argv[1:] if not a.startswith("-")]
    root = pathlib.Path(posicionales[0]) if posicionales else pathlib.Path.cwd()
    if not (root / "src" / "packages").is_dir():
        print(
            f"check-stale-divergence: no existe {root}/src/packages; "
            "NO se emite conteo -- un cero aqui no distinguiria "
            "«sin bloques» de «no pude medir»",
            file=sys.stderr,
        )
        return 2

    cubos: dict[str, list[tuple]] = {
        "RANCIA": [], "VIGENTE": [], "INDECIDIBLE": [], "DISENO": [], "NINGUNA": [],
    }
    total = 0
    for ruta, linea, cuerpo in iter_blocks(root):
        total += 1
        clase = classify_block(cuerpo)
        if clase is Verdict.NONE:
            cubos["NINGUNA"].append((ruta, linea, ""))
            continue
        if clase is Verdict.DESIGN:
            cubos["DISENO"].append((ruta, linea, ""))
            continue
        candidatos = extract_referents(cuerpo)
        if not candidatos:
            cubos["INDECIDIBLE"].append((ruta, linea, ""))
            continue
        resuelven = [c for c in candidatos if resolves_today(c, root)]
        if resuelven:
            cubos["RANCIA"].append((ruta, linea, ", ".join(resuelven)))
        else:
            cubos["VIGENTE"].append((ruta, linea, candidatos[0]))

    for nombre in ("RANCIA", "INDECIDIBLE", "VIGENTE", "DISENO", "NINGUNA"):
        filas = cubos[nombre]
        print(f"{nombre}: {len(filas)}")
        if nombre in ("RANCIA", "INDECIDIBLE"):
            for ruta, linea, ref in filas:
                print(f"    {ruta}:{linea}  {ref}")
    print(
        f"check-stale-divergence: {len(cubos['RANCIA'])} afirmacion(es) de "
        f"ausencia que YA resuelven (alcance medido: {total} bloque(s) con "
        f"el rotulo)"
    )
    return 1 if (estricto and cubos["RANCIA"]) else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
