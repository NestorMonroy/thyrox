set -e
cd /home/user/thyrox
c() { msg="$1"; shift; git -c commit.gpgsign=false commit -q -m "$msg" -- "$@" >/dev/null 2>&1 || { echo "FALLO: $msg"; return 1; }; git log -1 --format='%h %s'; }
c "Port statusLine's padding, refreshInterval and vim flag

StatusLine.tsx reads padding, which the settings schema dropped. The
2.1.282 schema declares padding, refreshInterval (>= 1, an invalid value
is discarded with .catch rather than failing the file) and
hideVimModeIndicator. Annulment: without .catch the discard test fails,
and only that one." src/packages/config/settings/types.ts src/packages/config/__tests__/statusLineSchema.test.ts
c "Drop the partial fork.ts that shadowed the full port

fork.ts ported only deriveForkSlug and claimed the rest had no home;
fork.tsx is the full port, but import('./fork.js') resolved to the
partial one, so /fork loaded a module without call. With the duplicate
gone, fork.tsx compiles for the first time: prev is inferred as
AppState, and the runWithCwdOverride(undefined) wrapper went, since it
cleared the parent's cwd override instead of preserving it." src/packages/command-runtime/src/commands/fork/fork.ts src/packages/command-runtime/src/commands/fork/fork.tsx src/packages/command-runtime/src/__tests__/portedCommandsSmoke.test.ts
c "Leave unmeasured analytics keys out of the event

Compaction counts are optional, and the agent's logEvent only took
string, number or boolean, so an unmeasured field could only travel as
a zero nobody measured. undefined is now allowed and measuredOnly drops
those keys before the host binding. The first annulment did not
discriminate (toEqual ignores undefined keys); the test now checks the
keys present, and fails without the filter." src/packages/agent/internal/logging.ts src/packages/agent/__tests__/logEventMeasured.test.ts
c "Record the active permission mode, internal ones included

createUserMessage took the mode an agent frontmatter may declare (five
external values), yet it records the mode active when the message was
sent, which can be auto or bubble. It now uses the permission package's
PermissionMode. goal_status gains paused, written by pauseGoalStopHook;
2.1.282 announces interruption pauses with a separate notice." src/packages/agent/messages.ts src/packages/agent/attachments.ts
c "Type the orphaned permission path with the real types

handleOrphanedPermissionResponse kept structural copies of the SDK
PermissionResult and the transcript AssistantMessage so the package
would not import them; both packages exist, and the copies did not fit
QueuedCommand. value is the empty tuple it always is. The bridge's
onPermissionResponse now carries SDKControlResponse, and mcp_message is
forwarded as a JSON-RPC message the way 2.1.282 does, unvalidated. The
channel handlers lost their origin-as-string double casts." src/packages/cli/src/headless/handleOrphanedPermissionResponse.ts src/packages/cli/src/headless/sdk/session/run-streaming.ts src/packages/cli/src/headless/sdk/control/handlers.ts src/packages/bridge/src/contracts.ts
c "Narrow provider notifications and effort to what flows

ProviderNotification was a string priority over an open record, so the
host's addNotification, which accepts only the priorities it can show,
did not fit; it is now the text notification the app host renders.
effortValue takes the numeric effort the runtime already accepts. The
REPL's AppStateProvider wrapper passes the real provider's props, and
the auto-updater callback accepts the null its state holds." src/packages/provider/src/contracts.ts src/packages/provider/src/claudeLegacy.ts src/packages/repl/src/appStateHooks.ts src/packages/repl/src/components/PromptInput/Notifications.tsx src/packages/repl/src/components/PromptInput/PromptInput.tsx
git push -q origin HEAD && echo PUSHED
