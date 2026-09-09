# Las operaciones de archivo van por Bash, no por herramienta dedicada

Leer, buscar y editar se hace con `cat`, `sed -n`, `grep`, `find`, heredocs y
guiones cortos. `Read`, `Edit` y `Write` quedan para lo que Bash genuinamente no
puede hacer.

## Por qué esta regla vive aquí y no en la inyección de la sesión

Medido (ERR-063): la directiva existía **sólo** en la inyección de auto mode al
prompt de sistema del orquestador, y **cero** de las reglas y los `CLAUDE.md`
del árbol la mencionaban. Un subagente hereda `CLAUDE.md` y `.claude/rules/`;
no hereda esa inyección. Así que la pregunta *«¿por qué los agentes no respetan
esto?»* tenía respuesta medible y no era «desobedecieron»: nunca les llegó.

THYROX es el **proveedor**, así que la regla vive aquí y los consumidores la
heredan. Ponerla en uno de ellos la volvería a hacer local.

## Escribir un archivo entero es reemplazarlo — se mira antes

`cat > archivo` y `Write(archivo)` son la misma operación: ninguna necesita
saber qué había. La defensa no es elegir la otra herramienta, es mirar
(ERR-064, que borró cinco aserciones ajenas):

```bash
test -e "$F" && { echo "YA EXISTE — leer antes de escribir"; sed -n 1,40p "$F"; }
```

Para un cambio parcial, `sed -i` sobre un patrón único, o un guion Python que
sustituya una cadena declarada — nunca reescribir el archivo entero «porque es
más rápido».

## Invocar un módulo para probarlo no es leerlo

Antes de ejecutar un módulo por su camino por defecto, se comprueba si escribe
(ERR-066, que reescribió un registro de 469 líneas al «verificar que corría»):

```bash
grep -nE "write_text|open\(.*['\"]w|\.write\(|mkdir|unlink" "$M" | head
```

Si escribe, se ejercita por su superficie inerte —`--help`, `--dry-run`— o
importando sus símbolos.
