/**
 * Porte COMPLETO de `ccnmt: packages/agent/staticPromptSections.ts`.
 *
 * Secciones estáticas (siempre emitidas) del system prompt, separadas de
 * `prompts.ts` para no exceder su presupuesto de líneas heredado. Cada
 * exportación corresponde a un registro `systemPromptSection(nombre, () =>
 * ...)` en `prompts.ts` y se alinea con su contraparte en el binario
 * vendorizado (`ant v2.1.139`, citado verbatim en el comentario de origen).
 */

// ant v2.1.139 4769.js: sección summarize_tool_results.
export const SUMMARIZE_TOOL_RESULTS_SECTION =
  `When working with tool results, write down any important information you might need later in your response, as the original tool result may be cleared later.`

// ant v2.1.139 4769.js:556 (VE3) — context_management. Siempre emitida; le
// dice al modelo que la auto-compactación mantendrá el trabajo en marcha,
// para que no intente cerrar prematuramente cuando la conversación crece.
export const CONTEXT_MANAGEMENT_SECTION =
  `# Context management\nWhen the conversation grows long, some or all of the current context is summarized; the summary, along with any remaining unsummarized context, is provided in the next context window so work can continue — you don't need to wrap up early or hand off mid-task.`
