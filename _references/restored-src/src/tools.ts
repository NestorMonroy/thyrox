// ══════════════════════════════════════════════════════════════════
// restored-src/src/tools.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 5 · líneas de código: 18
// Mencionado en: part1/ch01.md, part1/ch02.md
// ══════════════════════════════════════════════════════════════════

// ─── part1/ch01.md · líneas 117-119 ───
const WebBrowserTool = feature('WEB_BROWSER_TOOL')
  ? require('./tools/WebBrowserTool/WebBrowserTool.js').WebBrowserTool
  : null;

// ─── ausente: líneas 120-194 (75 líneas sin fragmento en el corpus) ───

// ─── part1/ch01.md · líneas 195-209 ───
// nota del libro: only listing some core tools
AgentTool,
TaskOutputTool,
BashTool,
// ... GlobTool/GrepTool (conditional, see Strategy 4)
FileReadTool,
FileEditTool,
FileWriteTool,
NotebookEditTool,
WebFetchTool,
WebSearchTool,
// ...

// ─── part1/ch01.md · líneas 201 ───
...(hasEmbeddedSearchTools() ? [] : [GlobTool, GrepTool]),

// ─── ausente: líneas 202-213 (12 líneas sin fragmento en el corpus) ───

// ─── part1/ch01.md · líneas 214-215 ───
...(process.env.USER_TYPE === 'ant' ? [ConfigTool] : []),
...(process.env.USER_TYPE === 'ant' ? [TungstenTool] : []),

// ─── ausente: líneas 216-216 (1 líneas sin fragmento en el corpus) ───

// ─── part1/ch01.md · líneas 217 ───
...(WebBrowserTool ? [WebBrowserTool] : []),
