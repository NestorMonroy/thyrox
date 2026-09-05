// ==========================================================================
// coordinator/coordinatorMode.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/coordinator/coordinatorMode.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 3  (1 cadena, 2 nombre)
//   descartadas por ruido (>400 aparic.) : 7
//   sitios de co-ocurrencia : 4
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

// --- bundle[2709207:2709694]  (487 B)
//     especificidad 6.075 · 2 anclas — 'CLAUDE_CODE_COORDINATOR_MODE'(×6 g1), 'COORDINATOR_MODE'(×7 g1)
()=>Ht("comms").optional().catch(void 0).describe("@internal Coordinator-mode role for this MCP server. 'comms' marks the server the coordinator uses to address the user; the coordinator tool filter lets comms-roled servers' tools through. Claude Code extension to .mcp.json \u2014 host-side config, not part of the MCP wire protocol. Coordinator mode is activated via the CLAUDE_CODE_COORDINATOR_MODE environment variable; this field only takes effect when coordinator mode is active.")

// --- bundle[16880479:16882372]  (1893 B)
//     especificidad 6.075 · 2 anclas — 'CLAUDE_CODE_COORDINATOR_MODE'(×6 g1), 'COORDINATOR_MODE'(×7 g1)
()=>{QTE=new Set(["claude-vscode","claude-desktop","claude-desktop-3p"]);ban=["CLAUDE_CODE_SAFE_MODE","CLAUDE_CODE_SIMPLE","CLAUDE_BG_POST_CLEAR_RESPAWN","CLAUDE_CODE_RESUME_INTERRUPTED_TURN","CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS","CLAUDE_CODE_RESUME_PROMPT","CLAUDE_CODE_QUESTION_PREVIEW_FORMAT","GITHUB_ACTIONS","CLAUDECODE","CLAUDE_CODE_SESSION_ID","CLAUDE_CODE_BRIDGE_SESSION_ID","CLAUDE_CODE_CHILD_SESSION","CLAUDE_CODE_EXECPATH","CLAUDE_CODE_COWORK_FRAME_ARTIFACTS","CLAUDE_CODE_SKILL_PROPOSALS","CLAUDE_CODE_EVAL_INTERVIEW_SESSION","CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR","CLAUDE_CODE_EVAL_ALLOW_ARTIFACT_PUBLISH","CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES","CLAUDE_BG_RV_AUTH","CLAUDE_BG_PTY_AUTH","CLAUDE_BG_SOCKET_TOKENS_PATH","CLAUDE_BG_ISOLATION","CLAUDE_CODE_RESUME_SOURCE_ALIVE","CLAUDE_CODE_COORDINATOR_MODE","CLAUDE_CODE_MESSAGING_SOCKET","CLAUDE_CODE_MESSAGING_TOKEN","CLAUDE_AX_SCREEN_READER","CLAUDE_CODE_SKIP_PROMPT_HISTORY","ANTHROPIC_MODEL","TERM_PROGRAM","TERM_PROGRAM_VERSION","__CFBundleIdentifier","KITTY_WINDOW_ID","WT_SESSION","KONSOLE_VERSION","VTE_VERSION","ZED_TERM","ZELLIJ","TMUX","TMUX_PANE","CLAUDE_CODE_TMUX_SESSION","CLAUDE_CODE_TMUX_PREFIX","CLAUDE_CODE_TMUX_PREFIX_CONFLICTS","STY","CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE","LC_TERMINAL","SSH_CONNECTION","SSH_CLIENT","SSH_TTY","COLORFGBG","CURSOR_TRACE_ID","GIT_ASKPASS","SSH_ASKPASS","SSH_ASKPASS_REQUIRE","VSCODE_GIT_ASKPASS_MAIN","VSCODE_GIT_ASKPASS_NODE","VSCODE_GIT_ASKPASS_EXTRA_ARGS","VSCODE_GIT_IPC_HANDLE","TERMINAL_EMULATOR","ITERM_SESSION_ID","GNOME_TERMINAL_SERVICE","XTERM_VERSION","ALACRITTY_LOG","TILIX_ID","TERMINATOR_UUID","ConEmuANSI","ConEmuPID","ConEmuTask","MSYSTEM","CLAUDE_CODE_SSE_PORT","FORCE_CODE_TERMINAL"];ekE=new Set(["CLAUDE_CODE_COWORK_FRAME_ARTIFACTS","CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR","CLAUDE_CODE_EVAL_ALLOW_ARTIFACT_PUBLISH","CLAUDE_CODE_EVAL_ALLOW_FLAG_OVERRIDES"])}

