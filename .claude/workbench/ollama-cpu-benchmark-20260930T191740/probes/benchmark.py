#!/usr/bin/env python3
"""Benchmark en CPU de modelos abiertos con tool calling, servidos por Ollama en Podman.

Mide, por candidato y uno a la vez (el modelo se borra antes del siguiente para
acotar el disco): tamaño descargado, tiempo de descarga, tiempo de carga, RAM en
reposo y pico durante la inferencia (cgroup del contenedor), latencia hasta el
primer token, tokens/s, aciertos de tool calling sobre casos deterministas por el
endpoint compatible con OpenAI (el mismo contrato que usará el upstream del
proxy, TASK-THYROX-0661), y la latencia con 1, 2 y 4 peticiones concurrentes.

Métrica: lo anterior, n = 1 por caso, temperatura 0 y semilla fija.
Ciega a: la variación entre corridas; la calidad fuera de estos casos; la GPU;
y a que la RAM del cgroup incluye la caché de páginas del archivo del modelo.

Uso: python3 benchmark.py <salida.tsv> <detalle.jsonl> [modelo ...]
"""

import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

IMAGE = os.environ.get("OLLAMA_IMAGE", "docker.io/ollama/ollama:0.35.0")
CONTAINER = "thyrox-ollama-bench"
VOLUME = "thyrox-ollama-bench-models"
PORT = int(os.environ.get("BENCH_PORT", "11536"))
BASE_URL = f"http://127.0.0.1:{PORT}"
PROXY_CA = "/root/.ccr/ca-bundle.crt"
SEED = 7
PULL_TIMEOUT_S = 1800
REQUEST_TIMEOUT_S = 600
SAMPLE_INTERVAL_S = 0.2
GENERATION_TOKENS = 128
CONCURRENCY_LEVELS = (1, 2, 4)
API_WAIT_S = 60

DEFAULT_CANDIDATES = (
    "qwen2.5:0.5b", "qwen3:0.6b", "llama3.2:1b", "qwen2.5:1.5b",
    "qwen3:1.7b", "llama3.2:3b", "qwen2.5:3b", "qwen3:4b",
)

WEATHER_TOOL = {"type": "function", "function": {
    "name": "get_weather", "description": "Return the current weather for a city.",
    "parameters": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}}}
ADD_TOOL = {"type": "function", "function": {
    "name": "add", "description": "Add two integers.",
    "parameters": {"type": "object", "properties": {"a": {"type": "integer"}, "b": {"type": "integer"}},
                   "required": ["a", "b"]}}}
