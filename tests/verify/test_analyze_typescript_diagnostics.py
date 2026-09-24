#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
from paths import reach  # noqa: E402

ROOT = reach.thyrox_root()
SCRIPT = ROOT / "src/verify/analyze_typescript_diagnostics.py"


class TypeScriptDiagnosticAnalysisTest(unittest.TestCase):
    def run_analysis(self, content: str) -> tuple[subprocess.CompletedProcess[str], dict]:
        with tempfile.NamedTemporaryFile("w", suffix=".log", delete=False) as handle:
            handle.write(content)
            path = pathlib.Path(handle.name)
        try:
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(path), "--json"],
                capture_output=True,
                text=True,
            )
            return result, json.loads(result.stdout) if result.stdout else {}
        finally:
            path.unlink()

    def test_counts_diagnostics_not_output_lines(self) -> None:
        result, report = self.run_analysis(
            "src/a.ts(2,3): error TS2305: Module '\"@thyrox/config\"' has no exported member 'readConfig'.\n"
            "  additional context that is not another diagnostic\n"
            "src/a.ts(5,1): error TS2322: Type 'string' is not assignable to type 'number'.\n"
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(report["diagnostics"], 2)
        self.assertEqual(report["files"], 1)
        self.assertEqual(report["by_code"], {"TS2305": 1, "TS2322": 1})

    def test_extracts_missing_export_relationship(self) -> None:
        _, report = self.run_analysis(
            "src/consumer.ts(7,2): error TS2305: Module '\"@thyrox/provider\"' has no exported member 'createClient'.\n"
        )
        self.assertEqual(report["missing_exports"], [{
            "consumer": "src/consumer.ts",
            "provider": "@thyrox/provider",
            "symbol": "createClient",
            "count": 1,
        }])

    def test_diagnostic_identity_ignores_coordinates_and_preserves_count(self) -> None:
        _, report = self.run_analysis(
            "src/consumer.ts(7,2): error TS2339: Property 'value' does not exist.\n"
            "src/consumer.ts(70,20): error TS2339: Property 'value' does not exist.\n"
        )
        self.assertEqual(report["diagnostic_keys"], [{
            "file": "src/consumer.ts",
            "code": "TS2339",
            "message": "Property 'value' does not exist.",
            "key": "src/consumer.ts: TS2339: Property 'value' does not exist.",
            "count": 2,
        }])

    def test_refuses_a_log_without_diagnostics(self) -> None:
        result, report = self.run_analysis("typescript produced no parseable result\n")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(report, {})
        self.assertIn("no TypeScript diagnostics", result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
