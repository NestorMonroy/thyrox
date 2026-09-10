// ══════════════════════════════════════════════════════════════════
// restored-src/src/tools/SkillTool/SkillTool.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 5 · líneas de código: 42
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch22.md · líneas 108-116 ───
const remoteSkillModules = feature('EXPERIMENTAL_SKILL_SEARCH')
  ? {
      ...(require('../../services/skillSearch/remoteSkillState.js') as ...),
      ...(require('../../services/skillSearch/remoteSkillLoader.js') as ...),
      ...(require('../../services/skillSearch/telemetry.js') as ...),
      ...(require('../../services/skillSearch/featureCheck.js') as ...),
    }
  : null

// ─── ausente: líneas 117-380 (264 líneas sin fragmento en el corpus) ───

// ─── part6/ch22.md · líneas 381-395 ───
const slug = remoteSkillModules!.stripCanonicalPrefix(normalizedCommandName)
if (slug !== null) {
  const meta = remoteSkillModules!.getDiscoveredRemoteSkill(slug)
  if (!meta) {
    return {
      result: false,
      message: `Remote skill ${slug} was not discovered in this session.`,
      errorCode: 6,
    }
  }
  return { result: true }
}

// ─── ausente: líneas 396-450 (55 líneas sin fragmento en el corpus) ───

// ─── part6/ch22.md · líneas 451-467 ───
const ruleMatches = (ruleContent: string): boolean => {
  const normalizedRule = ruleContent.startsWith('/')
    ? ruleContent.substring(1)
    : ruleContent
  if (normalizedRule === commandName) return true
  if (normalizedRule.endsWith(':*')) {
    const prefix = normalizedRule.slice(0, -2)
    return commandName.startsWith(prefix)
  }
  return false
}

// ─── ausente: líneas 468-620 (153 líneas sin fragmento en el corpus) ───

// ─── part6/ch22.md · líneas 621-632 ───
if (command?.type === 'prompt' && command.context === 'fork') {
  return executeForkedSkill(...)
}
// ... inline execution path ...

// ─── ausente: líneas 633-874 (242 líneas sin fragmento en el corpus) ───

// ─── part6/ch22.md · líneas 875-908 ───
const SAFE_SKILL_PROPERTIES = new Set([
  'type', 'progressMessage', 'contentLength', 'model', 'effort',
  'source', 'name', 'description', 'isEnabled', 'isHidden',
  'aliases', 'argumentHint', 'whenToUse', 'paths', 'version',
  'disableModelInvocation', 'userInvocable', 'loadedFrom',
  // ...
])
