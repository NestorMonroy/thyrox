# p11-loose

## [9] TASK-THYROX-0250 — Componer la línea Claude-Session de sesión remota en la atribución

Status on board: pending

En 2.1.275 getAttributionTexts es asíncrono y agrega la línea `Claude-Session: <url>` (y la URL al pie de PR) cuando la sesión es remota (_cn/y_n/PMo del chunk q2gh92k2). thyrox no tiene el constructor de URL de sesión remota (Vl/Rq/Bmn). Portar ese constructor y la composición, y decidir con el ejecutor si getAttributionTexts pasa a async (cambia a sus tres consumidores).

## [13] TASK-THYROX-0277 — Mapear los 2947 conceptos filtrados a thyrox con headless-pool

Status on board: pending

356 notas, un claude -p por nota; veredictos YA-EXISTE/PARCIAL/AUSENTE-APLICABLE/NO-APLICA con evidencia; agregar y adoptar los AUSENTE-APLICABLE.

## [56] TASK-THYROX-0261 — Decidir el consumidor por defecto de user_wiring.declared_wiring

Status on board: pending

user_wiring.py:100 usa base.parent / "kaupamex-docs" cuando no se declara consumidor, y main() no ofrece --consumidor. reach.consumer_root() rehúsa desde el proveedor y desde /home/user el ascenso tomaría el home por consumidor (tiene .claude/). Elegir la cadena: parámetro → THYROX_CONSUMER → invocador → rehúso nombrando la variable; añadir --consumer a main y medir qué invoca install() hoy.

## [258] TASK-THYROX-0509 — Relevo de sesión corregido: fuentes de get_session, rama por git, pre-flight y setup de la sesión nueva

Status on board: pending

Tres correcciones del análisis: (1) get_session da la membresía, la rama sale de git en cada clon (sus sources registran l4/l9 y api sin revisión); (2) declarado ≠ instalado ≠ cargado: si falta instalar, el veredicto es instalar primero (bin/user_wiring --write en la sesión nueva), no relevar; (3) el script no emite veredicto del relevo, avisa cuando el payload pierde fuentes. Pre-flight: repos sin clon, ramas ausentes, settings.local.json, .env, .venv. create_session acepta una sola fuente: las demás van al prompt con add_repo y su rama.
