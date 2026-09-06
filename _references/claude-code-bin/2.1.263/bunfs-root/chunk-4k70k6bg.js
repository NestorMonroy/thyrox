// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{As}from"/$bunfs/root/chunk-7fpmaq7k.js";import{execFile as O,execFileSync as b}from"child_process";import{chmod as h,mkdir as l,readFile as k,writeFile as p}from"fs/promises";import{join as s,resolve as P}from"path";import{promisify as A}from"util";var f=A(O),D=/^[a-zA-Z0-9_-]+$/,_=[2,34];function Pur(t){let e=/git version (\d+)\.(\d+)/.exec(t);if(!e)return null;return[Number(e[1]),Number(e[2])]}function N(t){let e=Pur(t);if(e===null)return null;let[n,o]=e,[i,r]=_;return n>i||n===i&&o>=r}async function Qpr(t){let e=(await f("git",["--version"],{windowsHide:!0})).stdout,n=N(e);if(n===null)t.onStatus(`[runner:git] --configure-git: could not parse git version from "${e.trim()}"; proceeding without version check`);else if(!n){let[g,m]=_;throw Error(`--configure-git requires git >= ${g}.${m} for SSH commit signing (found: ${e.trim()}). Upgrade git in your runner image, or omit --configure-git and manage git identity yourself`)}let o=s(t.baseDir,".runner");await l(o,{recursive:!0});let i=s(o,"code-sign"),r=s(o,"commit_signing_key.pub"),a=w(t.execPath);await p(i,a,{mode:493}),await h(i,493),await p(r,"");let c=[["user.name","Claude"],["user.email","noreply@anthropic.com"],["gpg.format","ssh"],["gpg.ssh.program",i],["user.signingkey",r],["commit.gpgsign","true"],["tag.gpgsign","true"],["push.negotiate","true"]],u=t.gitConfigPath?["--file",t.gitConfigPath]:["--global"];for(let[g,m]of c)await f("git",["config",...u,"--replace-all",g,m],{windowsHide:!0});return t.onStatus(`[runner:git] --configure-git: identity=Claude <noreply@anthropic.com>, gpg.ssh.program=${i}`),await v(o,u,t.onStatus),i}function w(t){return`#!/bin/sh
BIN="$CLAUDE_RUNNER_CLAUDE_BIN"
[ -n "$BIN" ] || BIN='${x(t)}'
exec "$BIN" self-hosted-runner code-sign "$@"
`}function Zpr(t,e){let n=s(t,".runner");return[{path:s(n,"code-sign"),content:w(e),mode:493},{path:s(n,"commit_signing_key.pub"),content:"",mode:420}]}function EJt(t){let e=s(t,".runner");return[["user.name","Claude"],["user.email","noreply@anthropic.com"],["user.signingkey",s(e,"commit_signing_key.pub")],["gpg.format","ssh"],["gpg.ssh.program",s(e,"code-sign")],["commit.gpgsign","true"],["tag.gpgsign","true"],["push.negotiate","true"],["core.hooksPath",s(e,"git-hooks")]]}async function emr(){try{let{stdout:t}=await f("git",["--version"],{windowsHide:!0});return t}catch{return""}}var Dur=`#!/bin/sh
test "$1" = get || exit 0
printf "username=unused\\npassword=%s\\n" "$CLAUDE_CODE_SESSION_ACCESS_TOKEN"
`;function $ur(t){return s(t,".runner","git-proxy-cred")}function tmr(t){let e=s(t,".runner","git-hooks");return[...y.map((n)=>({path:s(e,n),content:E})),...["commit-msg","prepare-commit-msg"].map((n)=>({path:s(e,n),content:C}))]}async function nmr(t){let e=t.apiBaseUrl.replace(/\/+$/,""),n;try{n=new URL(e).host}catch{throw Error(`--use-anthropic-git-proxy: apiBaseUrl is not a valid URL: ${e}`)}let o=s(t.baseDir,".runner");await l(o,{recursive:!0});let i=$ur(t.baseDir);await p(i,Dur,{mode:448}),await h(i,448);let r=t.gitConfigPath?["--file",t.gitConfigPath]:["--global"],a=[[`credential.https://${n}.helper`,`!'${x(i)}'`],[`credential.https://${n}.useHttpPath`,"false"],[`credential.https://${n}.username`,"unused"],[`http.https://${n}/.proactiveAuth`,"basic"]];for(let[c,u]of a)await f("git",["config",...r,"--replace-all",c,u],{windowsHide:!0});return t.onStatus(`[runner:git] --use-anthropic-git-proxy: credential helper registered for https://${n} (${i})`),e}async function v(t,e,n){let o=s(t,"git-hooks"),i=e[0]==="--file"?e:[],r=await f("git",["config",...i,"--get","core.hooksPath"],{windowsHide:!0}).then((a)=>a.stdout.trim(),()=>"");if(r!==""&&r!==o){n(`[runner:git] --configure-git: core.hooksPath already set (${r}); skipping Co-authored-by hook install so existing hooks keep running`);return}await l(o,{recursive:!0});for(let a of y){let c=s(o,a);await p(c,E,{mode:493}),await h(c,493)}for(let a of["commit-msg","prepare-commit-msg"]){let c=s(o,a);await p(c,C,{mode:493}),await h(c,493)}await f("git",["config",...e,"--replace-all","core.hooksPath",o],{windowsHide:!0}),n(`[runner:git] --configure-git: core.hooksPath=${o}`)}var y=["applypatch-msg","pre-applypatch","post-applypatch","pre-commit","pre-merge-commit","post-commit","pre-rebase","post-checkout","post-merge","pre-push","reference-transaction","fsmonitor-watchman","pre-auto-gc","post-rewrite","sendemail-validate","post-index-change"],E=`#!/bin/sh
common_dir=$(git rev-parse --git-common-dir 2>/dev/null) || common_dir=.git
local_hook="$common_dir/hooks/$(basename "$0")"
[ -x "$local_hook" ] && exec "$local_hook" "$@"
exit 0
`,C=`#!/bin/sh
common_dir=$(git rev-parse --git-common-dir 2>/dev/null) || common_dir=.git
local_hook="$common_dir/hooks/$(basename "$0")"
if [ -x "$local_hook" ]; then
  "$local_hook" "$@" || exit $?
