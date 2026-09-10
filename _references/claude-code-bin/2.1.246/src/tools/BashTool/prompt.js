// ==========================================================================
// tools/BashTool/prompt.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/tools/BashTool/prompt.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 20  (8 cadena, 12 nombre)
//   descartadas por ruido (>400 aparic.) : 19
//   sitios de co-ocurrencia : 15  (se emiten los 6 de mayor cruce)
//   regiones emitidas  : 5
//
// COMO SE LOCALIZO. El minificador mangla los identificadores
// locales y preserva los literales de cadena y las claves de
// objeto. Un ancla frecuente no discrimina sola; se cruza con
// las demas del mismo archivo en una ventana de 4000 B.
//
// La puntuacion de un sitio NO es su numero de anclas: es la
// suma de log10(ventanas/apariciones)/grado de cada una. El
// grado es en cuantos archivos del arbol aparece el ancla: un
// nombre que citan doce fragmentos no es de ninguno. El umbral
// se DERIVA del bundle — aqui 3.85 = log10(7062).
// ==========================================================================

// --- bundle[14095276:14101531]  (6255 B)
//     especificidad 41.656 · 18 anclas — '/tmp` directly - use `$TMPDIR'(×1 g1), 'All commands MUST run in sandbox mode - the `dangerouslyDisableSandbox` parameter is disabled by policy.'(×1 g1), 'Commands cannot run outside the sandbox under any circumstances.'(×1 g1), 'For temporary files, always use the `$TMPDIR` environment variable. '(×1 g1), 'TMPDIR is automatically set to the correct sandbox-writable directory '(×1 g1) …
function Ejw(e){let t=Zbr(e),r="";if(!sWn())return"";let n=UV()?N3:$3,{commit:o,pr:i}=Jbr(),s=Qbr(t,"bash_full"),a=s?`${s}

`:"",l=T$m("bash_full"),c=null;return`${`# Committing changes with git

Only create commits when requested by the user. If unclear, ask first. When the user asks you to create a new git commit, follow these steps carefully:

You can call multiple tools in a single response. When multiple independent pieces of information are requested and all commands are likely to succeed, run multiple tool calls in parallel for optimal performance. The numbered steps below indicate which commands should be batched in parallel.

Git Safety Protocol:
- NEVER update the git config
- NEVER run destructive git commands (push --force, reset --hard, checkout ., restore ., clean -f, branch -D) unless the user explicitly requests these actions. Taking unauthorized destructive actions is unhelpful and can result in lost work, so it's best to ONLY run these commands when given direct instructions 
- NEVER skip hooks (--no-verify, --no-gpg-sign, etc) unless the user explicitly requests it
- NEVER run force push to main/master, warn the user if they request it
- CRITICAL: Always create NEW commits rather than amending, unless the user explicitly requests a git amend. When a pre-commit hook fails, the commit did NOT happen \u2014 so --amend would modify the PREVIOUS commit, which may result in destroying work or losing previous changes. Instead, after hook failure, fix the issue, re-stage, and create a NEW commit
- When staging files, prefer adding specific files by name rather than using "git add -A" or "git add .", which can accidentally include sensitive files (.env, credentials) or large binaries
- NEVER commit changes unless the user explicitly asks you to. It is VERY IMPORTANT to only commit when explicitly asked, otherwise the user will feel that you are being too proactive

1. Run the following bash commands in parallel, each using the ${Mi} tool:
  - Run a git status command to see all untracked files. IMPORTANT: Never use the -uall flag as it can cause memory issues on large repos.
  - Run a git diff command to see both staged and unstaged changes that will be committed.
  - Run a git log command to see recent commit messages, so that you can follow this repository's commit message style.
2. Analyze all staged changes (both previously staged and newly added) and draft a commit message:
  - Summarize the nature of the changes (eg. new feature, enhancement to an existing feature, bug fix, refactoring, test, docs, etc.). Ensure the message accurately reflects the changes and their purpose (i.e. "add" means a wholly new feature, "update" means an enhancement to an existing feature, "fix" means a bug fix, etc.).
  - Do not commit files that likely contain secrets (.env, credentials.json, etc). Warn the user if they specifically request to commit those files
  - Draft a concise (1-2 sentences) commit message that focuses on the "why" rather than the "what"
  - Ensure it accurately reflects the changes and their purpose
3. Run the following commands in parallel:
   - Add relevant untracked files to the staging area.
   - Create the commit with a message${o?` ending with:
   ${o}`:"."}
   - Run git status after the commit completes to verify success.
   Note: git status depends on the commit completing, so run it sequentially after the commit.
4. If the commit fails due to pre-commit hook: fix the issue and create a NEW commit

Important notes:
- NEVER run additional commands to read or explore code, besides git bash commands
- NEVER use the ${n} or ${Ri} tools
- DO NOT push to the remote repository unless the user explicitly asks you to do so
- IMPORTANT: Never use git commands with the -i flag (like git rebase -i or git add -i) since they require interactive input which is not supported.
- IMPORTANT: Do not use --no-edit with git rebase commands, as the --no-edit flag is not a valid option for git rebase.
- If there are no changes to commit (i.e., no untracked files and no modifications), do not create an empty commit
- In order to ensure good formatting, ALWAYS pass the commit message via a HEREDOC, a la this example:
<example>
git commit -m "$(cat <<'EOF'
   Commit message here.${o?`

   ${o}`:""}
   EOF
   )"
