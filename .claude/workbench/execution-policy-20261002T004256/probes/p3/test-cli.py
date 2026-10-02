

def check_policy(home: LocalHome) -> None:
    """Con --policy y sin respaldo: sin candidato permitido se bloquea, nunca claude-cli (TASK-THYROX-0758)."""
    home.write_qualified_model()
    policy = home.root / "policy.json"
    policy.write_text(json.dumps({"allowed": [{"runtime": "ollama", "repository": "Qwen/Qwen2.5-7B-Instruct-GGUF"}],
                                  "fallback": {"enabled": False}}))
    r = run(home, "mecanica", "--policy", str(policy), "--json")
    body = parse_json(r.stdout)
    check("sin candidato permitido sale 3", r.returncode == 3, f"{r.returncode} {r.stderr[:120]}")
    check("y el JSON dice bloqueada, sin modelo", body.get("runtime") == "blocked" and "model" not in body, r.stdout[:160])
    check("y NO nombra ningún claude-", "claude-" not in r.stdout + r.stderr, r.stdout[:120])
    r = run(home, "mecanica", "--policy", str(policy), "--runtime", "claude-cli")
    check("--runtime claude-cli contra una política sin respaldo rehúsa con 2", r.returncode == 2, str(r.returncode))
    check("y no nombra ningún claude- como recomendación", "→ claude-" not in r.stdout, r.stdout[:120])
