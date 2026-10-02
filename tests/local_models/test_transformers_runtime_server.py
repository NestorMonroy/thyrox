#!/usr/bin/env python3
"""El servidor del runtime de Transformers de una ModelExecutionUnit (TASK-THYROX-0776).

Qué haría fallar a esta suite:
- que el digest del snapshot dejara de coincidir con el de TypeScript (mismo vector);
- que una carga con otro artifactId que el del grant dejara un modelo residente;
- que se generara sin residencia, o después de descargarla;
- que la identidad observada se copiara de la petición en vez de leerse del snapshot.

El backend real (AutoModelForSeq2SeqLM) no se ejercita aquí: lo prueba la corrida con
t5-small dentro de una ExecutionUnit. Aquí lo sustituye un backend que anota sus cargas.
"""
from __future__ import annotations

import json
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src" / "packages" / "local-models" / "transformers-runtime"))

from transformers_runtime_server import TransformersRuntime, serve, snapshot_manifest_digest  # noqa: E402

FIXTURE_DIGEST = "cc1e6e274ac2815eab8e6782a50160c38de6bb0657938423fd337900020979d9"
MODEL_ID = "thyrox-google--madlad400-3b-mt:f32-hf-fa184c675da0"


def write_fixture(directory: Path) -> None:
    (directory / "nested").mkdir()
    (directory / "config.json").write_text('{"torch_dtype": "float32"}')
    (directory / "model.safetensors").write_text("weights")
    (directory / "nested" / "spiece.model").write_text("vocab")


class RecordingBackend:
    """Traduce anteponiendo «es:» y anota cada carga."""

    loads: list[Path] = []

    def __init__(self, directory: Path) -> None:
        RecordingBackend.loads.append(directory)

    def generate(self, inputs: list[str], max_new_tokens: int) -> list[str]:
        return [f"es:{text}"[:max_new_tokens] for text in inputs]


class TransformersRuntimeServerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.snapshot = Path(self.tmp.name)
        write_fixture(self.snapshot)
        RecordingBackend.loads = []
        self.server = serve(TransformersRuntime(self.snapshot, RecordingBackend), port=0)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.server.server_address[1]}"

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.tmp.cleanup()

    def call(self, method: str, path: str, body: object | None = None) -> tuple[int, dict]:
        data = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(f"{self.base}{path}", data=data, method=method,
                                         headers={"content-type": "application/json"})
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read() or b"{}")

    def identity(self, artifact_id: str = FIXTURE_DIGEST) -> dict:
        return {"modelId": MODEL_ID, "artifactId": artifact_id}

    def test_the_manifest_digest_matches_the_shared_vector(self) -> None:
        self.assertEqual(snapshot_manifest_digest(self.snapshot), FIXTURE_DIGEST)

    def test_health_answers_without_a_residency(self) -> None:
        self.assertEqual(self.call("GET", "/health"), (200, {"status": "ok"}))

    def test_verify_reports_the_observed_digest(self) -> None:
        self.assertEqual(self.call("POST", "/artifacts/verify", {"artifactId": FIXTURE_DIGEST}),
                         (200, {"artifactId": FIXTURE_DIGEST, "matches": True}))
        self.assertEqual(self.call("POST", "/artifacts/verify", {"artifactId": "f" * 64})[1]["matches"], False)

    def test_a_load_with_another_artifact_is_refused_and_loads_nothing(self) -> None:
        status, _ = self.call("POST", "/residency", self.identity("f" * 64))
        self.assertEqual(status, 409)
        self.assertEqual(RecordingBackend.loads, [])
        self.assertEqual(self.call("GET", "/residency"), (200, {"state": "absent"}))

    def test_a_load_reports_the_identity_read_from_the_snapshot(self) -> None:
        status, body = self.call("POST", "/residency", self.identity())
        self.assertEqual(status, 200)
        self.assertEqual(body, {"state": "resident", "modelId": MODEL_ID, "artifactId": FIXTURE_DIGEST,
                                "format": "safetensors", "quantization": "f32"})
        self.assertEqual(RecordingBackend.loads, [self.snapshot])
        self.assertEqual(self.call("GET", "/residency")[1]["state"], "resident")

    def test_generation_needs_a_residency(self) -> None:
        request = {"inputs": ["<2es> hola"], "maxNewTokens": 64}
        self.assertEqual(self.call("POST", "/v1/seq2seq", request)[0], 409)
        self.call("POST", "/residency", self.identity())
        self.assertEqual(self.call("POST", "/v1/seq2seq", request), (200, {"modelId": MODEL_ID, "outputs": ["es:<2es> hola"]}))

    def test_unload_leaves_nothing_to_generate_with(self) -> None:
        self.call("POST", "/residency", self.identity())
        self.assertEqual(self.call("DELETE", "/residency"), (200, {"state": "absent"}))
        self.assertEqual(self.call("POST", "/v1/seq2seq", {"inputs": ["x"], "maxNewTokens": 8})[0], 409)

    def test_a_malformed_request_is_a_400(self) -> None:
        request = urllib.request.Request(f"{self.base}/residency", data=b"{no", method="POST")
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request)
        self.assertEqual(caught.exception.code, 400)


if __name__ == "__main__":
    unittest.main()
