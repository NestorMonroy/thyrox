// ==========================================================================
// tools/EnterPlanModeTool/EnterPlanModeTool.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/tools/EnterPlanModeTool/EnterPlanModeTool.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 10  (1 cadena, 9 nombre)
//   descartadas por ruido (>400 aparic.) : 14
//   sitios de co-ocurrencia : 3
//   regiones emitidas  : 2
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

// --- bundle[11917199:11920841]  (3642 B)
//     especificidad 11.625 · 7 anclas — 'EnterPlanMode tool cannot be used in agent contexts'(×1 g1), 'EnterPlanMode'(×7 g1), 'shouldDefer'(×51 g1), 'contexts'(×36 g2), 'isReadOnly'(×85 g3) …
function dvw(){let e=cvw();return`Use this tool proactively when you're about to start a non-trivial implementation task. Getting user sign-off on your approach before writing code prevents wasted effort and ensures alignment. This tool transitions you into plan mode where you can explore the codebase and design an implementation approach for user approval.

## When to Use This Tool

**Prefer using EnterPlanMode** for implementation tasks unless they're simple. Use it when ANY of these conditions apply:

1. **New Feature Implementation**: Adding meaningful new functionality
   - Example: "Add a logout button" - where should it go? What should happen on click?
   - Example: "Add form validation" - what rules? What error messages?

2. **Multiple Valid Approaches**: The task can be solved in several different ways
   - Example: "Add caching to the API" - could use Redis, in-memory, file-based, etc.
   - Example: "Improve performance" - many optimization strategies possible

3. **Code Modifications**: Changes that affect existing behavior or structure
   - Example: "Update the login flow" - what exactly should change?
   - Example: "Refactor this component" - what's the target architecture?

4. **Architectural Decisions**: The task requires choosing between patterns or technologies
   - Example: "Add real-time updates" - WebSockets vs SSE vs polling
   - Example: "Implement state management" - Redux vs Context vs custom solution

5. **Multi-File Changes**: The task will likely touch more than 2-3 files
   - Example: "Refactor the authentication system"
   - Example: "Add a new API endpoint with tests"

6. **Unclear Requirements**: You need to explore before understanding the full scope
   - Example: "Make the app faster" - need to profile and identify bottlenecks
   - Example: "Fix the bug in checkout" - need to investigate root cause

7. **User Preferences Matter**: The implementation could reasonably go multiple ways
   - If you would use ${Sy} to clarify the approach, use EnterPlanMode instead
   - Plan mode lets you explore first, then present options with context

## When NOT to Use This Tool

Only skip EnterPlanMode for simple tasks:
- Single-line or few-line fixes (typos, obvious bugs, small tweaks)
- Adding a single function with clear requirements
- Tasks where the user has given very specific, detailed instructions
- Pure research/exploration tasks${e}

${uvw()}## Examples

### GOOD - Use EnterPlanMode:
User: "Add user authentication to the app"
- Requires architectural decisions (session vs JWT, where to store tokens, middleware structure)

User: "Optimize the database queries"
- Multiple approaches possible, need to profile first, significant impact

User: "Implement dark mode"
- Architectural decision on theme system, affects many components

User: "Add a delete button to the user profile"
- Seems simple but involves: where to place it, confirmation dialog, API call, error handling, state updates

User: "Update the error handling in the API"
- Affects multiple files, user should approve the approach

### BAD - Don't use EnterPlanMode:
User: "Fix the typo in the README"
- Straightforward, no planning needed

User: "Add a console.log to debug this function"
- Simple, obvious implementation

User: "What files handle routing?"
- Research task, not implementation planning

## Important Notes

- This tool REQUIRES user approval - they must consent to entering plan mode
- If unsure whether to use it, err on the side of planning - it's better to get alignment upfront than to redo work
- Users appreciate being consulted before significant changes are made to their codebase
`}

// --- bundle[12669078:12670212]  (1134 B)
//     especificidad 4.772 · 5 anclas — 'shouldDefer'(×51 g1), 'contexts'(×36 g2), 'isReadOnly'(×85 g3), 'isConcurrencySafe'(×83 g4), 'isEnabled'(×251 g4)
()=>{Wn();$4i();Ls();st();wn();wr();F3n();QTw=ve(()=>pi({keywords:ft(O().min(1).max(64)).min(1).max(8).describe("Keyword phrases describing the user's intent or a named product.")})),ekw=ve(()=>ye({results:ft(D_r()),opt_in_required:Ht(!0).optional(),message:O().optional()})),tkw=ss({name:zal,searchHint:"discover MCP connectors by keyword",maxResultSizeChars:50000,shouldDefer:!0,get inputSchema(){return QTw()},get outputSchema(){return ekw()},isEnabled:WNt,isConcurrencySafe(){return!0},isReadOnly(){return!0},async description(){return Gal},async prompt(){return Wal},async call(e,t){try{let r=await tvm(e.keywords,t.abortController.signal,t.credentials);if(UEt(r))return{data:{results:[],...r}};let n=t.options.refreshMcpClients?.()??t.options.mcpClients;return{data:{results:M4i(r,n)}}}catch(r){if(t.abortController.signal.aborted)throw new na;throw Ben("search",r),new P_r("Connector registry is unavailable right now; please try again.")}},mapToolResultToToolResultBlockParam(e,t){return{tool_use_id:t,type:"tool_result",content:Re(e.opt_in_required?e:e.results)}},renderToolUseMessage(e){return(e.keywords??[]).join(", ")}})}

