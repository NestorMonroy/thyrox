// ══════════════════════════════════════════════════════════════════
// restored-src/src/main.tsx
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 4 · líneas de código: 25
// Mencionado en: part1/ch01.md
// ══════════════════════════════════════════════════════════════════

// ─── part1/ch01.md · líneas 9-20 ───
// nota del libro: ESLint comments and blank lines omitted
import { profileCheckpoint, profileReport } from './utils/startupProfiler.js';
profileCheckpoint('main_tsx_entry');

import { startMdmRawRead } from './utils/settings/mdm/rawRead.js';
startMdmRawRead();

import { ensureKeychainPrefetchCompleted, startKeychainPrefetch }
  from './utils/secureStorage/keychainPrefetch.js';
startKeychainPrefetch();

// ─── part1/ch01.md · líneas 21 ───
import { feature } from 'bun:bundle';

// ─── ausente: líneas 22-69 (48 líneas sin fragmento en el corpus) ───

// ─── part1/ch01.md · líneas 70-80 ───
// nota del libro: helper functions and ESLint comments omitted
const getTeammateUtils = () =>
  require('./utils/teammate.js') as typeof import('./utils/teammate.js');
// ...

const coordinatorModeModule = feature('COORDINATOR_MODE')
  ? require('./coordinator/coordinatorMode.js') as ...
  : null;

const assistantModule = feature('KAIROS')
  ? require('./assistant/index.js') as ...
  : null;

// ─── ausente: líneas 81-1570 (1490 líneas sin fragmento en el corpus) ───

// ─── part6/ch23.md · líneas 1571 ───
const hint = feature('WEB_BROWSER_TOOL')
  && typeof Bun !== 'undefined' && 'WebView' in Bun
  ? CLAUDE_IN_CHROME_SKILL_HINT_WITH_WEBBROWSER
  : CLAUDE_IN_CHROME_SKILL_HINT