fi
email="$CCR_SESSION_ACCOUNT_EMAIL"
nl='
'
case "$email" in
  ''|*'<'*|*'>'*|*"$nl"*) email='' ;;
esac
if [ -n "$email" ] && printf %s "$email" | LC_ALL=C grep -q '[^ -~]'; then
  email=''
fi
if [ -n "$email" ]; then
  name="\${email%%@*}"
  git interpret-trailers --in-place \\
    --if-exists addIfDifferent \\
    --trailer "Co-authored-by: $name <$email>" "$1"
fi
exit 0
`;function x(t){return t.replace(/'/g,"'\\''")}function H(t){let e=!1,n,o,i;for(let r=0;r<t.length;r++){let a=t[r];if(a==="-Y"&&t[r+1]==="sign")e=!0,r++;else if(a==="-n")n=t[++r];else if(a==="-f")o=t[++r];else if(a.startsWith("-")){if(t[r+1]!==void 0&&!t[r+1].startsWith("-"))r++}else if(i===void 0)i=a}if(!e)throw Error(`code-sign: only SSH-style signing (-Y sign) is supported; got: ${t.join(" ")}`);if(!i)throw Error("code-sign: no file specified to sign");return{bufferFile:P(i),namespace:n,keyFile:o}}async function I(t,e){let n=e.env.CLAUDE_CODE_REMOTE_SESSION_ID,o=e.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN,i=(e.env.ANTHROPIC_BASE_URL||e.env.SESSION_INGRESS_URL||"").replace(/\/+$/,"");if(!n||!D.test(n))throw Error("code-sign: CLAUDE_CODE_REMOTE_SESSION_ID is unset or malformed \u2014 "+"is this process a descendant of a runner-spawned session?");if(!o)throw Error("code-sign: CLAUDE_CODE_SESSION_ACCESS_TOKEN is unset");if(!i)throw Error("code-sign: ANTHROPIC_BASE_URL is unset");let r=await k(t.bufferFile,"utf8"),a=R(),c=JSON.stringify({contents:r,source:{type:"git_repository"},git_object_format:a}),u=`${i}/v1/code/sessions/${n}/sign-commit`,g=await e.fetchFn(u,{method:"POST",headers:{"content-type":"application/json","anthropic-version":"2023-06-01","x-environment-runner-version":`shr-${{ISSUES_EXPLAINER:"report the issue at https://github.com/anthropics/claude-code/issues",PACKAGE_URL:"@anthropic-ai/claude-code",README_URL:"https://code.claude.com/docs/en/overview",VERSION:"2.1.263",FEEDBACK_CHANNEL:"https://github.com/anthropics/claude-code/issues",BUILD_TIME:"2026-09-06T01:08:56Z",GIT_SHA:"37ae3f38d765199d54a6913cd61c6c9ad8576cc6",HOOKS_WORKER_URL:"/$bunfs/root/src/plugins/functionHooks/hooks-worker/hooks-worker.js",DD_SOURCEMAP_GROUP:"default"}.VERSION}`,authorization:`Bearer ${o}`},body:c,...As({url:u}),signal:AbortSignal.timeout(30000)});if(!g.ok){let S=await g.text().catch(()=>"");throw Error(`code-sign: sign-commit returned HTTP ${g.status}`+(S?`: ${U(S,200)}`:""))}let m=await g.json();if(!m.signature)throw Error("code-sign: response missing signature");let d=`${t.bufferFile}.sig`;return await p(d,m.signature),d}function R(){try{return b("git",["rev-parse","--show-object-format"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],windowsHide:!0,cwd:void 0}).trim()==="sha256"?"sha256":"sha1"}catch{return"sha1"}}function U(t,e){return t.length>e?t.slice(0,e)+"\u2026":t}async function rmr(t){try{let e=H(t);await I(e,{env:process.env,fetchFn:fetch}),process.exit(0)}catch(e){process.stderr.write(`${e instanceof Error?e.message:String(e)}
`),process.exit(1)}}
export{Pur,Qpr,Zpr,EJt,emr,Dur,$ur,tmr,nmr,rmr};
