# tscli2 — el mismo typecheck, DESPUÉS del renombre del alcance

## Qué se lanzó

```
bash src/verify/check-cli-typecheck.sh
```

## Qué se preguntaba

Si reescribir las 40 líneas de `import` de `@claude-code-how-works/` a
`@thyrox/` mueve el veredicto. Es el control que separa «corregí la identidad»
de «corregí la resolución», que son dos ejes distintos.

## Qué se recogió

**No lo mueve, y ése es el resultado.** Contra `tscli`:

| Eje | antes | después |
|---|---|---|
| líneas `error TS` | 3942 | **3942** |
| `TS2307` dentro de `@ant/` | 64 | **64** |
| códigos de error con delta | — | **0** |
| `TS2307` con el alcance de la fuente | 40 | **0** |

El renombre cambió el **nombre** del módulo que no resuelve, no el hecho de
que no resuelva: `node_modules/@thyrox/` tiene **0** enlaces, así que ningún
hermano resuelve en ningún paquete. La mitad declarativa sí se cerró —
`@ant/computer-use-mcp` usaba 10 hermanos y declaraba 0; ahora los declara
`workspace:*`— y la mitad de instalación queda abierta: exige `bun install`,
que es red y disco.

*Metrica:* distribución de `error TS<n>` en los dos logs, cruzada con `join`;
y el conteo de `TS2307` acotado a rutas de `@ant/`.
*Ciega a:* si `bun install` cerraría los 3942 o sólo una parte — no se corrió.
