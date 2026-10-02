from pathlib import Path
t = Path('tests/test_translation_loop.py'); s = t.read_text()
n = s.count('"--model", "claude-sonnet-5", ')
s = s.replace('"--model", "claude-sonnet-5", ', '')
old = '''def test_translate_refuses_a_model_alias(tmp_path: Path) -> None:
    repo, note, runner = setup(tmp_path)
    bench = tmp_path / "bench"
    loop(repo, "prepare", "--bench", str(bench), str(note))
    result = loop(repo, "translate", "--bench", str(bench), "--model", "sonnet", runner=runner)
    assert result.returncode == 2 and "identificador completo" in result.stderr
'''
new = '''def test_translate_asks_the_pool_for_units_under_the_consumer_policy(tmp_path: Path) -> None:
    """El ejecutor es thyrox: cada ítem en una ExecutionUnit, con la identidad de
    trabajo de este proyecto y su política de modelo; ningún `--model`."""
    repo, note, runner = setup(tmp_path)
    bench = tmp_path / "bench"
    loop(repo, "prepare", "--bench", str(bench), str(note))
    loop(repo, "translate", "--bench", str(bench), runner=runner)
    args = json.loads(runner.with_suffix(".args").read_text())
    value = lambda flag: args[args.index(flag) + 1]
    assert value("--execution") == "unit"
    assert value("--work-reference").startswith("ai-course-notes:es-mx/bench/translate/")
    assert value("--model-policy") == str(REPO_ROOT / "tools" / "lang" / "es-mx" / "model-policy.json")
    assert value("--task-class") == "analisis"
    assert "--model" not in args


def test_translate_refuses_without_a_readable_policy(tmp_path: Path) -> None:
    repo, note, runner = setup(tmp_path)
    bench = tmp_path / "bench"
    loop(repo, "prepare", "--bench", str(bench), str(note))
    result = loop(repo, "translate", "--bench", str(bench), "--model-policy", str(tmp_path / "no-existe.json"), runner=runner)
    assert result.returncode == 2 and "política" in result.stderr
    assert not runner.with_suffix(".args").exists()


def test_the_model_flag_is_gone(tmp_path: Path) -> None:
    repo, note, runner = setup(tmp_path)
    bench = tmp_path / "bench"
    loop(repo, "prepare", "--bench", str(bench), str(note))
    assert loop(repo, "translate", "--bench", str(bench), "--model", "claude-sonnet-5", runner=runner).returncode == 2


def test_the_shipped_policy_allows_only_the_official_qwen_without_fallback() -> None:
    policy = json.loads((REPO_ROOT / "tools" / "lang" / "es-mx" / "model-policy.json").read_text(encoding="utf-8"))
    assert policy["fallback"] == {"enabled": False}
    assert policy["allowed"] == [{"runtime": "ollama", "repository": "Qwen/Qwen2.5-7B-Instruct-GGUF", "quantization": "Q4_K_M"}]
'''
assert s.count(old) == 1
s = s.replace(old, new)
t.write_text(s); print('model flags removed:', n)
