# tsdiv

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run typecheck 2>&1; echo EXIT=$?
```

## Qué se preguntaba

Con `effortLevel` en el esquema (`tseffort2`), el `as Record<string, unknown>`
de `applySettingsChange.ts` ya no compensa nada: existía **sólo** porque la clave
faltaba. Se retiró —`const newSettings = getInitialSettings()`, la forma literal
de la fuente— y la cabecera del archivo pasó a declarar **«Sin divergencias»**.
¿Compila sin el cast?

## Qué se recogió

**5683 / 5681** — sin cambio contra `tseffort2`. El cast era puro andamiaje de la
divergencia: retirarlo no revela ningún error que estuviera tapando.

`applySettingsChange.ts` queda con **cero divergencias declaradas** contra sus 73
líneas de fuente, que es lo que un porte cerrado debe poder afirmar
(`porte-completo-no-parcial.md`).

*Metrica:* ídem `tsapphost`.
*Ciega a:* un error que el cast tapara **en runtime** y no en el tipo — el cast
era de tipos, así que no hay sitio donde eso pueda ocurrir, pero el typecheck no
lo prueba.