</example>

`}${a}${l?`${l}

`:""}# Creating pull requests
Use the gh command via the Bash tool for ALL GitHub-related tasks including working with issues, pull requests, checks, and releases. If given a Github URL use the gh command to get the information needed.

IMPORTANT: When the user asks you to create a pull request, follow these steps carefully:

1. Run the following bash commands in parallel using the ${Mi} tool, in order to understand the current state of the branch since it diverged from the main branch:
   - Run a git status command to see all untracked files (never use -uall flag)
   - Run a git diff command to see both staged and unstaged changes that will be committed
   - Check if the current branch tracks a remote branch and is up to date with the remote, so you know if you need to push to the remote
   - Run a git log command and \`git diff [base-branch]...HEAD\` to understand the full commit history for the current branch (from the time it diverged from the base branch)
2. Analyze all changes that will be included in the pull request, making sure to look at all relevant commits (NOT just the latest commit, but ALL commits that will be included in the pull request!!!), and draft a pull request title and summary:
   - Keep the PR title short (under 70 characters)
   - Use the description/body for details, not the title
3. Run the following commands in parallel:
   - Create new branch if needed
   - Push to remote with -u flag if needed
   - Create PR using gh pr create with the format below. Use a HEREDOC to pass the body to ensure correct formatting.
<example>
gh pr create --title "the pr title" --body "$(cat <<'EOF'
## Summary
${WGt()}

## Test plan
${qGt()}${i?`

${i}`:""}
EOF
)"
</example>

Important:
- DO NOT use the ${n} or ${Ri} tools
- Return the PR URL when you're done, so the user can see it

# Other common operations
- View comments on a Github PR: gh api repos/foo/bar/pulls/123/comments${c?`

${c}`:""}`}

// --- bundle[1145185:1145467]  (282 B)
//     especificidad 7.158 · 7 anclas — 'temporary'(×51 g1), 'Commands'(×362 g1), 'allowUnsandboxedCommands'(×13 g3), 'dangerouslyDisableSandbox'(×42 g3), 'within'(×252 g2) …
//     ATRIBUCION NO DISCRIMINADA — esta misma region la reclaman: entrypoints/sandboxTypes.ts
sessionTokenVar:i1r().optional().describe("Optional name of the masked env var holding the AWS session token (temporary credentials). When set, the proxy sends the real token as x-amz-security-token on re-signed requests and adds it to the signed header set if the client did not.")

// --- bundle[3666251:3666473]  (222 B)
//     especificidad 6.660 · 3 anclas — 'claudeTempDir'(×6 g1), 'TMPDIR'(×44 g1), 'correct'(×292 g1)
lUn=`

Note: The user's next message may contain a correction or preference. Pay close attention \u2014 if they explain what went wrong or how they'd prefer you to work, consider saving that to memory for future sessions.`

// --- bundle[4524664:4525464]  (800 B)
//     especificidad 6.216 · 6 anclas — 'temporary'(×51 g1), 'correct'(×292 g1), 'within'(×252 g2), 'writable'(×320 g2), 'directly'(×341 g2) …
function Kui(e){let{skipIndex:t,heading:r="## How to save memories",file:n="memory to its own file (e.g., `user_role.md`, `feedback_testing.md`)",index:o=`\`${Sv}\``}=e;return t?[r,"",`Write each ${n} using this frontmatter format:`,"",...uyt,"",...Uvp]:[r,"","Saving a memory is a two-step process:","",`**Step 1** \u2014 write the ${n} using this frontmatter format:`,"",...uyt,"",`**Step 2** \u2014 add a pointer to that file in ${o}. \`${Sv}\` is an index, not a memory \u2014 each entry should be one line, under ~150 characters: \`- [Title](file.md) \u2014 one-line hook\`. It has no frontmatter. Never write memory content directly into \`${Sv}\`.`,"",`- \`${Sv}\` is always loaded into your conversation context \u2014 lines after ${Nne} will be truncated, so keep the index concise`,...Uvp]}