READ_FILE_TOOL = {"type": "function", "function": {
    "name": "read_file", "description": "Read the contents of one file.",
    "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}}
LIST_DIR_TOOL = {"type": "function", "function": {
    "name": "list_dir", "description": "List the entries of a directory.",
    "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}}
SET_MODE_TOOL = {"type": "function", "function": {
    "name": "set_mode", "description": "Set the operating mode.",
    "parameters": {"type": "object", "properties": {"mode": {"type": "string", "enum": ["fast", "safe", "off"]}},
                   "required": ["mode"]}}}


def http_json(method: str, path: str, body: dict | None = None, timeout: float = REQUEST_TIMEOUT_S) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(BASE_URL + path, data=data, method=method,
                                     headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read()
    return json.loads(raw) if raw else {}


def start_server() -> None:
    """Levanta Ollama con la red del anfitrión y la API sólo en loopback (ADR-007 Regla 5)."""
    subprocess.run(["podman", "rm", "-f", CONTAINER], capture_output=True, check=False)
    proxy = os.environ.get("HTTPS_PROXY", "")
    subprocess.run([
        "podman", "run", "-d", "--name", CONTAINER, "--network", "host",
        "-e", f"OLLAMA_HOST=127.0.0.1:{PORT}", "-e", f"OLLAMA_NUM_PARALLEL={max(CONCURRENCY_LEVELS)}",
        "-e", f"HTTPS_PROXY={proxy}", "-e", f"https_proxy={proxy}", "-e", "NO_PROXY=localhost,127.0.0.1",
        "-e", "SSL_CERT_FILE=/etc/ssl/certs/proxy-ca.crt", "-v", f"{PROXY_CA}:/etc/ssl/certs/proxy-ca.crt:ro",
        "-v", f"{VOLUME}:/root/.ollama", IMAGE,
    ], check=True, capture_output=True)
    deadline = time.monotonic() + API_WAIT_S
    while time.monotonic() < deadline:
        try:
            http_json("GET", "/api/version", timeout=2)
            return
        except (urllib.error.URLError, ConnectionError):
            time.sleep(1)
    raise RuntimeError(f"la API de Ollama no respondió en {API_WAIT_S} s en {BASE_URL}")


def stop_server() -> None:
    subprocess.run(["podman", "rm", "-f", CONTAINER], capture_output=True, check=False)


def container_cgroup_memory_file() -> Path:
    pid = subprocess.run(["podman", "inspect", "--format", "{{.State.Pid}}", CONTAINER],
                         check=True, capture_output=True, text=True).stdout.strip()
    relative = Path(f"/proc/{pid}/cgroup").read_text().strip().split("::", 1)[1]
    return Path("/sys/fs/cgroup") / relative.lstrip("/") / "memory.current"


class MemorySampler:
    """Muestrea memory.current del cgroup del contenedor y conserva el máximo."""

    def __init__(self, memory_file: Path) -> None:
        self.memory_file = memory_file
        self.peak_bytes = 0
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def _run(self) -> None:
        while not self._stop.is_set():
            self.peak_bytes = max(self.peak_bytes, int(self.memory_file.read_text()))
            time.sleep(SAMPLE_INTERVAL_S)

    def __enter__(self) -> "MemorySampler":
        self._thread.start()
        return self

    def __exit__(self, *_exc: object) -> None:
        self._stop.set()
        self._thread.join()


def chat(model: str, messages: list[dict], tools: list[dict]) -> dict:
    body = {"model": model, "messages": messages, "temperature": 0, "seed": SEED}
    if tools:
        body["tools"] = tools
    return http_json("POST", "/v1/chat/completions", body)


def first_tool_call(response: dict) -> tuple[str, dict] | None:
    calls = response["choices"][0]["message"].get("tool_calls") or []
    if not calls:
        return None
    function = calls[0]["function"]
    return function["name"], json.loads(function["arguments"] or "{}")


def tool_calling_cases(model: str) -> list[tuple[str, bool, str]]:
    """Casos deterministas del contrato de herramientas: (caso, acierto, observado)."""
    results = []

    def expect_call(case: str, prompt: str, tools: list[dict], name: str, arguments: dict) -> None:
        try:
            observed = first_tool_call(chat(model, [{"role": "user", "content": prompt}], tools))
        except (urllib.error.URLError, KeyError, json.JSONDecodeError) as error:
            results.append((case, False, f"error: {error}"))
            return
        results.append((case, observed == (name, arguments), json.dumps(observed)))

    expect_call("single_tool", "What is the weather in Madrid right now?", [WEATHER_TOOL],
                "get_weather", {"city": "Madrid"})
    expect_call("integer_arguments", "Use the tool to add 17 and 25.", [ADD_TOOL], "add", {"a": 17, "b": 25})
    expect_call("choose_between_tools", "Show me the contents of the file /etc/hostname.",
                [LIST_DIR_TOOL, READ_FILE_TOOL], "read_file", {"path": "/etc/hostname"})
    expect_call("enum_argument", "Switch the operating mode to safe.", [SET_MODE_TOOL], "set_mode", {"mode": "safe"})

    try:
        plain = chat(model, [{"role": "user", "content": "Reply with the single word: hello"}], [WEATHER_TOOL])
        no_call = first_tool_call(plain) is None
        results.append(("no_tool_needed", no_call, plain["choices"][0]["message"].get("content", "")[:80]))
    except (urllib.error.URLError, KeyError) as error:
        results.append(("no_tool_needed", False, f"error: {error}"))

    # Continuación: el resultado de la herramienta vuelve con su id y el modelo lo usa.
    messages = [
        {"role": "user", "content": "Use the tool to add 17 and 25, then tell me the result."},
        {"role": "assistant", "content": "", "tool_calls": [
            {"id": "call_1", "type": "function", "function": {"name": "add", "arguments": '{"a": 17, "b": 25}'}}]},
        {"role": "tool", "tool_call_id": "call_1", "content": "42"},
    ]
    try:
        text = chat(model, messages, [ADD_TOOL])["choices"][0]["message"].get("content") or ""
        results.append(("continuation_after_tool", "42" in text, text[:80]))
    except (urllib.error.URLError, KeyError) as error:
        results.append(("continuation_after_tool", False, f"error: {error}"))
    return results


def time_to_first_token(model: str) -> float:
    """Segundos hasta el primer fragmento con contenido, en streaming por el endpoint OpenAI."""
    body = json.dumps({"model": model, "stream": True, "temperature": 0, "seed": SEED,
                       "messages": [{"role": "user", "content": "Count from one to five."}]}).encode()
    request = urllib.request.Request(BASE_URL + "/v1/chat/completions", data=body, method="POST",
                                     headers={"Content-Type": "application/json"})
    started = time.monotonic()
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_S) as response:
        for line in response:
            if not line.startswith(b"data: ") or line.strip() == b"data: [DONE]":
                continue
            delta = json.loads(line[len(b"data: "):])["choices"][0]["delta"]
            if delta.get("content"):
                return time.monotonic() - started
    return float("nan")


def generation_speed(model: str) -> float:
    """Tokens/s de decodificación que el propio Ollama declara (eval_count / eval_duration)."""
    response = http_json("POST", "/api/generate", {
        "model": model, "stream": False, "prompt": "Write a short paragraph about rivers.",
        "options": {"temperature": 0, "seed": SEED, "num_predict": GENERATION_TOKENS}})
    return response["eval_count"] / (response["eval_duration"] / 1e9)


def concurrent_latency(model: str, level: int) -> float:
    """Pared, en segundos, de `level` peticiones iguales lanzadas a la vez."""
    def one(_index: int) -> None:
        chat(model, [{"role": "user", "content": "Name three colours."}], [])

    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=level) as pool:
        list(pool.map(one, range(level)))
    return time.monotonic() - started


def measure(model: str) -> dict:
    started = time.monotonic()
    http_json("POST", "/api/pull", {"model": model, "stream": False}, timeout=PULL_TIMEOUT_S)
    pull_seconds = time.monotonic() - started
    size = next(entry["size"] for entry in http_json("GET", "/api/tags")["models"] if entry["name"] == model)
    capabilities = http_json("POST", "/api/show", {"model": model}).get("capabilities", [])
    memory_file = container_cgroup_memory_file()
    idle_bytes = int(memory_file.read_text())
    load = http_json("POST", "/api/generate", {"model": model, "prompt": "", "keep_alive": "10m"})
    load_seconds = load.get("load_duration", 0) / 1e9
    loaded_bytes = int(memory_file.read_text())
    with MemorySampler(memory_file) as sampler:
        cases = tool_calling_cases(model)
        ttft = time_to_first_token(model)
        tokens_per_second = generation_speed(model)
        latencies = {level: concurrent_latency(model, level) for level in CONCURRENCY_LEVELS}
    http_json("DELETE", "/api/delete", {"model": model})
    return {
        "model": model, "tools_capability": "tools" in capabilities, "size_bytes": size,
        "pull_seconds": round(pull_seconds, 1), "load_seconds": round(load_seconds, 2),
        "ram_idle_bytes": idle_bytes, "ram_loaded_bytes": loaded_bytes, "ram_peak_bytes": sampler.peak_bytes,
        "ttft_seconds": round(ttft, 2), "tokens_per_second": round(tokens_per_second, 1),
        "tool_cases_passed": sum(1 for _case, passed, _obs in cases if passed), "tool_cases_total": len(cases),
        "cases": cases, "concurrency_seconds": {str(k): round(v, 2) for k, v in latencies.items()},
    }


TSV_COLUMNS = ("model", "tools_capability", "size_bytes", "pull_seconds", "load_seconds", "ram_idle_bytes",
               "ram_loaded_bytes", "ram_peak_bytes", "ttft_seconds", "tokens_per_second",
               "tool_cases_passed", "tool_cases_total", "concurrency_seconds")


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__, file=sys.stderr)
        return 2
    table, details = Path(argv[0]), Path(argv[1])
    candidates = argv[2:] or list(DEFAULT_CANDIDATES)
    start_server()
    try:
        table.write_text("\t".join(TSV_COLUMNS) + "\n")
        for model in candidates:
            try:
                row = measure(model)
            except (urllib.error.URLError, RuntimeError, KeyError, StopIteration) as error:
                row = {"model": model, "error": str(error)}
                print(f"{model}: no se midió: {error}", file=sys.stderr)
            with details.open("a") as handle:
                handle.write(json.dumps(row) + "\n")
            if "error" not in row:
                with table.open("a") as handle:
                    handle.write("\t".join(str(row[column]) for column in TSV_COLUMNS) + "\n")
            print(json.dumps({key: row.get(key) for key in TSV_COLUMNS}), flush=True)
    finally:
        stop_server()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
