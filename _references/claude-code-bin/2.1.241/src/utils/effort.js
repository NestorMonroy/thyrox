// ==========================================================================
// utils/effort.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/utils/effort.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 11  (1 cadena, 10 nombre)
//   descartadas por ruido (>400 aparic.) : 22
//   sitios de co-ocurrencia : 4
//   regiones emitidas  : 3
//
// COMO SE LOCALIZO. El minificador mangla los identificadores
// locales y preserva los literales de cadena y las claves de
// objeto. Un ancla frecuente no discrimina sola; se cruza con
// las demas del mismo archivo en una ventana de 4000 B.
//
// La puntuacion de un sitio NO es su numero de anclas: es la
// suma de log10(ventanas/apariciones)/grado de cada una. El
// grado es en cuantos archivos del arbol aparece el ancla: un
// nombre que citan doce fragmentos no es de ninguno. El umbral
// se DERIVA del bundle — aqui 3.85 = log10(7062).
// ==========================================================================

// --- bundle[3746505:3746903]  (398 B)
//     especificidad 5.501 · 3 anclas — 'EffortLevel'(×9 g1), 'medium'(×198 g1), 'opus-4-6'(×55 g2)
function X$e(e){if(Txn(e))return!1;let t=kGe(e,"xhigh_effort");if(t!==void 0)return t;let r=$o(e);if(r.includes("claude-3-")||r==="claude-opus-4-0"||r==="claude-opus-4-1"||r==="claude-opus-4-5"||r==="claude-opus-4-6"||r==="claude-sonnet-4-0"||r==="claude-sonnet-4-5"||r==="claude-sonnet-4-6"||r==="claude-haiku-4-5")return!1;if(xO(r,"xhigh_effort")||r==="claude-mythos-5")return!0;return t7(Iw(e))}

// --- bundle[2736130:2737746]  (1616 B)
//     especificidad 4.447 · 2 anclas — 'EffortLevel'(×9 g1), 'medium'(×198 g1)
()=>ye({value:O().describe("Model identifier to use in API calls"),resolvedModel:O().optional().describe("Canonical wire model id this row's `value` resolves to (e.g. 'sonnet' \u2192 'claude-sonnet-5'). Lets hosts match a persisted explicit id against the alias row that covers it."),displayName:O().describe("Human-readable display name"),description:O().describe("Description of the model's capabilities"),supportsEffort:Bt().optional().describe("Whether this model supports effort levels"),supportedEffortLevels:ft(Dr(["low","medium","high","xhigh","max"])).optional().describe("Available effort levels for this model"),supportsAdaptiveThinking:Bt().optional().describe("Whether this model supports adaptive thinking (Claude decides when and how much to think)"),supportsFastMode:Bt().optional().describe("Whether this model supports fast mode"),supportsAutoMode:Bt().optional().describe("Whether this model supports auto mode"),disabled:Bt().optional().describe("@internal Model is visible but not selectable (e.g. a model the org's Zero Data Retention setting excludes). The human-readable reason is folded into `description`; a structured disabledReason field is the extension point if a consumer ever needs the reason separately."),promoListPrice:O().optional().describe("@internal List price (e.g. `$3/$15`) for a model currently on a launch promo. `description` carries only the promo price so plain-text consumers read it unambiguously; rich pickers prepend this struck-through before the first `$X/$Y` in `description`. Absent when no promo is active.")}).describe("Information about an available model.")

// --- bundle[14566178:14566418]  (240 B)
//     especificidad 3.949 · 2 anclas — 'EffortLevel'(×9 g1), 'opus-4-6'(×55 g2)
model_access:$e.array($e.object({api_name:$e.string(),entitled:$e.boolean(),max_effort_level:$e.string().nullish()}).transform(({api_name:e,entitled:t,max_effort_level:r})=>({apiName:e,entitled:t,...r!=null&&{maxEffortLevel:r}}))).nullish()

