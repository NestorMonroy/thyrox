# p3-permission-policy-ports

## [18] TASK-THYROX-0281 — Auditar la deriva 2.1.275 → 2.1.281 en los portes de permisos (UH y guardas)

Status on board: in_progress

Hecho: UH/ULn portados (9d19b369, H-THYROX-174). Pendiente, alcance medido en el banco analizar-qwen-code-para-thyrox-*: el resolvedor vt(e,'permission') de 2.1.281 ({requested,spellings,landing,unresolved}) y la capa de aterrizaje de enlaces (sot/WVe/sen/ien/Nr/Ir/Or/jLn, xr≙Bs) que usan Jv/ib.

## [15] TASK-THYROX-0251 — Portar la rama de productores de plugin de Lu (isSensitivePath)

Status on board: pending

Lu de 2.1.275 marca sensible un archivo bajo un directorio productor de comandos de plugin (eqr: sourceProducerPath/previousProducerPaths de installed_plugins.json) o bajo la raíz de un plugin en línea (QGr: inlinePlugins/inlinePluginsNoMcp del anfitrión), con canonicalización PS/LRn de chunk-gfewy5rb. thyrox no registra rutas productoras ni tiene la API de plugins en línea. Condición de cierre: el esquema de plugin instalado con esas dos claves y la API de raíces en línea, más la canonicalización PS.

## [72] TASK-THYROX-0324 — Juzgar contra el ejecutable las 54 ramas por NODE_ENV del código de producción

Status on board: in_progress

Censo en .claude/workbench/node-env-branches-census-*. Por aparición: si 2.1.283 tiene la misma rama (bin/binary), se queda; si no, portar la conducta de producción en TDD, como forceExit.

## [95] TASK-THYROX-0347 — Portar el estado de carga remota que lee policySettings (agn, jx, S$o)

Status on board: in_progress

dc1ef30e ported only Ma (trimmed): agn, jx and S$o — the consumers this task names — are still missing, and Ma dropped the deferred assistant, memoized eligibility, reset listener, consentedPayload/deferredPayload and the lastLoadStatusChanged emitter as 'no consumer', which the porting rule rejects. Pool group 8 item C.
