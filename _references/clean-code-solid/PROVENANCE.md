# `clean-code-solid` — procedencia y derechos

Creado: 2026-09-16T08:42:44
Origen: adjuntado por el ejecutor en la sesion 2026-09-16, tras que una
busqueda lo declarara ausente (`find / -name CLEAN_CODE_SOLID_PRINCIPLES.md`
→ 0 resultados). La pregunta pendiente era si se iba a adjuntar; se adjunto.

## Que es

Una guia derivada del curso *Clean Code y Principios SOLID* de Fernando
Herrera, con ejemplos en TypeScript. Cubre nombres de variable y de funcion,
DRY, clases y comentarios, el acronimo STUPID y los cinco principios SOLID.

## Por que vive en `_references/` y no en `src/` ni en `.claude/`

Es **material contra el que se construye**, no producto que THYROX entregue ni
parametro de un consumidor — el mismo papel que `odoo-tools` cumple para el
producto de kaupamex. Es la clase que este directorio ya aloja.

## Derechos

**No declara licencia, y la ausencia es deliberada** — mismo criterio que
`ccb`. El texto deriva de un curso de terceros; mientras los derechos no esten
aclarados, el estado correcto es no inventar una licencia. Se consulta, no se
redistribuye.

## Como se uso en la sesion que lo trajo

El ejecutor lo invoco para corregir dos defectos en `src/repo` y `src/lib`,
y los dos son suyos:

- **Principio 9 (la arquitectura revela intencion)** — `byte_entropy` nombraba
  su mecanismo, no su proposito. Pasa a `compressibility`.
- **Filosofia Unix en capas** — cuatro modulos hermanos, cada uno con su copia
  de `_run` y `_is_clone`. Sale `repo/clone.py` como la capa de la que
  dependen, con la dependencia apuntando hacia adentro.

Y el criterio de longitud: *"estas son funciones utilities, no necesitan
nombres de disertacion"* — maximo 4-5 silabas, longitud proporcional al scope.

## La convencion POSIX de prefijos, y donde SI aplica

El ejecutor fija `_funcname_varname` para variables de funcion en shell
(`_sudo_`, `_validate_`, `_info_`, `_group_`, `_write_`, `_read_`), con
prefijos cortos y pronunciables.

**Aplica al shell, no a Python.** En shell una variable es global por defecto,
asi que el prefijo evita colisiones que el lenguaje no evita; Python tiene
ambito de funcion y el prefijo ahi seria una codificacion sin receptor — lo
que el principio 6 prohibe. Los cinco modulos de este pase son Python, asi que
la convencion no les aplica; gobierna el shell de `src/session` y los
`.sh` que se escriban desde aqui.
