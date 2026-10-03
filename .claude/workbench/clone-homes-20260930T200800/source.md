# TASK-THYROX-0675 — Empaquetado P11: install crea y registra los hogares de un clon nuevo

Análisis y medición: `README.md` de este banco (léelo completo). Serie:
Empaquetado P7 (instalar), P8 (githooks), P10 (no heredar el `.env` ajeno);
P11 es el hueco que ninguna cubre: los hogares.

## Qué pasa hoy

Un clon nuevo no tiene `.claude/jobs-ledger`, `.claude/logs`,
`.thyrox/runtime` ni `.thyrox/pool-worktrees` (ignorados por git). Cada
módulo crea su hogar la primera vez que lo usa, así que el primer uso de un
clon los «descubre»; y lo que asume que ya existen falla (una aserción de
`tests/session/test-headless-pool.sh` exige `.thyrox/runtime`). El registro
`src/paths/declarations.py` lista 2 de las 46 claves de hogar de
`.env.example`. `install.sh` sólo escribe `THYROX_ROOT`.

## Qué se pide (TDD), en este orden

1. **El registro completo.** `src/paths/declarations.py` registra cada hogar
   que el árbol resuelve por defecto: clave, default, módulo dueño y si es
   directorio o archivo. Deriva las claves de `.env.example` (no una lista
   escrita a mano que envejezca): toda clave `THYROX_*` con sufijo
   `_DIR`/`_HOME`/`_LEDGER`/`_ROOT` está registrada o excluida con su razón
   (p. ej. `THYROX_TOOLCHAIN_NODE_MODULES_HOME` es una dependencia, no un
   hogar). Una prueba falla si aparece una clave nueva sin decidir.
2. **`ensure_homes`.** Un módulo `src/paths/ensure_homes.py` con envoltorio
   `bin/ensure_homes` (generado por `src/session/generate_bin.py`, no a mano;
   `generate_bin.py --check` en verde) que resuelve cada hogar registrado con
   su default o su declaración, y crea los directorios que falten con
   `reach.ensure_home` (modos incluidos). Idempotente: la segunda corrida no
   cambia nada y lo dice. Imprime una línea por hogar (`creado` / `existía` /
   `declarado fuera del árbol`), y rehúsa con exit 2 nombrando la clave si una
   declaración apunta a un sitio no escribible. Un hogar que es archivo (un
   registro, una base) sólo asegura su directorio padre.
3. **`install.sh` lo llama** para el clon del proveedor, después de declarar
   `THYROX_ROOT`, y no se declara instalado si falla. Documenta en su
   cabecera que P11 vive aquí y que P7/P8 lo extenderán.

## Controles

- Sobre un `git clone` recién hecho a un directorio temporal (`mktemp -d`):
  antes de instalar faltan los cuatro hogares; tras `install.sh` existen
  todos los registrados; una segunda corrida no cambia nada.
- Una declaración en el `.env` del clon gana sobre el default.
- Anulación, con números: sin la llamada en `install.sh`, cae exactamente el
  caso del clon nuevo; sin la derivación desde `.env.example`, cae exactamente
  el caso de la clave sin decidir.
- Las pruebas aíslan sus hogares (`src/lib/test_homes.sh::thyrox_isolate_homes`
  o su equivalente Python) y nunca escriben en los hogares reales.
