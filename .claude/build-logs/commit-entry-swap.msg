Make entry/cli.tsx the executable, as the binary does

The bundle's entry module is bunfs-root/cli: a fast-path dispatcher
that ends by importing main and calling main(). cli/src/entry already
held both layers verbatim from ccnmt (cli.tsx, main.tsx), and ccnmt
builds and runs cli.tsx (build.ts, scripts/dev.ts). Ours ran a third
file, entry/main.ts, which did the cli layer's job under main's name
and collided with main.tsx on emission (TS5056).

- main.tsx keeps main(); its body now activates @thyrox/config and
  dispatches with runCli, which main.ts did. runClaudeCode stays in
  run-cli.ts, unwired: by that path cli.tsx with no arguments opens
  the interactive REPL and waits forever without a TTY (measured).
- main.ts is retired; tests import runCli from run-cli.ts and spawn
  cli.tsx. The entry exports go, as in ccnmt: no ./entry/* in exports.
- generate_bin discovers .tsx entrypoints and skips emitted .d.ts
  (dist/entry/cli.d.ts keeps the shebang and was proposed as
  "cli.d"). The wrapper is now bin/cli, the binary's own name.

Measured: cli suite 351/0; headless-pool with thyrox -p 8/0;
generate_bin 121/0; root tsc EXIT=0; cli repoints and
check_exports_types is 0 over 1530 entries in 47 packages. Red before
the fix: bin.test hung on cli.tsx with no arguments (170 s, stdin
/dev/null, no sockets) until main() dispatched with runCli.
