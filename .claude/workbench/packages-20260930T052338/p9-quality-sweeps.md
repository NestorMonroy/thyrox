# p9-quality-sweeps

## [129] TASK-THYROX-0381 — Barrido de errores en todo .py, .sh y .ts antes del Empaquetado

Status on board: in_progress

Tras cerrar MITM y la capa de cuentas (#106): correr pyright+ruff, bash -n+shellcheck y tsc de cada paquete (build y test) sobre todo thyrox, con bin/ y en segundo plano (thyrox-bg + wait-jobs). Todo error se resuelve en TDD con su anulación. Bloquea #108-#114.

## [187] TASK-THYROX-0439 — #129-rojos — dejar en verde la suite entera

Status on board: in_progress

Rojos reales tras relanzar uno por uno (banco error-sweep-129): mitmServer root-CA; dependencies (@thyrox/binary ${DEF}); exports (mitm detection/targets index, transparent-napi); sibling_exports (dist de provider); envUtils ✓; renameEnvPrefix ✓; test_env_contract_keys; test_path_arithmetic; test_pre_commit_hook (falta renameEnvPrefix.ts en la copia); test_runner (gates sin registrar); githooks identifier-language y reconcile-status; check-skill-artifacts; script-naming (31 identificadores); suite-discrimina. Pasan solos (carga): bin, impactCli, loopStreaming, markdown, gpu_monitor.

## [7] TASK-THYROX-0248 — Dar frontera pública a los paquetes @thyrox (exports + build)

Status on board: in_progress

43 paquetes sin build ni exports; 92% de las importaciones entre paquetes entran por rutas internas. Declarar exports por paquete, construir con bun build + declaraciones, unificar las dos raíces de workspace (bun.lock y src/packages/bun.lock). H-THYROX-167.

## [78] TASK-THYROX-0330 — Build JS real y dependencias @thyrox/* por versión exacta con gate

Status on board: in_progress

Directiva del ejecutor 2026-09-27: sin workspace:*. Emitir .js en dist/, exports.default → dist, cada hermano @thyrox/* con su versión exacta, gate que falle si la versión no coincide con la del hermano (evita caer al registro npm: medido, una versión que no coincide va a registry.npmjs.org).

## [44] TASK-THYROX-0303 — Medir el prefijo compartido por petición (stream-json) y cerrar el paso con tsc_cycle close

Status on board: in_progress

Hecho: stream por ítem + cost.cache_prefix (685daf77); THYROX_* TTL portado (fb893b7f). Pendiente: tsc_cycle close encadenado con --after-ok.

## [84] TASK-THYROX-0336 — Retirar de los comentarios el historial de cambios (clean-code: eso es git log)

Status on board: in_progress

Comentarios y docstrings que narran cuándo o cómo cambió algo ("sin prueba hasta el cambio de prefijo", "antes vivía en…", "Corregido 2026-…", "iter 21") en vez de la intención del código. Se desactualizan y quitan confianza al docstring; clean-code.md los prohíbe (historial de cambios → git log).

Medido 2026-09-27 sobre src/, tests/ y bin/ (5305 archivos de código versionados), líneas de comentario (//, *, #): fecha ISO 373/255 archivos · bitácora (Corregido/Añadido/Mudado…) 138/109 · "antes de/era/vivía", "hasta que/hoy" 784/456 · "ya no", previously, no longer 547/392 · iter/ronda N 25/18. Unión: 1839 líneas en 952 archivos. Lista: .claude/cache/session-traces-20260927/history-comments-files.txt. Mayores: agent 113, repl 79, config 56, tool-registry 49, provider 42.

Métrica: patrón léxico sobre líneas de comentario. Ciega a la historia narrada sin esas palabras, y sobrecuenta la intención legítima que las usa ("antes de llamar a X", procedencia de un porte, un "ya no" que describe la conducta actual). Por eso el barrido es por juicio, no sed: se reescribe a intención, la procedencia se conserva, la fecha/episodio va al commit o al hallazgo.

Cierre sugerido: detector en pretooluse_dispatch (avisa, no bloquea) + barrido por paquete. Ya corregidos: los 8 thyroxEnvReaders.test.ts y compactDeltaAttachments.test.ts.

## [104] TASK-THYROX-0356 — Unificar el vocabulario de esfuerzo declarado tres veces en @thyrox/agent

Status on board: in_progress

agent/effort.ts (EFFORT_LEVELS con none), agent/schema.ts (EFFORT_LEVELS sin none, para el frontmatter) y agent/models.ts (tipo EffortLevel sin none) declaran el mismo vocabulario. Medir qué consume cada uno; el de 6 niveles es de sesión/modelo y el de 5 del frontmatter, así que la unificación puede ser una constante base con un subconjunto derivado, no una copia. Considerar bajarla a un paquete hoja para que @thyrox/provider y @thyrox/mitm la usen sin depender de agent. TDD con anulación.

## [57] TASK-THYROX-0262 — Pagar la deuda de idioma de identificadores del proveedor al tocar cada archivo

Status on board: pending

2081 identificadores en español en 574 archivos de thyrox quedaron congelados en .claude/baselines/identifier_language_baseline.txt (H-THYROX-201), incluidos ~20 subcomandos (agregar-hallazgo, buscar-hallazgos, ingerir-board, reconciliar-todo…). Al tocar un archivo, traducir sus nombres (el subcomando con alias para el nombre viejo) y quitar sus líneas del baseline.
