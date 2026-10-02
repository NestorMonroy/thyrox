#!/usr/bin/env python3
"""El runtime de Transformers dentro de una ModelExecutionUnit (TASK-THYROX-0776, ADR-007).

Corre detrás de PodmanExecutionPrimitive: la unidad monta de sólo lectura el snapshot
que el grant concede (`THYROX_TRANSFORMERS_MODEL_DIR`) y publica este servidor sólo en
loopback. No decide modelo, revisión, cuantización ni dispositivo: carga el snapshot
montado sólo si su identidad es la que el grant concede, y si no, rehúsa (M5).

La generación sigue la forma de un modelo encoder-decoder de Transformers (T5 y
derivados, como MADLAD-400): `AutoTokenizer` y `AutoModelForSeq2SeqLM` sobre el
snapshot, y `generate` con un máximo de tokens nuevos. El prefijo de tarea (`<2es>` en
MADLAD, `translate English to French:` en T5) lo pone quien pide: es parte de la
entrada, no una política del runtime.

API (JSON sobre HTTP):
    GET    /health            -> {"status": "ok"}
    POST   /artifacts/verify  {"artifactId"} -> {"artifactId": observado, "matches": bool}
    POST   /residency         {"modelId", "artifactId"} -> identidad residente, o 409
    GET    /residency         -> {"state": "absent"} o la identidad residente
    DELETE /residency         -> {"state": "absent"}
    POST   /v1/seq2seq        {"inputs": [...], "maxNewTokens": N} -> {"modelId", "outputs"}, o 409
"""
from __future__ import annotations

import hashlib
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Callable, Protocol

SNAPSHOT_DIRECTORY_ENV = "THYROX_TRANSFORMERS_MODEL_DIR"
PORT_ENV = "THYROX_TRANSFORMERS_PORT"
DEFAULT_PORT = 8080
ARTIFACT_FORMAT = "safetensors"
CONFIG_FILE = "config.json"
#: `torch_dtype` del config del snapshot -> nivel de cuantización del catálogo.
QUANTIZATION_BY_DTYPE = {"float32": "f32", "float16": "f16", "bfloat16": "bf16"}
HASH_CHUNK_BYTES = 1 << 20


def snapshot_manifest_digest(directory: Path) -> str:
    """sha256 del manifiesto: una línea `ruta<TAB>sha256<TAB>bytes` por archivo, ordenadas por ruta.

    Es la misma definición que `@thyrox/model-artifacts: snapshotManifest.ts`; las dos
    pruebas fijan el mismo vector.
    """
    lines = []
    for path in sorted((p for p in directory.rglob("*") if p.is_file()), key=lambda p: p.relative_to(directory).as_posix()):
        lines.append(f"{path.relative_to(directory).as_posix()}\t{_file_sha256(path)}\t{path.stat().st_size}\n")
    return hashlib.sha256("".join(lines).encode()).hexdigest()


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(HASH_CHUNK_BYTES), b""):
            digest.update(chunk)
    return digest.hexdigest()


def observed_quantization(directory: Path) -> str | None:
    """La cuantización que el snapshot declara en su config; desconocida es `None` y no coincide con nada."""
    try:
        dtype = json.loads((directory / CONFIG_FILE).read_text()).get("torch_dtype")
    except (OSError, ValueError):
        return None
    return QUANTIZATION_BY_DTYPE.get(dtype)


class Seq2SeqBackend(Protocol):
    def generate(self, inputs: list[str], max_new_tokens: int) -> list[str]: ...


BackendLoader = Callable[[Path], Seq2SeqBackend]


class TransformersSeq2SeqBackend:
    """Un modelo encoder-decoder cargado con Transformers desde el snapshot montado.

    En CPU: el dispositivo lo fija el grant y la unidad, no `device_map="auto"`.
    """

    def __init__(self, directory: Path) -> None:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        self._tokenizer = AutoTokenizer.from_pretrained(directory)
        self._model = AutoModelForSeq2SeqLM.from_pretrained(directory)

    def generate(self, inputs: list[str], max_new_tokens: int) -> list[str]:
        encoded = self._tokenizer(inputs, return_tensors="pt", padding=True)
        generated = self._model.generate(**encoded, max_new_tokens=max_new_tokens)
        return self._tokenizer.batch_decode(generated, skip_special_tokens=True)


class RuntimeConflict(Exception):
    """La operación contradice el estado concedido: se rehúsa, nunca se sustituye."""


