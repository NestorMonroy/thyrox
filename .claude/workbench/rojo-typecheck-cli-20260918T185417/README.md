# rojo-typecheck-cli

## El encargo

<!-- verbatim, sin parafrasear -->

> corregir todos los TEST que estan en RED

## Qué se midió

El gate `check-cli-typecheck` rehúsa con exit 2 y nombra cuatro paquetes como
«workspace sin enlazar», prescribiendo `cd src/packages/cli && bun install`.

Ese comando, ejecutado, responde `no changes` — los cuatro **no están
declarados** en las `dependencies` del CLI, así que no hay nada que enlazar.

## Veredicto

El rojo es **deuda heredada del porte en curso**, no una regresión: 3518
errores repartidos en diez paquetes hermanos cuyas tareas de porte siguen
abiertas. No se arregla en este pase.

Lo que sí se cierra es el hallazgo sobre el gate: su discriminador tiene dos
cubos y el fenómeno tiene tres. Ver `H-THYROX-94` en
`kaupamex-docs: source/gestion/pm/thyrox/iniciativas/completar-packages-desde-la-referencia/hallazgos/`.

## Lo que NO se tocó, a propósito

Declarar los 16 importados-sin-declarar es alcance de `TASK-THYROX-0099`, y
`TASK-THYROX-0098` puede cambiar **cómo** se declaran (izarlos a la raíz del
workspace). Un arreglo por paquete hoy chocaría con ella.
