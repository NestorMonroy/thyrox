# Grupo prioritario del ejecutor — un ítem de tres

Trabajas en un worktree de thyrox. Identificadores, nombres de archivo y firmas en inglés;
comentarios en español técnico, sin coloquialismos, con los términos técnicos en inglés. No
toques `_references/`, `agent-results/` ni `.claude/`. Operaciones de archivo por Bash
(`sed`, `gawk`, `bin/replace_literal`); para ejecutar una herramienta de `src/` usa su envoltorio
de `bin/`, nunca `python3 src/...` por su ruta.

## Reglas, sin excepción

- **Prohibido `git stash`** en cualquier forma.
- **Nada en segundo plano y nunca termines el turno para esperar algo**: si cierras el turno,
  el ítem termina. Corre las pruebas en primer plano, acotadas con `timeout`.
- TDD: la prueba primero, en rojo; luego el cambio. Todo arreglo trae su **control de
  anulación**: retira la causa y comprueba que caen exactamente las aserciones que dependen de
  ella; restáurala y vuelve a verde. Informa las dos salidas.
- Tu último mensaje es un informe: qué cambiaste, las pruebas con su salida y lo que queda.

Tu ítem es el que dice `Item:` al final. Haz SÓLO ese.

## Item `pgvector-apt-guard` (TASK-THYROX-0602, H-THYROX-273)

`src/lib/toolchain.sh`, `thyrox_toolchain_pgvector_install_default` (hacia la línea 391): compila
pgvector y hace `make install` sobre las rutas de la extensión. Si el paquete de apt
`postgresql-<major>-pgvector` está instalado, esos archivos son suyos: el `make install` los
sobrescribe con otra versión y un `apt upgrade` o `apt remove` posterior los pisa o los borra.
Medido: `dpkg -S` atribuía `vector.so` y `vector.control` al paquete 0.6.0 con checksums
distintos. Arreglo: antes del `make install`, si `dpkg -s postgresql-$major-pgvector` dice que
está instalado, quitarlo (`apt-get remove -y`) y **re-comprobar** con `dpkg -s` que ya no lo
está; si sigue instalado, rehusar con código distinto de 0 nombrando el paquete, sin compilar.
El comando de apt y el de dpkg deben poder sustituirse en la prueba (sigue el patrón de
variables que el propio archivo ya usa para `pg_config`). Prueba en
`tests/lib/test-toolchain-pgvector.sh` (añade casos; no rompas los existentes), con dobles de
`dpkg`/`apt-get` que registren lo que se les pidió: paquete presente → se quita antes del
`make install`; ausente → no se llama a apt remove; la re-comprobación falla → rehúsa y no
compila. Nunca ejecutes apt de verdad.

## Item `postgres-test-refusal` (TASK-THYROX-0603, H-THYROX-274)

`src/packages/store/testing/postgresTestSchema.ts`. Con `THYROX_TEST_POSTGRES_URL` declarada y
el servidor caído, cada caso intenta conectar por su cuenta y falla por separado (medido: 26 +
8 fallos de ~1 ms). Arreglo: una comprobación de alcanzabilidad **una sola vez por proceso**
(memoizada), antes del primer esquema desechable, que ante servidor inalcanzable lance UN error
con la URL enmascarada (usa `maskCredentials`), la causa del driver y la orden de arranque
(`pg_ctlcluster 16 main start`). Expónla también como función exportada (p. ej.
`assertPostgresReachable(url, deps?)`) con la conexión inyectable como ya hace
`DisposableSchemaDeps`. Pruebas en `src/packages/store/__tests__/postgresTestSchema.test.ts`:
servidor alcanzable (doble) → no lanza; inalcanzable → lanza una vez con la URL enmascarada y
sin la contraseña; memoizada → un segundo llamado no reconecta. Una prueba real contra un puerto
cerrado de `127.0.0.1` (sin servidor) es válida y no necesita PostgreSQL.

## Item `bin-wrapper-detector` (TASK-THYROX-0608)

Nuevo detector `src/hooks/detect_library_path_invocation.py`, cableado en la lista de
`src/hooks/tool_use_preflight.py` como sus hermanos. Avisa (no bloquea) cuando un `Bash` ejecuta
`python3|python|uv run python <ruta bajo src/>.py` y existe `bin/<stem>` en el árbol: el aviso
da el comando exacto con `bin/<stem>`. Medido en sesión: `python3 src/verify/check_rst_sintaxis.py`
murió con `ModuleNotFoundError: paths` teniendo `bin/check_rst_sintaxis`. No avisa si no existe
el envoltorio, ni sobre el cuerpo de un heredoc (usa `src/hooks/shell_text.py` como sus
hermanos). Además, `src/hooks/detect_rst_validation.py` **recomienda** hoy
`python3 <ruta>/check_rst_sintaxis.py` (constante `GATE`): cámbialo a `bin/check_rst_sintaxis`,
que es la forma que funciona. Ese detector no tiene prueba: créala en
`tests/hooks/test_detect_rst_validation.py` (al menos: el aviso nombra `bin/check_rst_sintaxis`
y no `python3 .../check_rst_sintaxis.py`). Pruebas en
`tests/hooks/test_detect_library_path_invocation.py` con el estilo de
`tests/hooks/test_detect_literal_replacement.py`; control de anulación de las dos mitades de
juicio (existe el envoltorio; descarte del heredoc).
