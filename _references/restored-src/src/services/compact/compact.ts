// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/compact/compact.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 15 · líneas de código: 151
// Mencionado en: appendix/f-e2e-traces.md, part7/ch26.md, part7/ch28.md
// ══════════════════════════════════════════════════════════════════

// ─── part3/ch10.md · líneas 122-130 ───
export const POST_COMPACT_MAX_FILES_TO_RESTORE = 5
export const POST_COMPACT_TOKEN_BUDGET = 50_000
export const POST_COMPACT_MAX_TOKENS_PER_FILE = 5_000
export const POST_COMPACT_MAX_TOKENS_PER_SKILL = 5_000
export const POST_COMPACT_SKILLS_TOKEN_BUDGET = 25_000

// ─── part7/ch26.md · líneas 122 ───
export const POST_COMPACT_MAX_FILES_TO_RESTORE = 5

// ─── ausente: líneas 123-226 (104 líneas sin fragmento en el corpus) ───

// ─── part3/ch09.md · líneas 227 ───
const MAX_PTL_RETRIES = 3

// ─── ausente: líneas 228-256 (29 líneas sin fragmento en el corpus) ───

// ─── part3/ch09.md · líneas 257 ───
const groups = groupMessagesByApiRound(input)

// ─── ausente: líneas 258-259 (2 líneas sin fragmento en el corpus) ───

// ─── part3/ch09.md · líneas 260-272 ───
const tokenGap = getPromptTooLongTokenGap(ptlResponse)
let dropCount: number
if (tokenGap !== undefined) {
  let acc = 0
  dropCount = 0
  for (const g of groups) {
    acc += roughTokenCountEstimationForMessages(g)
    dropCount++
    if (acc >= tokenGap) break
  }
} else {
  dropCount = Math.max(1, Math.floor(groups.length * 0.2))
}

// ─── ausente: líneas 273-277 (5 líneas sin fragmento en el corpus) ───

// ─── part3/ch09.md · líneas 278-291 ───
const sliced = groups.slice(dropCount).flat()
if (sliced[0]?.type === 'assistant') {
  return [
    createUserMessage({ content: PTL_RETRY_MARKER, isMeta: true }),
    ...sliced,
  ]
}
return sliced

// ─── ausente: líneas 292-516 (225 líneas sin fragmento en el corpus) ───

// ─── part3/ch10.md · líneas 517-522 ───
// Store the current file state before clearing
const preCompactReadFileState = cacheToObject(context.readFileState)

// Clear the cache
context.readFileState.clear()
context.loadedNestedMemoryPaths?.clear()

// ─── ausente: líneas 523-523 (1 líneas sin fragmento en el corpus) ───

// ─── part3/ch10.md · líneas 524-529 ───
// Intentionally NOT resetting sentSkillNames: re-injecting the full
// skill_listing (~4K tokens) post-compact is pure cache_creation with
// marginal benefit. The model still has SkillTool in its schema and
// invoked_skills attachment (below) preserves used-skill content. Ants
// with EXPERIMENTAL_SKILL_SEARCH already skip re-injection via the
// early-return in getSkillListingAttachments.

// ─── ausente: líneas 530-531 (2 líneas sin fragmento en el corpus) ───

// ─── part3/ch10.md · líneas 532-539 ───
const [fileAttachments, asyncAgentAttachments] = await Promise.all([
  createPostCompactFileAttachments(
    preCompactReadFileState,
    context,
    POST_COMPACT_MAX_FILES_TO_RESTORE,
  ),
  createAsyncAgentAttachmentsIfNeeded(context),
])

// ─── ausente: líneas 540-544 (5 líneas sin fragmento en el corpus) ───

// ─── part3/ch10.md · líneas 545-548 ───
const planAttachment = createPlanAttachmentIfNeeded(context.agentId)
if (planAttachment) {
  postCompactFileAttachments.push(planAttachment)
}

// ─── ausente: líneas 549-551 (3 líneas sin fragmento en el corpus) ───

// ─── part3/ch10.md · líneas 552-555 ───
const planModeAttachment = await createPlanModeAttachmentIfNeeded(context)
if (planModeAttachment) {
  postCompactFileAttachments.push(planModeAttachment)
}

// ─── ausente: líneas 556-562 (7 líneas sin fragmento en el corpus) ───

// ─── part3/ch10.md · líneas 563-585 ───
// Compaction ate prior delta attachments. Re-announce from the current
// state so the model has tool/instruction context on the first
// post-compact turn. Empty message history -> diff against nothing ->
// announces the full set.
for (const att of getDeferredToolsDeltaAttachment(
  context.options.tools,
  context.options.mainLoopModel,
  [],
  { callSite: 'compact_full' },
)) {
  postCompactFileAttachments.push(createAttachmentMessage(att))
}
for (const att of getAgentListingDeltaAttachment(context, [])) {
  postCompactFileAttachments.push(createAttachmentMessage(att))
}
for (const att of getMcpInstructionsDeltaAttachment(
  context.options.mcpClients,
  context.options.tools,
  context.options.mainLoopModel,
  [],
)) {
  postCompactFileAttachments.push(createAttachmentMessage(att))
}

// ─── ausente: líneas 586-1414 (829 líneas sin fragmento en el corpus) ───

// ─── part3/ch10.md · líneas 1415-1464 ───
export async function createPostCompactFileAttachments(
  readFileState: Record<string, { content: string; timestamp: number }>,
  toolUseContext: ToolUseContext,
  maxFiles: number,
  preservedMessages: Message[] = [],
): Promise<AttachmentMessage[]> {
  const preservedReadPaths = collectReadToolFilePaths(preservedMessages)
  const recentFiles = Object.entries(readFileState)
    .map(([filename, state]) => ({ filename, ...state }))
    .filter(
      file =>
        !shouldExcludeFromPostCompactRestore(
          file.filename,
          toolUseContext.agentId,
        ) && !preservedReadPaths.has(expandPath(file.filename)),
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxFiles)
  // ...
}

// ─── part3/ch10.md · líneas 1452-1463 ───
let usedTokens = 0
return results.filter((result): result is AttachmentMessage => {
  if (result === null) {
    return false
  }
  const attachmentTokens = roughTokenCountEstimation(jsonStringify(result))
  if (usedTokens + attachmentTokens <= POST_COMPACT_TOKEN_BUDGET) {
    usedTokens += attachmentTokens
    return true
  }
  return false
})

// ─── ausente: líneas 1464-1493 (30 líneas sin fragmento en el corpus) ───

// ─── part3/ch10.md · líneas 1494-1534 ───
export function createSkillAttachmentIfNeeded(
  agentId?: string,
): AttachmentMessage | null {
  const invokedSkills = getInvokedSkillsForAgent(agentId)

  if (invokedSkills.size === 0) {
    return null
  }

  // Sorted most-recent-first so budget pressure drops the least-relevant skills.
  let usedTokens = 0
  const skills = Array.from(invokedSkills.values())
    .sort((a, b) => b.invokedAt - a.invokedAt)
    .map(skill => ({
      name: skill.skillName,
      path: skill.skillPath,
      content: truncateToTokens(
        skill.content,
        POST_COMPACT_MAX_TOKENS_PER_SKILL,
      ),
    }))
    .filter(skill => {
      const tokens = roughTokenCountEstimation(skill.content)
      if (usedTokens + tokens > POST_COMPACT_SKILLS_TOKEN_BUDGET) {
        return false
      }
      usedTokens += tokens
      return true
    })

  if (skills.length === 0) {
    return null
  }

  return createAttachmentMessage({
    type: 'invoked_skills',
    skills,
  })
}
