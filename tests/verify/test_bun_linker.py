#!/usr/bin/env python3
"""The root install must reproduce the TypeScript workspace topology."""
from pathlib import Path
import tomllib
from paths import reach  # noqa: E402

ROOT = reach.thyrox_root()
config = tomllib.loads((ROOT / "bunfig.toml").read_text(encoding="utf-8"))
linker = config.get("install", {}).get("linker")

if linker != "hoisted":
    raise SystemExit(
        f"expected bunfig.toml install.linker='hoisted', got {linker!r}; "
        "the root TypeScript baseline would depend on an undeclared CLI flag"
    )

print("test_bun_linker: 1 ok, 0 failures")
