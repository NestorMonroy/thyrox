// ══════════════════════════════════════════════════════════════════
// restored-src/src/skills/loadSkillsDir.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 6 · líneas de código: 65
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch22.md · líneas 185-206 ───
export function parseSkillFrontmatterFields(
  frontmatter: FrontmatterData,
  markdownContent: string,
  resolvedName: string,
): {
  displayName: string | undefined
  description: string
  allowedTools: string[]
  argumentHint: string | undefined
  whenToUse: string | undefined
  model: ReturnType<typeof parseUserSpecifiedModel> | undefined
  disableModelInvocation: boolean
  hooks: HooksSettings | undefined
  executionContext: 'fork' | undefined
  agent: string | undefined
  effort: EffortValue | undefined
  shell: FrontmatterShell | undefined
  // ...
}

// ─── ausente: líneas 207-371 (165 líneas sin fragmento en el corpus) ───

// ─── part6/ch22.md · líneas 372-376 ───
// Security: MCP skills are remote and untrusted — never execute inline
// shell commands (!`…` / ```! … ```) from their markdown body.
if (loadedFrom !== 'mcp') {
  finalContent = await executeShellCommandsInPrompt(...)
}

// ─── ausente: líneas 377-678 (302 líneas sin fragmento en el corpus) ───

// ─── part6/ch22.md · líneas 679-713 ───
const [
  managedSkills,      // 1. Policy-managed skills (enterprise deployment)
  userSkills,         // 2. User global skills (~/.claude/skills/)
  projectSkillsNested,// 3. Project skills (.claude/skills/)
  additionalSkillsNested, // 4. --add-dir additional directories
  legacyCommands,     // 5. Legacy /commands/ directory (deprecated)
] = await Promise.all([
  loadSkillsFromSkillsDir(managedSkillsDir, 'policySettings'),
  loadSkillsFromSkillsDir(userSkillsDir, 'userSettings'),
  // ... project and additional directories ...
  loadSkillsFromCommandsDir(cwd),
])

// ─── ausente: líneas 714-727 (14 líneas sin fragmento en el corpus) ───

// ─── part6/ch22.md · líneas 728-734 ───
const fileIds = await Promise.all(
  allSkillsWithPaths.map(({ skill, filePath }) =>
    skill.type === 'prompt'
      ? getFileIdentity(filePath)
      : Promise.resolve(null),
  ),
)

// ─── ausente: líneas 735-770 (36 líneas sin fragmento en el corpus) ───

// ─── part6/ch22.md · líneas 771-790 ───
const unconditionalSkills: Command[] = []
const newConditionalSkills: Command[] = []
for (const skill of deduplicatedSkills) {
  if (
    skill.type === 'prompt' &&
    skill.paths &&
    skill.paths.length > 0 &&
    !activatedConditionalSkillNames.has(skill.name)
  ) {
    newConditionalSkills.push(skill)
  } else {
    unconditionalSkills.push(skill)
  }
}
for (const skill of newConditionalSkills) {
  conditionalSkills.set(skill.name, skill)
}

// ─── ausente: líneas 791-1006 (216 líneas sin fragmento en el corpus) ───

// ─── part6/ch22.md · líneas 1007-1033 ───
for (const [name, skill] of conditionalSkills) {
  // ... path matching logic ...
  conditionalSkills.delete(name)
  activatedConditionalSkillNames.add(name)
}
