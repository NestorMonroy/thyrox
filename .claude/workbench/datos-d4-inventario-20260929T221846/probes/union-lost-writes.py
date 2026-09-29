"""Mide dos escrituras que la unión de merge_sqlite_union no preserva.

Parte de una copia del esquema real (sin filas) y simula dos sesiones que
divergen desde la misma base; luego corre el driver real sobre las copias.
"""
import pathlib, shutil, sqlite3, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[4]
STORE = ROOT / "agent-results" / "agent_store.sqlite3"
DRIVER = ROOT / "bin" / "merge_sqlite_union"

tmp = pathlib.Path(tempfile.mkdtemp(dir=pathlib.Path(__file__).parent))
base = tmp / "base.sqlite3"
src = sqlite3.connect(f"file:{STORE}?mode=ro", uri=True)
dst = sqlite3.connect(base)
src.backup(dst)
src.close()
for t in ("agent_sessions", "findings_history"):
    dst.execute(f'DELETE FROM "{t}"')
req = {r[1]: "x" for r in dst.execute("pragma table_info(agent_sessions)") if r[3] and r[4] is None}
req.update(agent_id="a1", status="running")
dst.execute(f"INSERT INTO agent_sessions({','.join(req)}) VALUES ({','.join('?'*len(req))})", list(req.values()))
dst.commit(); dst.close()

ours, theirs = tmp / "ours.sqlite3", tmp / "theirs.sqlite3"
shutil.copy(base, ours); shutil.copy(base, theirs)
fh_cols = [r[1] for r in sqlite3.connect(base).execute("pragma table_info(findings_history)") if r[3] and r[4] is None and r[1] != "id"]

def add_finding(path, fid):
    c = sqlite3.connect(path)
    vals = {col: fid if col == "finding_id" else "x" for col in fh_cols}
    if fid == "H-THEIRS-1" and __import__("os").environ.get("PROBE_CONTROL"):
        vals["id"] = 1000
    c.execute(f"INSERT INTO findings_history({','.join(vals)}) VALUES ({','.join('?'*len(vals))})", list(vals.values()))
    c.commit(); c.close()

t = sqlite3.connect(theirs)
t.execute("UPDATE agent_sessions SET status='completed' WHERE agent_id='a1'")
t.commit(); t.close()
add_finding(ours, "H-OURS-1")
add_finding(theirs, "H-THEIRS-1")

r = subprocess.run(["bash", str(DRIVER), str(base), str(ours), str(theirs)], capture_output=True, text=True)
print("driver exit", r.returncode, r.stderr.strip()[:200])
m = sqlite3.connect(ours)
print("a1 status tras merge:", m.execute("select status from agent_sessions where agent_id='a1'").fetchone(), "(el otro lado escribió 'completed')")
print("hallazgos tras merge:", sorted(x for (x,) in m.execute("select finding_id from findings_history")), "(se escribieron H-OURS-1 y H-THEIRS-1)")
shutil.rmtree(tmp)
