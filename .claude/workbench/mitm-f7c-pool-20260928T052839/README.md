# Pool de escritura para el gestor MITM — preparado, no ejecutado

`headless-pool --isolation worktree --credential-proxy` con `template.md` e
`items.txt`. Rehusó con exit 2 antes de lanzar ítems (`pool.log`): el proxy de
credencial necesita una credencial propia en el entorno
(`ANTHROPIC_AUTH_TOKEN`, `THYROX_CODE_OAUTH_TOKEN`, su descriptor o
`ANTHROPIC_API_KEY`), y este shell no tiene ninguna. Se vuelve a correr igual
cuando exista; la capa de cuentas que lo haría innecesario es la tarea #106.
