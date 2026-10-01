#!/usr/bin/env bash
set -euo pipefail
cd /home/user/thyrox
eval "$(bash bin/commit_identity env)"
git commit -q -F - -- src/packages/provider/src/accounts/connectionStoreHome.ts src/packages/provider/src/anthropicHttp.ts src/packages/provider/bin/credentialProxy.ts src/packages/provider/package.json src/packages/provider/__tests__/accounts/connectionStoreHome.test.ts src/packages/provider/__tests__/credentials.test.ts src/packages/cli/src/entry/print.ts src/packages/cli/src/entry/printDelegation.ts src/packages/cli/src/entry/runLoop.ts src/packages/cli/__tests__/printDelegation.test.ts src/packages/store/db.ts <<'MSG'
Resolve thyrox -p's credential from the connection store

The PROVIDER_CONNECTION branch of resolveCredential was unreachable in
production: the delegation decision, the HTTP provider built by
runLoop and the credential proxy all called it without a store, so a
stored Anthropic connection never kept thyrox -p from delegating to
the host's claude -p. And the key written by generateStorageKey to .env
was never read: the field cipher only looked at the process env, so
connections were stored in plain text.

- declaredStorageKey takes the key from the process env or, failing
  that, from the .env declaration (envValue of @thyrox/paths).
- openExistingConnectionStore opens the store only if its database
  exists and never creates the providers home; the three callers use
  it and close it after resolving.
- OpenLocalOptions declares readwrite, which bun:sqlite needs together
  with create: false.

Nullification: removing the .env fallback fails exactly the two tests
that depend on it (8 pass, 2 fail).

Refs: TASK-THYROX-0495
MSG
git commit -q -F - -- src/session/headless-pool.sh tests/session/test-headless-pool.sh <<'MSG'
Default every pool item's cache TTL to one hour

Per the executor, the prompt cache TTL of a pool item is a constant
one hour unless the option or the environment declares another: the
history no longer derives it (it still derives --memfree and the
width). Without a declaration the pool now says "cache-ttl: 1h
(constant)" and exports THYROX_CODE_PROMPT_CACHE_TTL=1h to thyrox -p.
MSG
git commit -q -F - -- src/packages/audio-capture-napi/tsconfig.build.json src/packages/bridge/tsconfig.build.json src/packages/claude-for-chrome-mcp/tsconfig.build.json src/packages/color-diff-napi/tsconfig.build.json src/packages/computer-use-input/tsconfig.build.json src/packages/computer-use-swift/tsconfig.build.json src/packages/context-compression/tsconfig.build.json src/packages/coordination/tsconfig.build.json src/packages/headless-sdk/tsconfig.build.json src/packages/ide/tsconfig.build.json src/packages/image-processor-napi/tsconfig.build.json src/packages/mcp-runtime/tsconfig.build.json src/packages/modifiers-napi/tsconfig.build.json src/packages/output/tsconfig.build.json src/packages/server/tsconfig.build.json src/packages/skills/tsconfig.build.json src/packages/stdin-napi/tsconfig.build.json src/packages/teleport/tsconfig.build.json src/packages/transparent-napi/tsconfig.build.json src/packages/url-handler-napi/tsconfig.build.json src/packages/voice/tsconfig.build.json  <<'MSG'
Record the tsconfig excludes the package typecheck writes

check_package_typecheck regenerates each package's tsconfig.build.json
and adds node_modules and dist to its exclude list; running it on the
main tree left these 21 files changed. Committing them keeps HEAD equal
to what the tool writes, so a pool item that runs the typecheck in its
worktree does not carry the same change in its patch.
MSG
git log -3 --format='%h %s'
