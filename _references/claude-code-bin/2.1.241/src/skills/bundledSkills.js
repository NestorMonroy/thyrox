// ==========================================================================
// skills/bundledSkills.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/skills/bundledSkills.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 18  (0 cadena, 18 nombre)
//   descartadas por ruido (>400 aparic.) : 23
//   sitios de co-ocurrencia : 27  (se emiten los 6 de mayor cruce)
//   regiones emitidas  : 5
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

// --- bundle[7166590:7166795]  (205 B)
//     especificidad 19.728 · 14 anclas — 'getBundledSkillExtractDir'(×1 g1), 'registerBundledSkill'(×2 g1), 'bundledSkills'(×21 g1), 'skillRoot'(×40 g1), 'bundled'(×150 g1) …
function fmS(e,t){let r=Jtt.normalize(t);if(Jtt.isAbsolute(r)||r.split(Jtt.sep).includes("..")||r.split("/").includes(".."))throw Error("bundled file path escapes its extraction dir");return Jtt.join(e,r)}

// --- bundle[15984948:15987629]  (2681 B)
//     especificidad 11.969 · 11 anclas — 'bundledSkills'(×21 g1), 'skillRoot'(×40 g1), 'bundled'(×150 g1), 'userInvocable'(×60 g2), 'allowedTools'(×217 g2) …
prompt:`Analyze this Claude Code usage data and suggest improvements.

## CC FEATURES REFERENCE (pick from these for features_to_try):
1. **MCP Servers**: Connect Claude to external tools, databases, and APIs via Model Context Protocol.
   - How to use: Run \`claude mcp add <server-name> -- <command>\`
   - Good for: database queries, Slack integration, GitHub issue lookup, connecting to internal APIs

2. **Custom Skills**: Reusable prompts you define as markdown files that run with a single /command.
   - How to use: Create \`.claude/skills/commit/SKILL.md\` with instructions. Then type \`/commit\` to run it.
   - Good for: repetitive workflows - /commit, /review, /test, /deploy, /pr, or complex multi-step workflows

3. **Hooks**: Shell commands that auto-run at specific lifecycle events.
   - How to use: Add to \`.claude/settings.json\` under "hooks" key.
   - Good for: auto-formatting code, running type checks, enforcing conventions

4. **Headless Mode**: Run Claude non-interactively from scripts and CI/CD.
   - How to use: \`claude -p "fix lint errors" --allowedTools "Edit,Read,Bash"\`
   - Good for: CI/CD integration, batch code fixes, automated reviews

5. **Task Agents**: Claude spawns focused subagents for complex exploration or parallel work.
   - How to use: Claude auto-invokes when helpful, or ask "use an agent to explore X"
   - Good for: codebase exploration, understanding complex systems

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "claude_md_additions": [
    {"addition": "A specific line or block to add to CLAUDE.md based on workflow patterns. E.g., 'Always run tests after modifying auth-related files'", "why": "1 sentence explaining why this would help based on actual sessions", "prompt_scaffold": "Instructions for where to add this in CLAUDE.md. E.g., 'Add under ## Testing section'"}
  ],
  "features_to_try": [
    {"feature": "Feature name from CC FEATURES REFERENCE above", "one_liner": "What it does", "why_for_you": "Why this would help YOU based on your sessions", "example_code": "Actual command or config to copy"}
  ],
  "usage_patterns": [
    {"title": "Short title", "suggestion": "1-2 sentence summary", "detail": "3-4 sentences explaining how this applies to YOUR work", "copyable_prompt": "A specific prompt to copy and try"}
  ]
}

IMPORTANT for claude_md_additions: PRIORITIZE instructions that appear MULTIPLE TIMES in the user data. If user told Claude the same thing in 2+ sessions (e.g., 'always run tests', 'use TypeScript'), that's a PRIME candidate - they shouldn't have to repeat themselves.

IMPORTANT for features_to_try: Pick 2-3 from the CC FEATURES REFERENCE above. Include 2-3 items for each category.`

// --- bundle[7324148:7324398]  (250 B)
//     especificidad 10.153 · 12 anclas — 'skillRoot'(×40 g1), 'definition'(×302 g1), 'userInvocable'(×60 g2), 'allowedTools'(×217 g2), 'disableModelInvocation'(×51 g3) …
()=>{Ai();Dae();Cdf={agentType:"statusline-setup",whenToUse:"Use this agent to configure the user's Claude Code status line setting.",tools:["Read","Edit"],source:"built-in",baseDir:"built-in",model:"sonnet",color:"orange",getSystemPrompt:()=>SgS()}}

// --- bundle[11939438:11939855]  (417 B)
//     especificidad 9.805 · 11 anclas — 'skillRoot'(×40 g1), 'bundled'(×150 g1), 'userInvocable'(×60 g2), 'allowedTools'(×217 g2), 'disableModelInvocation'(×51 g3) …
e=ye({success:Bt().describe("Whether the skill is valid"),commandName:O().describe("The name of the skill"),allowedTools:ft(O()).optional().describe("Tools allowed by this skill"),model:O().optional().describe("Model override if specified"),status:Ht("inline").optional().describe("Execution status"),readOnly:Bt().optional().describe("True when the skill instructions were loaded read-only (nothing was executed)")})

// --- bundle[17557834:17558243]  (409 B)
//     especificidad 7.119 · 8 anclas — 'skillRoot'(×40 g1), 'userInvocable'(×60 g2), 'allowedTools'(×217 g2), 'disableModelInvocation'(×51 g3), 'getPromptForCommand'(×64 g3) …
//     ATRIBUCION NO DISCRIMINADA — esta misma region la reclaman: skills/loadSkillsDir.ts
n=Prn({skillName:r,displayName:void 0,description:Ozn(e.description),hasUserSpecifiedDescription:!0,markdownContent:"",allowedTools:[],argumentHint:void 0,argumentNames:[],whenToUse:void 0,version:void 0,model:void 0,disableModelInvocation:!1,userInvocable:!0,source:"userSettings",baseDir:t,loadedFrom:"syncedSkills",hooks:void 0,executionContext:void 0,agent:void 0,paths:void 0,effort:void 0,shell:void 0})

// Habia 27 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
