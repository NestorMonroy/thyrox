"""Genera `app-host/src/commands/initPrompts.ts` desde el texto de 2.1.283.

Entrada: `lWo.txt`, `dWo.txt` y `RFe.txt` de este banco, extraídos de
`_references/claude-code-bin/2.1.283/claude_strings.txt`. El texto se copia
tal cual (escapes `\\u2014` y `\\`` incluidos) y sólo se le aplica el mapa de
nombres de `BRANDING`, en orden, más la adaptación de la fase 0 declarada en
`PHASE0`: sin ella un proyecto con sólo `CLAUDE.md` perdería su contenido al
escribirse `THYROX.md`, que el cargador prefiere.
"""
import re
import sys
from pathlib import Path

BENCH = Path(__file__).parent
OUT = Path(sys.argv[1])

PHASE0_OLD = (
    "Before asking anything, check if CLAUDE.md already exists at the project root "
    "(just \\`cat ./CLAUDE.md\\` \\u2014 only the project-root file counts; don't explore "
    "the tree yet). This branches Phase 1."
)
PHASE0_NEW = (
    "Before asking anything, check if THYROX.md already exists at the project root "
    "(just \\`cat ./THYROX.md\\` \\u2014 only the project-root file counts; don't explore "
    "the tree yet). If it doesn't, check for the legacy CLAUDE.md (\\`cat ./CLAUDE.md\\`): "
    "thyrox reads it only while THYROX.md is absent, so treat it as the existing file and "
    "write any result to THYROX.md, carrying over what it says. This branches Phase 1."
)

# (antes, después), aplicados en este orden. Lo que thyrox sigue leyendo
# bajo `.claude/` (settings, skills, worktrees) no se toca: el prompt tiene
# que nombrar las rutas reales.
BRANDING = [
    ("Existing .claude/skills/ and .claude/rules/ directories",
     "Existing .claude/skills/, .thyrox/rules/ and .claude/rules/ directories"),
    ("existing CLAUDE.md, .claude/rules/", "existing THYROX.md or CLAUDE.md, .thyrox/rules/, .claude/rules/"),
    ("\\`.claude/rules/\\`", "\\`.thyrox/rules/\\`"),
    ("~/.claude/", "~/.thyrox/"),
    ("`claude import`", "`thyrox import`"),
    ("\\`claude import\\`", "\\`thyrox import\\`"),
    ("Claude Code (claude.ai/code)", "thyrox"),
    ("Claude Code", "thyrox"),
    ("CLAUDE.local.md", "THYROX.local.md"),
    ("CLAUDE.md", "THYROX.md"),
]
WORD = re.compile(r"\bClaude\b")


def brand(text: str) -> str:
    text = text.replace(PHASE0_OLD, PHASE0_NEW.replace("legacy CLAUDE.md", "legacy CLAUDE\x00md")
                        .replace("./CLAUDE.md", "./CLAUDE\x00md"))
    for old, new in BRANDING:
        text = text.replace(old, new)
    text = WORD.sub("thyrox", text)
    return text.replace("CLAUDE\x00md", "CLAUDE.md")


def load(name: str) -> str:
    return (BENCH / name).read_text().rstrip("\n")


old = (brand(load("lWo.txt")).replace("${lme()?", "${isImportEnabled()?")
       .replace("${RFe}", "${IMPORT_OFFER}"))
new = (brand(load("dWo.txt")).replace("${lme()?", "${isImportEnabled()?")
       .replace("${RFe}", "${IMPORT_OFFER}"))
offer = brand(load("RFe.txt"))
for label, text in (("lWo", old), ("dWo", new), ("RFe", offer)):
    if re.search(r"\bClaude\b|claude\.ai", text):
        sys.exit(f"{label}: quedó el nombre del producto tras el mapa")
if PHASE0_OLD in load("dWo.txt") and "legacy CLAUDE.md" not in new:
    sys.exit("dWo: la fase 0 no se adaptó")

OUT.write_text(f"""/**
 * Los prompts de `/init`. Generado por
 * `.claude/workbench/visible-text-thyrox-20260927T152804/gen_init_prompts.py` desde el
 * texto de 2.1.283 (`lWo`, `dWo`, `RFe`), rebautizado a thyrox; no se edita a
 * mano: se corrige el generador y se vuelve a correr.
 *
 * Selectores del ejecutable: `aWo` elige el prompt nuevo con
 * `CLAUDE_CODE_NEW_INIT` o la bandera `tengu_slate_harbor_experiment` (aquí
 * `THYROX_CODE_NEW_INIT`); `lme` añade la oferta de importación con la
 * bandera `tengu_import`.
 */
import {{ isEnvTruthy }} from '@thyrox/config/env/utils'
import {{ getFeatureValue_CACHED_MAY_BE_STALE }} from '@thyrox/config/feature-flags'

/** `aWo`. */
export function isNewInitEnabled(): boolean {{
  return (
    isEnvTruthy(process.env.THYROX_CODE_NEW_INIT) ||
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_slate_harbor_experiment', false)
  )
}}

/** `lme`. */
export function isImportEnabled(): boolean {{
  return getFeatureValue_CACHED_MAY_BE_STALE('tengu_import', false)
}}

/** `RFe`: la oferta de importar la configuración de otro agente. */
export const IMPORT_OFFER = `{offer}`

/** `lWo`: el prompt original. */
export const oldInitPrompt = (): string => `{old}`

/** `dWo`: el prompt por fases. */
export const newInitPrompt = (): string => `{new}`

/** `getPromptForCommand` de `cWo`. */
export function initPrompt(): string {{
  return isNewInitEnabled() ? newInitPrompt() : oldInitPrompt()
}}

/** La `description` de `cWo`. */
export function initCommandDescription(): string {{
  return isNewInitEnabled()
    ? 'Initialize new THYROX.md file(s) and optional skills/hooks with codebase documentation'
    : 'Initialize a new THYROX.md file with codebase documentation'
}}
""")
print(f"escrito {OUT}")