// --- bundle[9961365:9964456]  (3091 B)
//     especificidad 6.199 · 4 anclas — 'Operation not permitted'(×2 g1), 'Commands'(×362 g1), 'within'(×252 g2), 'outside'(×375 g2)
async function fQS({command:e,timeoutMs:t,context:r}){if(!hi.isSandboxingEnabled())return D6f();if(D3e()!=="strict"||ZP())return P6f();if(await hi.initialize(),!hi.isSandboxingEnabled())return D6f();let n=hi.getConfig();if(n===void 0)return Kdl();if(D3e()!=="strict")return P6f();if(n.network?.allowAllUnixSockets===!0)return Pnt("sandbox_allows_unix_sockets",`${aEe} refused: the sandbox on this device allows connections to every Unix socket (sandbox.network.allowAllUnixSockets), through which a command could reach services running outside the sandbox. Remove that setting on the device to use device_bash.`);let o=n.credentials;if([...o?.envVars??[],...o?.files??[]].some((g)=>g.mode==="mask"&&(g.injectHosts===void 0||g.injectHosts.length>0)))return Pnt("sandbox_injects_credentials",`${aEe} refused: this device's sandbox is configured to inject real credentials into sandboxed network requests (sandbox.credentials entries with mode "mask"), which a remote command must not inherit. Remove or change those entries on the device to use device_bash.`);let s=Date.now(),a,l,c=cd(),u=()=>c.abort();if(r.signal.aborted)u();r.signal.addEventListener("abort",u,{once:!0});try{if(a=await fDt(Bn(),()=>XNe(e,c.signal,"bash",{host:lr().host,timeout:t,shouldUseSandbox:!0,preventCwdChanges:!0,scrubCredentialEnv:!0})),c.signal.aborted&&a.status==="running")a.kill();l=await a.result}catch(g){if(r.signal.removeEventListener("abort",u),r.signal.aborted)return L6f(Date.now()-s);if(g instanceof C3r||g instanceof J5n||g instanceof L3r)return E(`[deviceBridge] device_bash sandbox unavailable: ${g.message}`),Kdl();return Wdl(kn(g).message)}r.signal.removeEventListener("abort",u);let d=a.taskOutput.outputFileSize;if(a.cleanup(),l.outputFilePath!==void 0)a.taskOutput.deleteOutputFile();let p=Date.now()-s;if(r.signal.aborted)return L6f(p);if(l.preSpawnError!==void 0)return Wdl(l.preSpawnError);if(l.stderr.length>0)return Wdl(l.stderr);let f=d===0&&l.stdout.length>0;if(f)E(`[deviceBridge] device_bash output not captured: ${l.stdout}`);let m=l.outputFilePath!==void 0&&d>0,h=(d>0?l.stdout:"(no output)")+(m?`
[output truncated: showing first ${Buffer.byteLength(l.stdout)} of ${d} bytes]`:"")+(f&&a.status!=="killed"?`
[the device could not capture this command's output]`:"");if(l.outputFilePath===void 0&&l.outputFileSize!==void 0)return N("tengu_device_bash_output_limit",{}),pe("device_bash","output_limit"),IXr(`${h}

The command was stopped on the device because its output exceeded the size limit; it may have partially completed. Do not retry non-idempotent commands.`);if(a.status==="killed")return N("tengu_device_bash_timed_out",{timeout_ms:t}),pe("device_bash","timed_out"),IXr(`${h}

The command was stopped on the device because it did not finish within ${t} ms; it may have partially completed. Do not retry non-idempotent commands.`);if(N("tengu_device_bash_served",{exit_zero:l.code===0,duration_ms:p,output_truncated:m,output_lost:f}),f)be("device_bash","output_lost");else Ee("device_bash");return l.code===0?{content:[{type:"text",text:h}]}:IXr(`Exit code ${l.code}
${h}`)}

// Habia 15 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
