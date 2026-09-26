"""Copia verbatim las declaraciones de nivel superior del ítem __declarations__:types.

Son rangos de líneas de la fuente (ítem 1): no hay juicio que pedir a un
modelo. Se insertan tras el último import del destino, una sola vez.
"""
import pathlib, re, sys
source = pathlib.Path(sys.argv[1]).read_text().splitlines()
target = pathlib.Path(sys.argv[2])
item = pathlib.Path(sys.argv[3]).read_text()
ranges = [(int(a), int(b)) for a, b in re.findall(r"^- \w+: (\d+)-(\d+)$", item, re.M)]
blocks = ["\n".join(source[a - 1:b]) for a, b in ranges]
text = target.read_text()
lines = text.splitlines()
already = [b.splitlines()[0] for b in blocks if b.splitlines()[0] in lines]
blocks = [b for b in blocks if b.splitlines()[0] not in lines]
print(f"omitidas por estar ya: {already}")
last_import = max(i for i, l in enumerate(lines) if re.match(r"^(import|} from ')", l))
end = last_import
while not re.search(r"from ['\"].*['\"];?$|^import ['\"]", lines[end]):
    end += 1
out = lines[:end + 1] + ["", "// Declaraciones copiadas verbatim de la fuente (ítem __declarations__:types)."] \
    + [x for b in blocks for x in ("", *b.splitlines())] + lines[end + 1:]
target.write_text("\n".join(out) + "\n")
print(f"{len(ranges)} rangos, {sum(b - a + 1 for a, b in ranges)} líneas")
