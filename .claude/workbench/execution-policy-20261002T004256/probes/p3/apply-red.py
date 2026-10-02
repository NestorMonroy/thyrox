from pathlib import Path
t = Path('src/packages/provider/__tests__/recommendExecution.test.ts'); s = t.read_text()
old = "import { recommend, recommendExecution } from '../src/cost/policy.ts'"
assert s.count(old) == 1
s = s.replace(old, old + "\nimport { ExecutionPolicyError, parseExecutionPolicy } from '../src/cost/executionPolicy.ts'")
t.write_text(s + Path('/scratch/p3/tests-recommend.ts').read_text())
c = Path('tests/agents/test_recommend_cli.py'); s = c.read_text()
old = "\n\ndef main() -> int:"
assert s.count(old) == 1
s = s.replace(old, Path('/scratch/p3/test-cli.py').read_text().rstrip('\n') + "\n" + old)
old = "                     check_local_choice, check_unreadable_files):"
assert s.count(old) == 1
s = s.replace(old, "                     check_local_choice, check_unreadable_files, check_policy):")
c.write_text(s); print('ok')
