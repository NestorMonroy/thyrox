"""Sonda: coste de `cited_benches` actual contra una sola pasada, sobre el contenido real.

Lee el contenido de TRABAJO de los archivos cambiados (lo que el índice temporal de
un commit por pathspec lleva) y mide los dos algoritmos con los mismos bancos.
"""
import pathlib, re, sys, time
sys.path.insert(0, "src/verify")
import check_bench_untracked as m

repo = pathlib.Path(".")
paths = pathlib.Path(sys.argv[1]).read_text().split()
texts = [pathlib.Path(p).read_text(errors="replace") for p in paths if pathlib.Path(p).is_file()]
benches = m.existing_benches(repo)
size = sum(map(len, texts))
print(f"textos={len(texts)} bytes={size} bancos={len(benches)}")

# Algoritmo actual sobre una muestra de bancos, extrapolado al total.
sample = benches[:40]
t = time.perf_counter()
old = {b for b in sample if any(b.rsplit("/", 1)[-1] in text for text in texts)}
dt = time.perf_counter() - t
print(f"actual: {dt:.2f}s para {len(sample)} bancos -> estimado {dt*len(benches)/len(sample):.0f}s por llamada, x2 llamadas")

# Una pasada: los nombres de banco llevan sello YYYYMMDDTHHMMSS; se extraen los candidatos una vez.
t = time.perf_counter()
names = {b.rsplit("/", 1)[-1]: b for b in benches}
pattern = re.compile(r"[A-Za-z0-9._-]+-\d{8}T\d{6}")
seen = set()
for text in texts:
    seen.update(pattern.findall(text))
new = {names[n] for n in seen if n in names}
print(f"una pasada: {time.perf_counter()-t:.2f}s, {len(new)} banco(s) citados")
unstamped = [n for n in names if not re.search(r"-\d{8}T\d{6}$", n)]
print(f"bancos sin sello (la pasada por patrón no los ve): {len(unstamped)} {unstamped[:5]}")
print(f"misma respuesta en la muestra: {old == {b for b in new if b in sample}}")
