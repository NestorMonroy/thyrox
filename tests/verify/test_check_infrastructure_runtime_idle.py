"""Pruebas de ``check_infrastructure_runtime_idle``: el Ollama de
infraestructura guarda y sirve el almacén de modelos, nunca una residencia.

Un servidor HTTP falso en loopback responde ``/api/ps`` con lo que cada caso
declara; el guion real corre en un proceso nuevo. Tres desenlaces que no se
colapsan: vacío (0), con residencia (1) y sin poder medir (2).
"""
from __future__ import annotations

import json
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GATE = ROOT / "src" / "verify" / "check_infrastructure_runtime_idle.py"
OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def serve(body: str, status: int = 200) -> HTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 — nombre del protocolo
            payload = body.encode() if self.path == "/api/ps" else b"{}"
            self.send_response(status if self.path == "/api/ps" else 404)
            self.end_headers()
            self.wfile.write(payload)

        def log_message(self, format: str, *args: object) -> None:  # noqa: A002 — firma de la base
            return

    server = HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def gate(url: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(GATE), "--ollama-url", url], capture_output=True, text=True)


print("== el Ollama de infraestructura sin residencias ==")
idle = serve(json.dumps({"models": []}))
check("sin modelos cargados: PASS", 0, gate(f"http://127.0.0.1:{idle.server_port}").returncode)

print("== una residencia sin grant ==")
loaded = serve(json.dumps({"models": [{"name": "qwen3:4b", "digest": "a79806aa", "size_vram": 0}]}))
ran = gate(f"http://127.0.0.1:{loaded.server_port}")
check("un modelo cargado: FAIL", 1, ran.returncode)
check("y nombra el modelo", True, "qwen3:4b" in ran.stdout)

print("== no se pudo medir no es vacío ==")
check("nadie escucha: exit 2", 2, gate("http://127.0.0.1:9").returncode)
broken = serve("no es json")
check("respuesta ilegible: exit 2", 2, gate(f"http://127.0.0.1:{broken.server_port}").returncode)
refused = serve("{}", status=500)
check("el runtime responde 500: exit 2", 2, gate(f"http://127.0.0.1:{refused.server_port}").returncode)
shapeless = serve(json.dumps({"other": 1}))
check("sin campo models: exit 2", 2, gate(f"http://127.0.0.1:{shapeless.server_port}").returncode)

print(f"\n{OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