class TransformersRuntime:
    """El estado de la unidad: a lo sumo una residencia, la del snapshot montado (topología A)."""

    def __init__(self, directory: Path, load_backend: BackendLoader) -> None:
        self._directory = directory
        self._load_backend = load_backend
        self._lock = threading.Lock()
        self._backend: Seq2SeqBackend | None = None
        self._identity: dict | None = None

    def verify(self, artifact_id: str) -> dict:
        observed = snapshot_manifest_digest(self._directory)
        return {"artifactId": observed, "matches": observed == artifact_id}

    def load(self, model_id: str, artifact_id: str) -> dict:
        observed = snapshot_manifest_digest(self._directory)
        if observed != artifact_id:
            raise RuntimeConflict(f"el snapshot montado es {observed}, el grant concede {artifact_id}")
        with self._lock:
            self._backend = self._load_backend(self._directory)
            self._identity = {"state": "resident", "modelId": model_id, "artifactId": observed,
                              "format": ARTIFACT_FORMAT, "quantization": observed_quantization(self._directory)}
            return dict(self._identity)

    def residency(self) -> dict:
        with self._lock:
            return dict(self._identity) if self._identity else {"state": "absent"}

    def unload(self) -> dict:
        with self._lock:
            self._backend = None
            self._identity = None
        return {"state": "absent"}

    def generate(self, inputs: list[str], max_new_tokens: int) -> dict:
        with self._lock:
            if self._backend is None or self._identity is None:
                raise RuntimeConflict("no hay residencia: el grant no se cargó en esta unidad")
            return {"modelId": self._identity["modelId"], "outputs": self._backend.generate(inputs, max_new_tokens)}


class BadRequest(Exception):
    """El cuerpo de la petición no tiene la forma que la API declara."""


def handler_for(runtime: TransformersRuntime) -> type[BaseHTTPRequestHandler]:
    routes: dict[tuple[str, str], Callable[[dict], dict]] = {
        ("GET", "/health"): lambda _: {"status": "ok"},
        ("POST", "/artifacts/verify"): lambda body: runtime.verify(_text(body, "artifactId")),
        ("POST", "/residency"): lambda body: runtime.load(_text(body, "modelId"), _text(body, "artifactId")),
        ("GET", "/residency"): lambda _: runtime.residency(),
        ("DELETE", "/residency"): lambda _: runtime.unload(),
        ("POST", "/v1/seq2seq"): lambda body: runtime.generate(_inputs(body), _positive(body, "maxNewTokens")),
    }

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            self._dispatch("GET")

        def do_POST(self) -> None:
            self._dispatch("POST")

        def do_DELETE(self) -> None:
            self._dispatch("DELETE")

        def log_message(self, format: str, *args: object) -> None:
            pass

        def _dispatch(self, method: str) -> None:
            route = routes.get((method, self.path))
            if route is None:
                return self._reply(404, {"error": f"{method} {self.path} no existe"})
            try:
                self._reply(200, route(self._body()))
            except BadRequest as error:
                self._reply(400, {"error": str(error)})
            except RuntimeConflict as error:
                self._reply(409, {"error": str(error)})

        def _body(self) -> dict:
            length = int(self.headers.get("content-length") or 0)
            if length == 0:
                return {}
            try:
                body = json.loads(self.rfile.read(length))
            except ValueError as error:
                raise BadRequest(f"JSON ilegible: {error}") from error
            if not isinstance(body, dict):
                raise BadRequest("el cuerpo es un objeto JSON")
            return body

        def _reply(self, status: int, body: dict) -> None:
            payload = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    return Handler


def _text(body: dict, key: str) -> str:
    value = body.get(key)
    if not isinstance(value, str) or not value:
        raise BadRequest(f"falta `{key}`")
    return value


def _positive(body: dict, key: str) -> int:
    value = body.get(key)
    if not isinstance(value, int) or value <= 0:
        raise BadRequest(f"`{key}` es un entero positivo")
    return value


def _inputs(body: dict) -> list[str]:
    inputs = body.get("inputs")
    if not isinstance(inputs, list) or not inputs or not all(isinstance(item, str) for item in inputs):
        raise BadRequest("`inputs` es una lista no vacía de textos")
    return inputs


def serve(runtime: TransformersRuntime, port: int, host: str = "127.0.0.1") -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), handler_for(runtime))


def main() -> None:
    directory = Path(os.environ[SNAPSHOT_DIRECTORY_ENV])
    port = int(os.environ.get(PORT_ENV, DEFAULT_PORT))
    # Dentro de la unidad escucha en todas sus interfaces: la unidad sólo publica el puerto en loopback del anfitrión.
    server = serve(TransformersRuntime(directory, TransformersSeq2SeqBackend), port, host="0.0.0.0")
    server.serve_forever()


if __name__ == "__main__":
    main()
