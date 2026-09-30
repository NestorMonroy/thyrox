"""Sonda: el diccionario clave -> archivos que la leen, antes y después, sobre el árbol real."""
import importlib.util, pathlib, sys, time

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

bench, root = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]).resolve()
results = {}
for label in ("before", "after"):
    gate = load(f"gate_{label}", bench / f"check_env_contract_keys-{label}.py")
    start = time.perf_counter()
    keys = gate.read_keys(root)
    results[label] = {key: sorted(files) for key, files in keys.items()}
    print(f"{label}: {time.perf_counter() - start:.2f}s, {len(keys)} claves, "
          f"{sum(map(len, keys.values()))} lecturas")
print("diccionarios idénticos:", results["before"] == results["after"])
for key in sorted(set(results["before"]) ^ set(results["after"])):
    print("  solo en", "before" if key in results["before"] else "after", key)
