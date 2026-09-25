#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
from paths import reach  # noqa: E402
from verify.analyze_typescript_diagnostics import DIAGNOSTIC, diagnostic_key, stable_key  # noqa: E402
from verify.batch_verification import _new_diagnostics  # noqa: E402

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

    def test_counts_shape_audit_diagnostics_beside_tsc(self) -> None:
        # El segundo verificador (`message_shape_audit.ts`) emite en el formato
        # de tsc con codigo SHAPEnnn, para que el lazo, su memoria y sus gates
        # lo lean sin cambios. Una linea que imita el formato con otro prefijo
        # sigue sin contar: la regex acepta dos familias, no cualquier codigo.
        result, report = self.run_analysis(
            "src/a.ts(2,3): error TS2322: Type 'string' is not assignable to type 'number'.\n"
            "src/core/Loop.ts(9,5): error SHAPE001: dual-shape read .message.content on CoreAssistantMessage\n"
            "src/b.ts(1,1): error LINT001: not a verifier this loop knows\n"
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(report["by_code"], {"SHAPE001": 1, "TS2322": 1})

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


# Par real (paso 097 contra paso 098): el mismo TS2322 de MessageRow.tsx, con
# la línea desplazada y la unión impresa en otro orden y truncada distinto.
_UNION_BEFORE = 'src/packages/repl/src/components/MessageRow.tsx(197,7): error TS2322: Type \'NormalizedUserMessage | NormalizedAssistantMessage<unknown> | (MessageBase & { type: "system"; subtype: "local_command"; timestamp?: string | undefined; isMeta?: boolean | undefined; level?: string | undefined; toolUseID?: string | undefined; } & { ...; } & { ...; }) | ... 18 more ... | CollapsedReadSearchGroup\' is not assignable to type \'AssistantMessage | AttachmentMessage<_T> | SystemLocalCommandMessage | SystemCompactBoundaryMessage | ... 16 more ... | CollapsedReadSearchGroup\'.'
_UNION_AFTER = 'src/packages/repl/src/components/MessageRow.tsx(200,7): error TS2322: Type \'NormalizedUserMessage | NormalizedAssistantMessage<unknown> | (MessageBase & { type: "system"; subtype: "local_command"; timestamp?: string | undefined; isMeta?: boolean | undefined; level?: string | undefined; toolUseID?: string | undefined; } & { ...; } & { ...; }) | ... 18 more ... | CollapsedReadSearchGroup\' is not assignable to type \'AttachmentMessage<_T> | SystemLocalCommandMessage | SystemCompactBoundaryMessage | SystemAPIErrorMessage | ... 16 more ... | CollapsedReadSearchGroup\'.'


class StableUnionKeyTest(unittest.TestCase):
    def key(self, line: str) -> str:
        match = DIAGNOSTIC.match(line)
        assert match
        return stable_key(diagnostic_key(match))

    def test_same_union_printed_in_another_order_is_the_same_key(self) -> None:
        self.assertEqual(self.key(_UNION_BEFORE), self.key(_UNION_AFTER))

    def test_the_reprinted_union_is_not_a_new_diagnostic(self) -> None:
        self.assertEqual([], _new_diagnostics([_UNION_BEFORE], [_UNION_AFTER])[0])

    def test_signals_still_read_the_literal_text(self) -> None:
        match = DIAGNOSTIC.match(_UNION_BEFORE)
        assert match
        self.assertIn("CollapsedReadSearchGroup", diagnostic_key(match))

    def test_unions_of_different_size_stay_distinct(self) -> None:
        self.assertNotEqual(
            self.key("a.ts(1,1): error TS2322: Type 'A | B' is not assignable to type 'C'."),
            self.key("a.ts(1,1): error TS2322: Type 'A | B | D' is not assignable to type 'C'."))

    def test_non_union_type_is_kept_verbatim(self) -> None:
        self.assertEqual(
            "a.ts: TS2322: Type 'Array<A | B>' is not assignable to type 'C'.",
            self.key("a.ts(1,1): error TS2322: Type 'Array<A | B>' is not assignable to type 'C'."))


if __name__ == "__main__":
    unittest.main(verbosity=2)
