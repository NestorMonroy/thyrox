# #106d-6e-2 — servicio de Cursor

Porte TDD de `omniroute: src/lib/oauth/services/cursor.ts`: la suma de
comprobación y las cabeceras de la API, la validación de un token importado
del IDE o de cursor-agent, el nombre de la cuenta desde el token o desde el
panel de cursor.com, y las instrucciones para sacar el token de `state.vscdb`.

| Archivo | Qué |
|---|---|
| `red-106d6e2.txt` | la mitad roja |
| `annul-106d6e2.sh` | 31 anulaciones |
| `rerun-106d6e2.sh` | las dos re-medidas tras afinar las pruebas |
| `results-106d6e2.txt` | veredicto |

## Veredicto de las anulaciones

29 de 31 discriminaron a la primera. Las dos que no, afinadas y re-medidas:

- **18** — los guiones del id de máquina no cuentan para el mínimo de 32: un
  UUID con guiones pasa igual con o sin quitarlos; la prueba nueva es 31
  dígitos con un guion.
- **26** — un perfil rechazado no se lee: la respuesta de la prueba no era
  JSON, así que el fallo de lectura lo tapaba; ahora el 401 trae un cuerpo
  válido.

## Cómo se prueba la suma de comprobación

La prueba no compara con un literal precalculado: invierte la codificación
(XOR con la clave rodante que empieza en 165) y exige recuperar los segundos
unix. Así la especificación vive en la prueba, y una clave inicial o una regla
de rotación distinta devuelve otra cadena (anulaciones 1 y 2).

## Divergencias declaradas

- **Funciones sueltas en vez de una clase**, con el reloj, la plataforma, la
  arquitectura y `fetch` inyectados: la suma de comprobación y las cabeceras
  se prueban sin depender de la hora ni del anfitrión.
- **`validateCursorImportToken` es síncrona**: no hace ninguna petición.
- **La versión del cliente** es la de la referencia (`cursorAgentCliVersionPin`)
  como constante con nombre, y `buildCursorHeaders` admite otra.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 296 tests, 0 fail (tsc-106d6e23-20260928T110557, común a 6e-2 y 6e-3).
