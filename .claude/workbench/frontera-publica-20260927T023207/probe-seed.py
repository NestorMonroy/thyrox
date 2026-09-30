"""Reproduce el commit semilla de test_pre_commit_hook y muestra su salida."""
import sys, unittest, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3] / 'tests' / 'verify'))
import test_pre_commit_hook as t
case = t.PreCommitHook('test_sin_bancos_el_commit_pasa')
orig = case.assertEqual
def spy(a, b, *rest):
    if a != b:
        r = t.git(case.repo, 'commit', '-q', '-m', 'seed')
        print(r.stdout[-3000:], r.stderr[-3000:])
    return orig(a, b, *rest)
case.assertEqual = spy
try:
    case.setUp()
except AssertionError:
    pass
