# Key-value spool storage implementation (Qt, ze, vt, er) — reachability in 2.1.283

Canonical corpus: `_references/claude-code-bin/2.1.283/bunfs-root` (read only).

| # | Question | Answer, with its source |
|---|---|---|
| 1 | Which contract does it implement? | The spool contract of the daemon's bg-dispatch: ensure the directory (`Qt`), ingest an entry (`vt`), reject with a record (`ze`), drain at cold start (`er`). The filesystem path fulfills the same contract (`mt`, `Yt(wee())`, `ut(wee())`). The storage handle exposes `ensureScope`, `read`, `write`, `delete`, `listEntries`, with keys `Re.daemon(["dispatch", name])`. |
| 2 | Where does it persist? | In the object passed as `e`/`r`: the one the rest of the client calls `storageV5`. Not a file under `wee()`. |
| 3 | Same process? | Yes: the daemon calls it with `await`, with no socket or child process involved. It is an in-process storage implementation, not a server. |
| 4 | What selects it? | Two conditions. (a) `N()` = the per-process latch from `chunk-8nz62976.js`, pinned by `dVn(CLAUDE_CODE_HOVER_REST ?? GrowthBook "tengu_hover_rest")` (`chunk-ajz830z9.js: RU`, `chunk-w1vp9f7e.js: X0r/dVn`). (b) A defined handle: `RU(e)` returns `J0r(e)` when there is a handoff, or `uVn()` when there is not. |
| 5 | Reachable in 2.1.283? | **No.** The handle's only factory is `function uVn(){if(!N())return;return}`, which returns `undefined` on both branches. `X0r` is called only with its default argument (`i??=X0r()`, `chunk-g8dwzm36.js`), and `J0r` only forwards a `backend` that `X0r` built with `uVn`. So `e === undefined` always, and the four functions take their filesystem branch even with the latch on. |
| 6 | Is the filesystem spool the effective behavior? | Yes. `Qt` → `ut(wee(),{recursive,mode:448})`; `er` → `Yt(wee())` + `mt(...)`. `vt` and `ze` are only called from the key-value branch of `er` (and from `Zt`, which only runs in that branch). |

Verdict: **latent code, not applicable to 2.1.283 parity.** It is not ported. The parity rows of `Qt` and `er` are measured against their filesystem branch only; `vt` and `ze` are recorded as latent.

Reopen condition: a build in which `uVn`, or any argument passed to `X0r`, returns a defined handle.
