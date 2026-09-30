import sys,re
from collections import Counter
from verify.analyze_typescript_diagnostics import stable_key
h=re.compile(r"^([^(\s]+)\(\d+,\d+\): error (TS\d+: .*)$")
def k(p): return Counter(stable_key(f"{m.group(1)}: {m.group(2)}") for l in open(p) if (m:=h.match(l.rstrip("\n"))))
a,b=k(sys.argv[1]),k(sys.argv[2]); new=b-a
print("total",sum(b.values()),"desaparecidos",sum((a-b).values()),"nuevos",sum(new.values()))
for x,v in new.items(): print(" +",v,x[:170])
