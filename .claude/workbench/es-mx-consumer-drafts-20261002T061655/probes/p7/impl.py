from pathlib import Path
import json
p = Path('tools/scripts/translation_loop.py'); s = p.read_text()
def sub(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:70], s.count(old)); s = s.replace(old, new)
sub("    translation_loop.py translate --bench B --model <id completo> [--width N] [--memfree TAM] [--timeout S]",
    "    translation_loop.py translate --bench B [--model-policy P] [--task-class C] [--width N] [--memfree TAM] [--timeout S]")
sub("    translation_loop.py advance  --batch L --model <id> [--compile] [--max-iterations N]",
    "    translation_loop.py advance  --batch L [--model-policy P] [--task-class C] [--compile] [--max-iterations N]")
sub("    translation_loop.py cycle    --batch L --model <id> [--compile] <nota.tex>...",
    "    translation_loop.py cycle    --batch L [--model-policy P] [--task-class C] [--compile] <nota.tex>...")
sub("""El traductor es `headless-pool` de THYROX vía `tools/thyrox/run` (un `claude -p`
por fragmento, repartidos con GNU Parallel); `TRANSLATION_RUNNER` lo sustituye
en las pruebas.""",
"""El traductor es `headless-pool` de THYROX vía `tools/thyrox/run`: un `thyrox -p`
por fragmento, cada uno en una ExecutionUnit (`--execution unit`) autorizada por
la identidad de trabajo de este proyecto (`ai-course-notes:es-mx/<lote>/translate/<sello>/<n>`),
repartidos con GNU Parallel. El modelo no se nombra aquí: lo elige el
recomendador de THYROX dentro de la política del proyecto
(`tools/lang/es-mx/model-policy.json`: sólo el Qwen oficial, sin respaldo al
proveedor). `TRANSLATION_RUNNER` lo sustituye en las pruebas.""")
sub("""FULL_MODEL_ID = re.compile(r"^claude-[a-z]+-\\d")
""", """# El ejecutor (TASK-THYROX-0757/0758/0759): la política de modelo del proyecto,
# la clase con que el recomendador busca un modelo cualificado y el consumidor
# con que THYROX cita cada ítem. Ninguna nombra un modelo.
DEFAULT_MODEL_POLICY = Path(__file__).resolve().parents[2] / "tools" / "lang" / "es-mx" / "model-policy.json"
DEFAULT_TASK_CLASS = "analisis"
CONSUMER = "ai-course-notes"
""")
sub("""    if not FULL_MODEL_ID.match(args.model):
        print(f"translate: `{args.model}` no es un identificador completo (claude-<familia>-<version>); "
              "headless-pool rechaza alias.", file=sys.stderr)
        return 2
""", """    if not Path(args.model_policy).is_file():
        print(f"translate: la política de modelo no se puede leer: {args.model_policy}; sin ella no se traduce "
              "(no hay modelo por defecto)", file=sys.stderr)
        return 2
""")
sub("""           "--model", args.model, "--tools", "Read,Grep",""",
"""           "--task-class", args.task_class, "--model-policy", str(args.model_policy),
           "--execution", "unit", "--work-reference", f"{CONSUMER}:es-mx/{Path(args.bench).name}/translate/{stamp}",
           "--tools", "Read,Grep",""")
sub("""    translated = cmd_translate(ns(bench=bench, model=args.model, width=args.width, memfree=args.memfree,""",
    """    translated = cmd_translate(ns(bench=bench, model_policy=args.model_policy, task_class=args.task_class,
                                  width=args.width, memfree=args.memfree,""")
sub("""        code = cmd_cycle(ns(batch=args.batch, bench=None, model=args.model, width=args.width, memfree=args.memfree,""",
    """        code = cmd_cycle(ns(batch=args.batch, bench=None, model_policy=args.model_policy, task_class=args.task_class,
                            width=args.width, memfree=args.memfree,""")
sub("""    p.add_argument("--model", required=True); p.add_argument("--width", type=int, default=DEFAULT_WIDTH)""",
    """    p.add_argument("--model-policy", type=Path, default=DEFAULT_MODEL_POLICY)
    p.add_argument("--task-class", default=DEFAULT_TASK_CLASS); p.add_argument("--width", type=int, default=DEFAULT_WIDTH)""", 3)
p.write_text(s)
w = Path('tools/scripts/translate_wave.sh'); t = w.read_text()
for old, new in [
    ("#   uv run --locked bash tools/scripts/translate_wave.sh --from N --to M [--jobs J] --model <id> [--compile]",
     "#   uv run --locked bash tools/scripts/translate_wave.sh --from N --to M [--jobs J] [--compile]"),
    ('        --model) model="$2"; shift 2 ;;\n', ''),
    ('    echo "uso: $0 --from N --to M [--jobs J] --model <id> [--compile]" >&2', '    echo "uso: $0 --from N --to M [--jobs J] [--compile]" >&2'),
    ('advance --batch "$1" --model "$model" --width', 'advance --batch "$1" --width'),
]:
    assert t.count(old) == 1, old[:60]; t = t.replace(old, new)
w.write_text(t)
Path('tools/lang/es-mx/model-policy.json').write_text(json.dumps({
    "allowed": [{"runtime": "ollama", "repository": "Qwen/Qwen2.5-7B-Instruct-GGUF", "quantization": "Q4_K_M"}],
    "fallback": {"enabled": False}}, indent=2) + "\n")
print('ok')
