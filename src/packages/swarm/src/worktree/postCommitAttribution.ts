/**
 * Hook post-commit de atribución de worktree — porte de
 * `ccnmt: packages/swarm/src/worktree/postCommitAttribution.ts`.
 *
 * Porte VERBATIM: en la propia fuente el cuerpo ya es un no-op
 * (`Promise.resolve()` implícito, cero efectos). Ningún consumidor de
 * este árbol lo invoca aún — se porta el shim tal cual para que su
 * firma quede disponible si `worktree/index.ts` (BLOQUEADO en este pase,
 * ver el hallazgo de ese archivo) llega a instalarse.
 */
export async function installPrepareCommitMsgHook(
  _worktreePath: string,
  _worktreeHooksDir?: string,
): Promise<void> {}
