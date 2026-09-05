// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{qi}from"/$bunfs/root/chunk-77152aqa.js";import{execFile as x,execFileSync as O}from"child_process";import{chmod as h,mkdir as l,readFile as b,writeFile as p}from"fs/promises";import{join as s,resolve as k}from"path";import{promisify as P}from"util";var f=P(x),A=/^[a-zA-Z0-9_-]+$/,rNn=[2,34];function Ugr(t){let e=/git version (\d+)\.(\d+)/.exec(t);if(!e)return null;return[Number(e[1]),Number(e[2])]}function jgr(t){let e=Ugr(t);if(e===null)return null;let[n,o]=e,[i,r]=rNn;return n>i||n===i&&o>=r}async function ICr(t){let e=(await f("git",["--version"],{windowsHide:!0})).stdout,n=jgr(e);if(n===null)t.onStatus(`[runner:git] --configure-git: could not parse git version from "${e.trim()}"; proceeding without version check`);else if(!n){let[g,m]=rNn;throw Error(`--configure-git requires git >= ${g}.${m} for SSH commit signing (found: ${e.trim()}). Upgrade git in your runner image, or omit --configure-git and manage git identity yourself`)}let o=s(t.baseDir,".runner");await l(o,{recursive:!0});let i=s(o,"code-sign"),r=s(o,"commit_signing_key.pub"),a=_(t.execPath);await p(i,a,{mode:493}),await h(i,493),await p(r,"");let c=[["user.name","Claude"],["user.email","noreply@anthropic.com"],["gpg.format","ssh"],["gpg.ssh.program",i],["user.signingkey",r],["commit.gpgsign","true"],["tag.gpgsign","true"],["push.negotiate","true"]],u=t.gitConfigPath?["--file",t.gitConfigPath]:["--global"];for(let[g,m]of c)await f("git",["config",...u,"--replace-all",g,m],{windowsHide:!0});return t.onStatus(`[runner:git] --configure-git: identity=Claude <noreply@anthropic.com>, gpg.ssh.program=${i}`),await zgr(o,u,t.onStatus),i}function _(t){return`#!/bin/sh
BIN="$CLAUDE_RUNNER_CLAUDE_BIN"
[ -n "$BIN" ] || BIN='${C(t)}'
exec "$BIN" self-hosted-runner code-sign "$@"
`}function RCr(t,e){let n=s(t,".runner");return[{path:s(n,"code-sign"),content:_(e),mode:493},{path:s(n,"commit_signing_key.pub"),content:"",mode:420}]}function $7t(t){let e=s(t,".runner");return[["user.name","Claude"],["user.email","noreply@anthropic.com"],["user.signingkey",s(e,"commit_signing_key.pub")],["gpg.format","ssh"],["gpg.ssh.program",s(e,"code-sign")],["commit.gpgsign","true"],["tag.gpgsign","true"],["push.negotiate","true"],["core.hooksPath",s(e,"git-hooks")]]}async function xCr(){try{let{stdout:t}=await f("git",["--version"],{windowsHide:!0});return t}catch{return""}}var Ggr=`#!/bin/sh
test "$1" = get || exit 0
printf "username=unused\\npassword=%s\\n" "$CLAUDE_CODE_SESSION_ACCESS_TOKEN"
`;function Wgr(t){return s(t,".runner","git-proxy-cred")}function LCr(t){let e=s(t,".runner","git-hooks");return[...w.map((n)=>({path:s(e,n),content:y})),...["commit-msg","prepare-commit-msg"].map((n)=>({path:s(e,n),content:E}))]}async function PCr(t){let e=t.apiBaseUrl.replace(/\/+$/,""),n;try{n=new URL(e).host}catch{throw Error(`--use-anthropic-git-proxy: apiBaseUrl is not a valid URL: ${e}`)}let o=s(t.baseDir,".runner");await l(o,{recursive:!0});let i=Wgr(t.baseDir);await p(i,Ggr,{mode:448}),await h(i,448);let r=t.gitConfigPath?["--file",t.gitConfigPath]:["--global"],a=[[`credential.https://${n}.helper`,`!'${C(i)}'`],[`credential.https://${n}.useHttpPath`,"false"],[`credential.https://${n}.username`,"unused"],[`http.https://${n}/.proactiveAuth`,"basic"]];for(let[c,u]of a)await f("git",["config",...r,"--replace-all",c,u],{windowsHide:!0});return t.onStatus(`[runner:git] --use-anthropic-git-proxy: credential helper registered for https://${n} (${i})`),e}async function zgr(t,e,n){let o=s(t,"git-hooks"),i=e[0]==="--file"?e:[],r=await f("git",["config",...i,"--get","core.hooksPath"],{windowsHide:!0}).then((a)=>a.stdout.trim(),()=>"");if(r!==""&&r!==o){n(`[runner:git] --configure-git: core.hooksPath already set (${r}); skipping Co-authored-by hook install so existing hooks keep running`);return}await l(o,{recursive:!0});for(let a of w){let c=s(o,a);await p(c,y,{mode:493}),await h(c,493)}for(let a of["commit-msg","prepare-commit-msg"]){let c=s(o,a);await p(c,E,{mode:493}),await h(c,493)}await f("git",["config",...e,"--replace-all","core.hooksPath",o],{windowsHide:!0}),n(`[runner:git] --configure-git: core.hooksPath=${o}`)}var w=["applypatch-msg","pre-applypatch","post-applypatch","pre-commit","pre-merge-commit","post-commit","pre-rebase","post-checkout","post-merge","pre-push","reference-transaction","fsmonitor-watchman","pre-auto-gc","post-rewrite","sendemail-validate","post-index-change"],y=`#!/bin/sh
common_dir=$(git rev-parse --git-common-dir 2>/dev/null) || common_dir=.git
local_hook="$common_dir/hooks/$(basename "$0")"
[ -x "$local_hook" ] && exec "$local_hook" "$@"
exit 0
`,E=`#!/bin/sh
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
`;function C(t){return t.replace(/'/g,"'\\''")}function Vgr(t){let e=!1,n,o,i;for(let r=0;r<t.length;r++){let a=t[r];if(a==="-Y"&&t[r+1]==="sign")e=!0,r++;else if(a==="-n")n=t[++r];else if(a==="-f")o=t[++r];else if(a.startsWith("-")){if(t[r+1]!==void 0&&!t[r+1].startsWith("-"))r++}else if(i===void 0)i=a}if(!e)throw Error(`code-sign: only SSH-style signing (-Y sign) is supported; got: ${t.join(" ")}`);if(!i)throw Error("code-sign: no file specified to sign");return{bufferFile:k(i),namespace:n,keyFile:o}}async function qgr(t,e){let n=e.env.CLAUDE_CODE_REMOTE_SESSION_ID,o=e.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN,i=(e.env.ANTHROPIC_BASE_URL||e.env.SESSION_INGRESS_URL||"").replace(/\/+$/,"");if(!n||!A.test(n))throw Error("code-sign: CLAUDE_CODE_REMOTE_SESSION_ID is unset or malformed \u2014 "+"is this process a descendant of a runner-spawned session?");if(!o)throw Error("code-sign: CLAUDE_CODE_SESSION_ACCESS_TOKEN is unset");if(!i)throw Error("code-sign: ANTHROPIC_BASE_URL is unset");let r=await b(t.bufferFile,"utf8"),a=D(),c=JSON.stringify({contents:r,source:{type:"git_repository"},git_object_format:a}),u=`${i}/v1/code/sessions/${n}/sign-commit`,g=await e.fetchFn(u,{method:"POST",headers:{"content-type":"application/json","anthropic-version":"2023-06-01","x-environment-runner-version":`shr-${{ISSUES_EXPLAINER:"report the issue at https://github.com/anthropics/claude-code/issues",PACKAGE_URL:"@anthropic-ai/claude-code",README_URL:"https://code.claude.com/docs/en/overview",VERSION:"2.1.259",FEEDBACK_CHANNEL:"https://github.com/anthropics/claude-code/issues",BUILD_TIME:"2026-09-02T18:43:49Z",GIT_SHA:"9b549c8d1c72e407ea9d3af3b9d5e50da794ec4d",HOOKS_WORKER_URL:"/$bunfs/root/src/plugins/functionHooks/hooks-worker/hooks-worker.js",DD_SOURCEMAP_GROUP:"default"}.VERSION}`,authorization:`Bearer ${o}`},body:c,...qi({url:u}),signal:AbortSignal.timeout(30000)});if(!g.ok){let S=await g.text().catch(()=>"");throw Error(`code-sign: sign-commit returned HTTP ${g.status}`+(S?`: ${N(S,200)}`:""))}let m=await g.json();if(!m.signature)throw Error("code-sign: response missing signature");let d=`${t.bufferFile}.sig`;return await p(d,m.signature),d}function D(){try{return O("git",["rev-parse","--show-object-format"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],windowsHide:!0,cwd:void 0}).trim()==="sha256"?"sha256":"sha1"}catch{return"sha1"}}function N(t,e){return t.length>e?t.slice(0,e)+"\u2026":t}async function DCr(t){try{let e=Vgr(t);await qgr(e,{env:process.env,fetchFn:fetch}),process.exit(0)}catch(e){process.stderr.write(`${e instanceof Error?e.message:String(e)}
`),process.exit(1)}}
export{rNn,Ugr,jgr,ICr,RCr,$7t,xCr,Ggr,Wgr,LCr,PCr,zgr,Vgr,qgr,DCr};
