"""Extrae del binario la definición minificada de cada símbolo del motor de hooks.

Lee el mapa de exportaciones (`chunk-526kmp4w.js`: `<minificado> as <original>`)
y, por cada símbolo pedido, recorta en `chunk-q2gh92k2.js` el cuerpo que empieza
en su `function`/`async function*` hasta la llave que lo cierra. Es la sonda que
produjo `outputs/binario/`; el cuerpo es evidencia de lectura, no código a portar.

    python3 probes/extraer_definiciones.py <raiz-del-banco>
"""
import pathlib
import re
import sys

#: Los internos que el motor usa y ningún llamador importa: se leen para la
#: conducta (el ejecutor, el matcher, el plazo de SessionEnd).
INTERNAL = ["executeHooks", "executeHooksOutsideREPL", "hookMatcherMatches", "parseHookOutput",
            "shouldSkipHookDueToTrust", "hasHookForEvent", "getSessionEndHookDefaultTimeoutMs",
            "SESSION_END_HOOK_TIMEOUT_MS_DEFAULT"]

BIN = pathlib.Path(__file__).resolve().parents[4] / "_references/claude-code-bin/2.1.275/bunfs-root"


def main() -> int:
    bench = pathlib.Path(sys.argv[1])
    exports = (BIN / "chunk-526kmp4w.js").read_text(errors="ignore")
    mapping = {orig: mini for mini, orig in re.findall(r"([A-Za-z0-9_$]+) as ([A-Za-z0-9_$]+)", exports)}
    source = (BIN / "chunk-q2gh92k2.js").read_text(errors="ignore")
    wanted = (bench / "outputs/simbolos-que-piden-los-llamadores.txt").read_text().split() + INTERNAL
    out = bench / "outputs/binario"
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for name in wanted:
        mini = mapping.get(name)
        match = mini and re.search(r"(async\s+function\*?|function\*?)\s*" + re.escape(mini) + r"\s*\(|\b(?:var|let|const)\s+" + re.escape(mini) + r"\s*=", source)
        body = ""
        if match:
            start = source.find("{", match.start())
            depth, end = 0, start
            while end < len(source):
                depth += {"{": 1, "}": -1}.get(source[end], 0)
                if depth == 0:
                    break
                end += 1
            body = source[match.start():end + 1]
            (out / f"{name}.min.js").write_text(body)
        rows.append(f"{name}\t{mini or '-'}\t{len(body)}")
    (out / "indice.tsv").write_text("simbolo\tminificado\tbytes\n" + "\n".join(rows) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
