# Analizar los rojos Python y shell del run T-10

## Pregunta

¿Por qué `suite-full-t10` deja 18 suites Python y 22 suites shell en rojo,
y son consecuencia del cambio del provider o del entorno multi-repo?

## Método

Se leyó el log completo del job, no sólo su resumen, y se reejecutaron las 22
suites shell señaladas con las raíces del checkout actual declaradas. La sonda
`probes/replay_red_shell_suites.py` extrae la lista del propio log y guarda las
últimas veinte líneas de cada ejecución en `outputs/shell-replay.txt`.

## Resultado

Las 22 suites shell siguen saliendo con código 1. No forman un único defecto y
no proceden del cambio del endpoint del provider. Se agrupan en cinco causas:

1. **Topología heredada de `/home/user`.** Varias pruebas y gates esperan
   consumidores, baselines, `.venv`, `source/` o hooks bajo el árbol histórico.
   Este checkout vive en `/workspace/kaupamex`; cambiar sólo
   `THYROX_REACH_ROOT` no corrige literales dentro de fixtures y pruebas.
2. **Consumidores incompletos.** `test-agent-store-render-tablero.sh` necesita
   Sphinx en `kaupamex-docs/.venv`; `test-vocabulario-prosa.sh` espera el árbol
   documental `thyrox/source`; `test-merge-sqlite-union.sh` espera el store bajo
   `.claude/agent-results`, mientras el store versionado actual vive en
   `agent-results/`.
3. **Contrato de entorno desactualizado.** El gate detecta tres claves leídas y
   no declaradas: `THYROX_INSTALL_PARALLEL`,
   `THYROX_TOOLCHAIN_PARALLEL_BIN` y
   `THYROX_TOOLCHAIN_PARALLEL_INSTALL_CMD`.
4. **Registros y fixtures desalineados.** Los gates de cobertura no registran
   `check-cross-model-read.sh` y `check_rule_divergence.py`; otras pruebas crean
   árboles temporales sin los directorios que luego intentan copiar o leer.
5. **Resolución por clon incompleta.** `references-cfdi` y
   `references-docs-sat` colapsan al mismo hogar relativo, reduciendo siete
   hogares esperados a seis.

El log Python confirma las mismas familias: consumidor no declarado,
localizadores bajo `/home/user`, tres claves sin contrato, anclas documentales
ausentes, fixtures temporales incompletos y colisión de hogares de referencia.
El conteo mejoró respecto de `baseline-l2` (22 a 18 rojos Python), pero no está
cerrado.

## Ejecutabilidad

Los wrappers de `bin/` hacen `exec` directo sobre sus guiones shell fuente.
Trece destinos estaban versionados como `100644`, por lo que el wrapper era
`100755` pero fallaba con `Permission denied`. Se restauró `100755` en todos
los destinos shell alcanzados por un wrapper, incluidos los siete de
`src/session/` y `src/verify/thyrox-audit.sh`.

## Ceguera

La sonda conserva sólo las últimas veinte líneas de cada suite shell; identifica
la causa terminal, no demuestra que sea el único fallo dentro de esa suite. No
corrige los 40 rojos: separar topología, contratos, fixtures y gates requiere
tramos TDD independientes con control de anulación.

## Siguiente corte

Primero debe corregirse la topología del entorno y reejecutarse la suite: no se
debe cambiar una aserción mientras su sujeto (`/home/user/...`) no existe. Una
vez medible el mismo árbol, el primer defecto propio es declarar y probar las
tres claves `THYROX_TOOLCHAIN_*`; después siguen los registros de gates y los
fixtures temporales. Los rojos restantes se atacan uno por suite, no mediante
una relajación global.
