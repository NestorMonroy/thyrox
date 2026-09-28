# F7e-2 — TPROXY contra el kernel real

## Entorno medido (2026-09-28)

- `unshare --net` crea un espacio de red propio: su inodo de red difiere del
  del anfitrión.
- `iptables` (1.8.10, nf_tables) y `nsenter` presentes; una regla de
  `mangle OUTPUT` añadida dentro del espacio no aparece en el del anfitrión.
- `ip` (iproute2) ausente: lo pide F7e-2a con `THYROX_INSTALL_IPROUTE2=1`.

## F7e-2b — un espacio de red propio para las órdenes

`src/tproxy/networkNamespace.ts`: `openNetworkNamespace()` lanza
`unshare --net -- sleep infinity`, espera a que su espacio de red deje de ser
el nuestro, y da un `CommandRunner` que entra con
`nsenter --net=/proc/<pid>/ns/net`, el mismo contrato que
`applyTproxy`/`revertTproxy` ya aceptan. `close()` termina el proceso y con
él el espacio.

Anulaciones (`annul-f7e2b.sh`, `results-f7e2b.txt`): las cuatro discriminan.
La primera quita el aislamiento y por construcción escribe en el anfitrión;
el guion retira esa regla con un `trap` al salir, y se comprobó el
`mangle OUTPUT` del anfitrión vacío después.

En la primera ejecución dos no discriminaban:

- **la espera a que exista el espacio**: con un `unshare` rápido la carrera
  nunca se perdía. Se añadió el caso con un `unshare` lento (0.3 s).
- **el error de arranque guardado**: era redundante con la rama de pid
  ausente. Se retiró; esa rama espera el evento `error` y lo nombra.
