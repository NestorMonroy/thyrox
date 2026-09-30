"""Tiempo propio del perfil de CPU agrupado por paquete (o dependencia de node_modules)."""
import json
import re
import sys
from collections import Counter

profile = json.load(open(sys.argv[1]))
nodes = {n["id"]: n for n in profile["nodes"]}
deltas = profile["timeDeltas"]
self_us = Counter()
for sample, delta in zip(profile["samples"], deltas):
    url = nodes[sample]["callFrame"].get("url", "")
    match = re.search(r"packages/([^/]+)/", url) or re.search(r"node_modules/((?:@[^/]+/)?[^/]+)", url)
    self_us[match.group(1) if match else (url.rsplit("/", 1)[-1] or "(native)")] += delta
total = sum(self_us.values())
for name, us in self_us.most_common(25):
    print(f"{us / 1000:8.0f} ms  {100 * us / total:5.1f}%  {name}")
