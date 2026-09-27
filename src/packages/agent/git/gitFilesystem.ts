// Canonical owner is @thyrox/config/gitFilesystem.
export * from '@thyrox/config/gitFilesystem.js'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { clearResolveGitDirCache, getCachedBranch, getCachedDefaultBranch, getCachedHead, getCachedRemoteUrl, getCommonDir, getHeadForDir, getRemoteUrlForDir, getWorktreeCountFromFs, isSafeRefName, isShallowClone, isValidGitSha, readGitHead, readRawSymref, readWorktreeHeadSha, resetGitFileWatcher, resolveGitDir, resolveRef } from '@thyrox/config/gitFilesystem.js'
