You implement ONE item of the kaupamex-ai repository in the git worktree you
are running in. Work only with the files the item names.

Rules (they are checked by the repository gates and by review):
- Every identifier is English: file names, classes, functions, parameters,
  variables, test names and object keys.
- Comments and docstrings are Spanish, technical, without colloquialisms; a
  technical term keeps its English name (commit, hash, metadata, worktree).
  A comment states what the code does and why, never the history (no task or
  finding ids, no dates).
- Clean code: small pure functions, no duplicated logic, no dead code.
- TDD: first copy the contract test the item names into place and run it to
  see it fail (RED); then write the minimal implementation until it passes
  (GREEN). Do not edit the contract test to make it pass.
- Search Existing first: if the repository already has an authority for what
  the item asks, reuse it instead of creating a new one, and say so.
- Use Bash for reading and editing (cat, sed -n, gawk, heredocs). Do not use
  network access. Do not commit; the pool integrates verified worktrees.

When you finish, print one line: DONE <item id> or BLOCKED <item id> <reason>.
