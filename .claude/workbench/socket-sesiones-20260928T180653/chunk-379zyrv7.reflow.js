chunk-379zyrv7.js: 20 -> 7565 lineas; ancho medio 20631 -> 59
// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
// Version: 2.1.283
import{
  Le,Wo,He
}from"/$bunfs/root/chunk-2j44ssk9.js";
import{
  Sxe,R1t,ymt,vb,_mt,OF,mBe,wxe,gBe,I1t,vxe,P1t,bmt,Pde,ire,Xhn,hBe,So,q,ZYn,H1t,Ode,n8n,Exe,lre,e7,yBe,r8n,M1t,cN,io,IA,j,Te
}from"/$bunfs/root/chunk-nvht7ckf.js";
import{
  O9e,N
}from"/$bunfs/root/chunk-8nz62976.js";
import{
  l,v,U
}from"/$bunfs/root/chunk-ern0s5ks.js";
import{
  Q
}from"/$bunfs/root/chunk-jxwbd5gq.js";
import{
  zde,j0,BF,c7,zw,Xmt,Ct,xn,Ln,nM,N_,Wi,Yi,yN,Il,ns,nI,nm
}from"/$bunfs/root/chunk-yqm14hey.js";
import{
  Re,mhn
}from"/$bunfs/root/chunk-qbkceaaj.js";
import{
  b,J,tm,Fh,pf,hK,Bo,hxe,ce,rk,y1t,nzr,BYn,t
}from"/$bunfs/root/chunk-zkn0228z.js";
import{
  Se,jde
}from"/$bunfs/root/chunk-4cnes656.js";
import{
  Jd,P,re,Qd,et,zt,zm
}from"/$bunfs/root/chunk-vq0drrah.js";
import{
  f
}from"/$bunfs/root/chunk-bnk68ax9.js";
import{
  sBe,a
}from"/$bunfs/root/chunk-v49zfq06.js";
import{
  MYn,DYn,O
}from"/$bunfs/root/chunk-fmsbxtrp.js";
import{
  ixe,Rz
}from"/$bunfs/root/chunk-jwddn0q9.js";
import{
  xJ,Tjr,hUe,O$o,v8e,GUt,E8e,pft
}from"/$bunfs/root/chunk-4f2vnxsj.js";
import{
  One
}from"/$bunfs/root/chunk-crqvdanj.js";
import{
  cde,YH
}from"/$bunfs/root/chunk-pbnxt79v.js";
import{
  $o,RF,fYn,Co,ZUe,w_e
}from"/$bunfs/root/chunk-4vrsxfkn.js";
import{
  KC,bUe,Jn,Hn
}from"/$bunfs/root/chunk-sb0sw3zd.js";
import{
  Xo,ct
}from"/$bunfs/root/chunk-f5egm5fk.js";
import{
  K
}from"/$bunfs/root/chunk-4v1yym3m.js";
import{
  dl,Ss,Ui
}from"/$bunfs/root/chunk-sctj0cwn.js";
import{
  C0
}from"/$bunfs/root/chunk-z0m8rp11.js";
import{
  mne,c6,ug,Jt,Mn,O_,Tf,N3n,GYe
}from"/$bunfs/root/chunk-s7awe3vb.js";
import{
  vn
}from"/$bunfs/root/chunk-831var66.js";
import{
  an,Us
}from"/$bunfs/root/chunk-tp36n59y.js";
import{
  Q1,Ljr
}from"/$bunfs/root/chunk-nm4svxjn.js";
import{
  mft,n6n,gz,n_e,Z1
}from"/$bunfs/root/chunk-dnk17b78.js";
import{
  Jb,a6n,kUe,Uv,pde,Qb,o,k,H,$ne,df,ae,jRe,A,o_e,u,Ze,Fe,Jo,fe,wft,G,R,c6n,d6n,xgn,wA,Bi
}from"/$bunfs/root/chunk-dk5kbfrn.js";
import{
  zn,uBt,Bg
}from"/$bunfs/root/chunk-aqd10mmn.js";
import{
  Fgn
}from"/$bunfs/root/chunk-p19h7m67.js";
import{
  Kt
}from"/$bunfs/root/chunk-nzbykwxn.js";
import{
  QUe,uYn,XBt,pYn,sxe,JBt,Qr
}from"/$bunfs/root/chunk-7h88gd3q.js";
import{
  B,D
}from"/$bunfs/root/chunk-153dnzje.js";
import{
  mf,rt
}from"/$bunfs/root/chunk-nwpc1c89.js";
import{
  vo
}from"/$bunfs/root/chunk-ghttqp33.js";
var NL=["acceptEdits","auto","bypassPermissions","default","dontAsk","plan"],Ts=[...NL],KE=Ts,$L="manual";
function Dm(e){
  return e==="manual"?"default":e
}function Ng(e){
  let n=Dm(e);
  return Ts.find((s)=>s===n)
}var _ne=`Cannot set permission mode: must be one of ${NL.join(", ")}`,wt={
  dangerousRemoval:{
    bypassImmune:!0,classifierRouted:!0,autoModeDeny:!0,hostPersonOnly:!1,localProjectionOnly:!1
  },backgroundOperator:{
    bypassImmune:!1,classifierRouted:!0,autoModeDeny:!1,hostPersonOnly:!1,localProjectionOnly:!1
  },suspiciousWindowsPath:{
    bypassImmune:!1,classifierRouted:!0,autoModeDeny:!1,hostPersonOnly:!1,localProjectionOnly:!1
  },isolatePeerMachines:{
    bypassImmune:!0,classifierRouted:!1,autoModeDeny:!1,hostPersonOnly:!1,localProjectionOnly:!1
  },restrictedMode:{
    bypassImmune:!0,classifierRouted:!1,autoModeDeny:!1,hostPersonOnly:!1,localProjectionOnly:!1
  },outsideReadsBlocked:{
    bypassImmune:!0,classifierRouted:!1,autoModeDeny:!1,hostPersonOnly:!1,localProjectionOnly:!1
  },claudeSettingsFile:{
    bypassImmune:!1,classifierRouted:!1,autoModeDeny:!1,hostPersonOnly:!0,localProjectionOnly:!1
  },...{
  },...{
  }
};
function XFe(e){
  return Yn(e).some((n)=>wt[n]?.bypassImmune===!0)
}function Yn(e){
  return[...e.circuitBreaker!==void 0?[e.circuitBreaker]:[],...e.also??[]]
}function qq(e){
  return e.circuitBreaker!==void 0&&wt[e.circuitBreaker]?.classifierRouted===!0
}function lUt(e){
  return e.circuitBreaker!==void 0&&wt[e.circuitBreaker]?.autoModeDeny===!0
}function Upt(e){
  return Yn(e).some((n)=>wt[n]?.hostPersonOnly===!0)
}function VBr(e){
  return Yn(e).some((n)=>wt[n]?.localProjectionOnly===!0)
}function qBr(e){
  return e.decideLocation==="pre-ask"
}function cUt(e,n){
  return e.behavior!=="allow"&&e!==n
}var KBr=["rule","mode","subcommandResults","permissionPromptTool","hook","asyncAgent","sandboxOverride","workingDir","safetyCheck","classifier","other"];
var JFe="Auto-allowed with sandbox (autoAllowBashIfSandboxed enabled)",ERe="Read-only command is allowed",dUt="Command is read-only and safe to execute",uUt="All pipeline commands are individually allowed, some only by the read-only allowlist",pUt="Auto mode held this command for the server-side classifier to review",YBr="Path is outside allowed working directories",fUt="--restricted: path outside the working directory",Fx="Reads outside the working directories are blocked (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.",wmn="permission check needs a working directory; the session has none",Bpt=new Map([["python",new Set(["-c"])],["node",new Set(["-e","--eval","-p","--print"])],["nodejs",new Set(["-e","--eval","-p","--print"])],["bun",new Set(["-e","--eval","-p","--print"])],["perl",new Set(["-e","-E"])],["ruby",new Set(["-e"])],["php",new Set(["-r"])],["bash",new Set(["-c"])],["sh",new Set(["-c"])],["zsh",new Set(["-c"])],["dash",new Set(["-c"])],["ksh",new Set(["-c"])],["lua",new Set(["-e"])],["luajit",new Set(["-e"])],["tsx",new Set(["-e","--eval","-p","--print"])],["deno",new Set(["eval"])],["Rscript",new Set(["-e"])],["julia",new Set(["-e","-E"])],["osascript",new Set(["-e"])]]);
function yF(e){
  return e?.type==="safetyCheck"&&e.circuitBreaker==="outsideReadsBlocked"
}function $g(e){
  let n=`${e} names a path that is computed at run time, which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)`;
  return{
    behavior:"ask",message:n,decisionReason:{
      type:"safetyCheck",reason:n,classifierApprovable:!1,circuitBreaker:"outsideReadsBlocked"
    }
  }
}function _F(e){
  let n=`${e}; under the read block (permissions.blockReadsOutsideWorkingDirectories) a command the shell parser cannot analyze asks the person`;
  return{
    behavior:"ask",message:n,decisionReason:{
      type:"safetyCheck",reason:n,classifierApprovable:!1,circuitBreaker:"outsideReadsBlocked"
    },suggestions:[]
  }
}function mUt(){
  return{
    behavior:"ask",message:"This sed script is not on the allowlist and can read or write any file, which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)",decisionReason:{
      type:"safetyCheck",reason:"This sed script is not on the allowlist and can read or write any file, which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)",classifierApprovable:!1,circuitBreaker:"outsideReadsBlocked"
    }
  }
}var jpt="bashCommandClamp: no clamp rule matches this command",gUt="bashCommandClamp fail-closed: permission check crashed",kRe="Classifier unavailable",vmn="Auto mode unavailable \u2014 stopped after repeated responses with no safety verdict",Emn="Auto mode could not evaluate this action and is blocking it for safety",YYe="Auto mode classifier transcript exceeded context window \u2014 falling back to manual approval (try /compact to reduce conversation size)",XYe="Memory is paused. Run /pause-memory to resume automemory.",kmn="memory access blocked by /pause-memory",Tmn=["classifier_transcript_too_long","outside_reads_blocked","memory_paused"];
function rde(e){
  switch(e?.type){
    case"classifier":return e.noVerdict===!0&&e.reason===YYe?"classifier_transcript_too_long":void 0;
    case"other":case"safetyCheck":switch(e.reason){
      case YYe:return"classifier_transcript_too_long";
      case Fx:return"outside_reads_blocked";
      case XYe:case kmn:return"memory_paused";
      default:return
    }case"subcommandResults":{
      let n;
      for(let s of e.reasons.values()){
        let r=rde(s.decisionReason);
        if(r==="outside_reads_blocked")return r;
        n??=r
      }return n
    }default:return
  }
}var e5n="ask rule on hook-rewritten input",hUt={
  type:"asyncAgent",reason:e5n
},t5n={
  type:"asyncAgent",reason:"tool requires user interaction; no prompt available in headless mode"
},n5n="no approval surface in this session; permission request denied automatically",XBr={
  type:"asyncAgent",reason:n5n
},JBr={
  type:"other",reason:"MCP tool requires user interaction; not supported via --permission-prompt-tool"
},Wpt="tool permission stream closed before response received",TRe="canUseTool returned a schema-invalid permission result",ARe="tool permission request failed",yUt="tool permission request aborted",QBr={
  type:"other",reason:Wpt
},_Ut={
  type:"other",reason:TRe
},r5n="permission prompt tool no longer connected",ZBr={
  type:"other",reason:r5n
},e1r={
  type:"other",reason:ARe
},JYe={
  type:"other",reason:yUt
};
var Wd="Expected a function";
function Gd(e){
  if(typeof e!="function")throw TypeError(Wd);
  return function(){
    var n=arguments;
    switch(n.length){
      case 0:return!e.call(this);
      case 1:return!e.call(this,n[0]);
      case 2:return!e.call(this,n[0],n[1]);
      case 3:return!e.call(this,n[0],n[1],n[2])
    }return!e.apply(this,n)
  }
}var Y3n=Gd;
function Vd(e,n){
  return Qr(e,Y3n(cN(n)))
}var pa=Vd;
import{
  join as xa
}from"path";
function z(e){
  return typeof e==="object"&&e!==null&&!Array.isArray(e)
}import{
  isAbsolute as xs
}from"path";
var Yd="When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored.",Xd=f(()=>u({
  allowedDomains:A(o()).optional(),deniedDomains:A(o()).optional().describe("Domains that are always blocked, even if matched by allowedDomains. Supports the same wildcard syntax as allowedDomains. Merged from all settings sources regardless of allowManagedDomainsOnly."),strictAllowlist:H().optional().describe("When true, the sandbox runtime deterministically denies hosts not in allowedDomains instead of prompting. "+"Enforced for sandboxed commands only \u2014 in-process tools such as WebFetch are not gated by this setting. "+"Only honored from user, managed/policy, or CLI (--settings) settings \u2014 "+"project settings (.claude/settings.json and .claude/settings.local.json) are ignored."),allowManagedDomainsOnly:H().optional().describe("When true (and set in managed settings), only allowedDomains and WebFetch(domain:...) allow rules from managed settings are respected. User, project, local, and flag settings domains are ignored. Denied domains are still respected from all sources."),allowUnixSockets:A(o()).optional().describe("macOS only: Unix socket paths to allow. Ignored on Linux (seccomp cannot filter by path)."),allowAllUnixSockets:H().optional().describe("If true, allow all Unix sockets (disables blocking on both platforms)."),allowLocalBinding:H().optional(),allowMachLookup:A(o().refine((e)=>!(e.endsWith("*")?e.slice(0,-1):e).includes("*"),{
    message:'Wildcards are only allowed as a single trailing "*" (e.g., "com.example.*" or "*" for all services).'
  })).optional().describe('macOS only: Additional XPC/Mach service names to allow looking up. Supports trailing-wildcard prefix matching (e.g., "com.apple.coresimulator.*"). Needed for tools that communicate via XPC such as the iOS Simulator or Playwright.'),httpProxyPort:k().optional(),socksProxyPort:k().optional(),tlsTerminate:u({
    caCertPath:o().min(1).optional(),caKeyPath:o().min(1).optional()
  }).optional().describe("[EXPERIMENTAL] Enable in-process TLS termination so the per-request filter can see HTTPS request bodies. Provide a CA cert+key, or omit both to have sandbox-runtime generate an ephemeral one for the session. On native Windows an ephemeral CA cannot pass the sandbox trust check, so omitting the paths uses a persistent CA managed by the sandbox runtime (set up and trusted via /sandbox install); configured paths are passed to the sandbox runtime verbatim, which rejects a bad or incomplete pair at sandbox initialization. "+"Only honored from user, managed/policy, or CLI (`--settings`) settings \u2014 project settings "+"(.claude/settings.json and .claude/settings.local.json) are ignored.")
}).optional()),qd=f(()=>u({
  allowWrite:A(o()).optional().describe("Additional paths to allow writing within the sandbox. Merged with paths from Edit(...) allow permission rules."),denyWrite:A(o()).optional().describe("Additional paths to deny writing within the sandbox. Merged with paths from Edit(...) deny permission rules."),denyRead:A(o()).optional().describe("Additional paths to deny reading within the sandbox. Merged with paths from Read(...) deny permission rules."),allowRead:A(o()).optional().describe("Paths to re-allow reading within denyRead regions. Takes precedence over denyRead for matching paths."),allowManagedReadPathsOnly:H().optional().describe("When true (set in managed settings), only allowRead paths from policySettings are used."),disabled:H().optional().describe("macOS and Linux/WSL only: skip filesystem isolation entirely while keeping network and seccomp isolation. Ignored on native Windows, where the sandboxed process runs as a separate user with no inherent rights, so skipping the filesystem rules would "+"withhold every access grant rather than loosen them \u2014 filesystem isolation stays on there. "+"Sandboxed commands get unrestricted read/write access to the host filesystem; network egress is still confined to network.allowedDomains. Intended for deployments whose goal is egress control rather than filesystem containment. Does not change Bash prompting: sandbox.autoAllowBashIfSandboxed is independent and still defaults to true, so set it to false to keep prompting for sandboxed commands. Drops the read protection from filesystem.denyRead and credentials.files deny entries for sandboxed commands, since both are enforced by the filesystem layer this turns off; credentials.files mask entries (sentinel binds) and credentials.envVars deny/mask are unaffected. "+"Only honored from user, managed/policy, or CLI (`--settings`) settings \u2014 "+"project settings (.claude/settings.json and .claude/settings.local.json) are ignored. If managed settings configure sandbox.filesystem at all, or list any sandbox.credentials.files deny entry, only managed settings can set this: an admin who deployed filesystem restrictions must not have them switched off by a user-writable file. (sandbox.credentials.envVars and credentials.files mask entries "+"do not pin it \u2014 env scrubbing and sentinel binds are independent of the filesystem "+"layer and survive this setting.) When unset, filesystem isolation stays on.")
}).optional());
function Ds(e,n,s){
  if(e.length===0||e.some((r)=>r.length===0))s.addIssue({
    code:Q1.custom,path:["maskClaims"],message:"maskClaims must name at least one non-empty claim \u2014 omit maskClaims for whole-token masking."
  });
  if(n===void 0)s.addIssue({
    code:Q1.custom,path:["maskClaims"],message:"maskClaims requires decode \u2014 without a decode format there is no token to read claims from. Set decode, or omit maskClaims."
  })
}function Ms(e,n){
  let s;
  try{
    s=new RegExp(e)
  }catch(i){
    n.addIssue({
      code:Q1.custom,path:["extract"],message:`extract is not a valid regular expression: ${l(i)}`
    });
    return
  }if(new RegExp(s.source+"|").exec("").length-1<1)n.addIssue({
    code:Q1.custom,path:["extract"],message:"extract must contain at least one capturing group \u2014 "+'group 1 is the credential value to mask (e.g. "token:\\s*(\\S+)").'
  })
}function Is(e){
  if(typeof e!=="object"||e===null)return e;
  let n=e;
  if(n.mode!=="deny")return e;
  let s={
    ...n
  };
  if("extract"in s&&typeof s.extract!=="string")delete s.extract;
  if("onExtractNoMatch"in s&&s.onExtractNoMatch!=="warn"&&s.onExtractNoMatch!=="deny"&&s.onExtractNoMatch!=="error")delete s.onExtractNoMatch;
  if("decode"in s&&s.decode!=="jwt")delete s.decode;
  if("maskClaims"in s&&!(Array.isArray(s.maskClaims)&&s.maskClaims.every((r)=>typeof r==="string")))delete s.maskClaims;
  if("maskDuplicates"in s&&typeof s.maskDuplicates!=="boolean")delete s.maskDuplicates;
  if("injectHosts"in s&&!(Array.isArray(s.injectHosts)&&s.injectHosts.every((r)=>typeof r==="string")))delete s.injectHosts;
  return s
}var Vt=f(()=>Bi(Is,u({
  path:o().min(1).describe("Path to a credential file or directory. Same resolution as sandbox.filesystem.* paths: absolute, ~ expanded, or relative to the settings file root (project root for project settings, ~/.claude for user settings)."),mode:G(["deny","mask"]).describe("Access mode for this path. `deny` blocks reads inside the sandbox; `mask` shows sandboxed commands a sentinel-substituted copy (whole-file, or only the spans captured by `extract`) and the "+"host proxy swaps sentinel\u2192real on egress to `injectHosts`. "+"On macOS and Windows `mask` currently degrades to `deny`."),extract:o().optional().describe("Optional regex for structured masking when mode is `mask`. Applied globally to the file; capture group 1 of each match is a credential value, and only those captured spans are replaced "+"with sentinels \u2014 the rest of the file is preserved so a tool "+"that parses it (.netrc, JSON, YAML) still succeeds. Without `extract`, the entire file content is replaced with one sentinel (whole-file masking, suited to single-secret files). If the regex matches nothing, behavior is governed by `onExtractNoMatch` (default `warn`). Accepted but ignored for `deny`."),onExtractNoMatch:G(["warn","deny","error"]).optional().describe("What to do when `extract` matches nothing in the file \u2014 or, "+"with `decode`, when no candidate survives verification. `warn` (default) emits a stderr warning and leaves the file readable as-is inside the sandbox (fail-open, for credentials that may be legitimately absent); `deny` degrades the entry to "+"mode `deny` so the file is unreadable (fail-closed) \u2014 under "+"`sandbox.filesystem.disabled` it is treated as `error`, since read-denies are dropped in that mode; `error` aborts at sandbox setup so nothing runs until the config is fixed. Only meaningful when mode is `mask` and `extract` or `decode` is set; accepted but ignored otherwise."),decode:G(["jwt"]).optional().describe("Optional encoded-credential format for `mask` mode. `jwt`: candidates are located with a built-in JWT regex (or the explicit `extract` pattern, if set), verified to actually be JWTs before masking, and replaced with a structurally valid fake JWT so client-side token parsing inside the sandbox keeps working. If no candidate verifies, behavior is governed by `onExtractNoMatch` (default `warn`). Accepted but ignored for `deny`."),maskClaims:A(o()).optional().describe("Names of top-level payload claims to mask inside each decoded value, instead of replacing the whole token. Each named claim present with a string value gets its own sentinel and the token is rebuilt around the modified payload; all other claims are preserved so a tool that decodes the token and reads a non-secret claim keeps working. Requires `decode`. If no named claim matches in any verified token, behavior is governed by `onExtractNoMatch` (default `warn`). Only meaningful when mode is `mask`; accepted but ignored for `deny`."),maskDuplicates:H().optional().describe("If true, verbatim occurrences of each captured credential value outside the regex-matched spans are also replaced with the "+"corresponding sentinel \u2014 for a secret repeated where the regex "+"does not reach (e.g. pasted into a comment). Matches raw substrings, so short or common values may corrupt unrelated content; intended for long, high-entropy secrets. Defaults to false. Only meaningful when mode is `mask` and `extract` or `decode` is set; accepted but ignored otherwise."),injectHosts:A(o()).optional().describe("Optional narrowing of where the proxy substitutes this credential. Only meaningful when mode is `mask`; accepted but ignored for `deny`. If unset, defaults to "+"`network.allowedDomains` \u2014 the credential is injected at "+"every reachable host. Each entry must be reachable via `network.allowedDomains` (sandbox-runtime validates this).")
}).superRefine((e,n)=>{
  if(e.mode==="mask"&&e.path.endsWith("/"))n.addIssue({
    code:Q1.custom,path:["path"],message:'Credential mode "mask" applies to a single file, not a directory. List the specific credential file(s), or use "deny" for the directory.'
  });if(e.mode==="mask"&&e.extract!==void 0)Ms(e.extract,n);if(e.mode==="mask"&&e.maskClaims!==void 0)Ds(e.maskClaims,e.decode,n)
}))),ut=()=>o().regex(/^[A-Za-z_][A-Za-z0-9_]*$/,"Environment variable name must start with a letter or underscore and contain only letters, digits, and underscores"),Yt=f(()=>Bi(Is,u({
  name:ut().describe("Environment variable name."),mode:G(["deny","mask"]).describe("Access mode for this environment variable. `deny` unsets the variable for sandboxed commands; `mask` shows sandboxed commands a sentinel value and the "+"host proxy swaps sentinel\u2192real on egress to `injectHosts`."),extract:o().optional().describe("Optional regex for structured masking when mode is `mask`. Applied globally to the value; capture group 1 of each match is a credential value, and only those captured spans are "+"replaced with sentinels \u2014 the rest of the value is preserved "+"so a tool that parses it (a `DATABASE_URL` connection string, a composite `KEY:SECRET` pair) still succeeds inside the sandbox. Without `extract`, the entire value is replaced with one sentinel (whole-value masking, suited to bare tokens). If the regex matches nothing, behavior is governed by `onExtractNoMatch` (default `warn`). Cannot be combined with `decode` (the decode path never consults it). Accepted but ignored for `deny`."),onExtractNoMatch:G(["warn","deny","error"]).optional().describe("What to do when `extract` matches nothing in the value. `warn` (default) emits a stderr warning and lets the variable pass through unmasked (fail-open, for credentials that may be legitimately absent); `deny` unsets the variable inside the sandbox (fail-closed); `error` aborts at sandbox setup so nothing runs until the config is fixed. Only meaningful when mode is `mask` and `extract` is set without `decode`. On a mask entry with `decode`, the runtime takes the decode path and never consults this field, so a fail-closed setting "+"cannot be honored \u2014 `deny` and `error` are rejected there; "+"only `warn` is accepted. In all other shapes the field is accepted but ignored."),decode:G(["jwt"]).optional().describe("Optional encoded-credential format for `mask` mode. `jwt`: the variable's whole value is verified to actually be a JWT and replaced with a structurally valid fake JWT so client-side token parsing inside the sandbox keeps working; the proxy swaps the whole fake token on egress. If the value does not verify, the variable is left unmasked with a stderr warning "+"(fail-open). Cannot be combined with `extract` \u2014 the decode "+"path never consults it. Accepted but ignored for `deny`."),maskClaims:A(o()).optional().describe("Names of top-level payload claims to mask inside the decoded value, instead of replacing the whole token. Each named claim present with a string value gets its own sentinel and the token is rebuilt around the modified payload; all other claims are preserved so claim-reading clients keep working. Requires `decode`. If no named claim matches, the variable is left unmasked with a stderr warning (fail-open). Only meaningful when mode is `mask`; accepted but ignored for `deny`."),injectHosts:A(o()).optional().describe("Optional narrowing of where the proxy substitutes this credential. Only meaningful when mode is `mask`; accepted but ignored for `deny`. If unset, defaults to "+"`network.allowedDomains` \u2014 the credential is injected at "+"every reachable host. Each entry must be reachable via `network.allowedDomains` (sandbox-runtime validates this).")
}).superRefine((e,n)=>{
  if(e.mode==="mask"&&e.extract!==void 0)Ms(e.extract,n);if(e.mode==="mask"&&e.maskClaims!==void 0)Ds(e.maskClaims,e.decode,n);if(e.mode==="mask"&&e.decode!==void 0&&e.extract!==void 0)n.addIssue({
    code:Q1.custom,path:["extract"],message:"extract cannot be combined with decode on an env entry \u2014 the runtime takes the decode path (whole-value JWT verification) and never consults extract, silently disabling the structured masking. Remove one of the two."
  });if(e.mode==="mask"&&e.decode!==void 0&&(e.onExtractNoMatch==="deny"||e.onExtractNoMatch==="error"))n.addIssue({
    code:Q1.custom,path:["onExtractNoMatch"],message:"onExtractNoMatch cannot be honored on an env entry with decode \u2014 the runtime takes the decode path (which is unconditionally fail-open on verify failure) and never consults extract or onExtractNoMatch. Remove onExtractNoMatch, or drop decode to use extract-based masking (whose no-match handling does honor it)."
  })
}))),SRe=["AWS_ACCESS_KEY_ID","AWS_SECRET_ACCESS_KEY","AWS_SESSION_TOKEN"],q3n="_SLOT_COLLISION_",oUt="_INVALID_PAIR_",Rt="_PARENT_PAIR_SUPPRESSOR_",zBr="_MERGE_PAIR_SUPPRESSOR_",Zd=[q3n,oUt,Rt,zBr],K3n=(e)=>Zd.some((n)=>e.startsWith(n)),Xt=f(()=>u({
  accessKeyIdVar:ut().describe("Name of the masked env var holding the AWS access key id."),secretAccessKeyVar:ut().describe("Name of the masked env var holding the AWS secret access key."),sessionTokenVar:ut().optional().describe("Optional name of the masked env var holding the AWS session token (temporary credentials). When set, the proxy sends the real token as x-amz-security-token on re-signed requests and adds it to the signed header set if the client did not.")
}).superRefine((e,n)=>{
  let s=new Map;for(let[r,i]of[["accessKeyIdVar",e.accessKeyIdVar],["secretAccessKeyVar",e.secretAccessKeyVar],["sessionTokenVar",e.sessionTokenVar]]){
    if(i===void 0)continue;let d=s.get(i);if(d!==void 0)n.addIssue({
      code:Q1.custom,path:[r],message:`${r} names the same env var ('${i}') as ${d} \u2014 each pair member must be a distinct variable.`
    });else s.set(i,r)
  }
})),ec=f(()=>{
  let e=G(["deny","passthrough"]);return u({
    streaming:e.optional().describe("Policy for aws-chunked streaming uploads (x-amz-content-sha256: STREAMING-*): per-chunk signatures chain off the seed signature, so re-signing would require rewriting the body. `deny` (default) fails closed with a 403; `passthrough` forwards the request unre-signed (the upstream will reject its signature)."),presigned:e.optional().describe("Policy for presigned URLs (X-Amz-Algorithm/X-Amz-Signature in the query, no Authorization header): the signature lives in the URL itself. `deny` (default) or `passthrough`."),sigv4a:e.optional().describe("Policy for SigV4A (AWS4-ECDSA-P256-SHA256) asymmetric signatures: there is no shared-key HMAC to recompute. `deny` (default) or `passthrough`.")
  })
}),tc=f(()=>u({
  files:A(Vt()).optional().describe("Credential files or directories to protect. `deny` blocks reads inside the sandbox; `mask` substitutes a sentinel inside the sandbox (whole-file, or per-`extract` capture) and injects the real value at the proxy. On macOS and Windows `mask` degrades to `deny`."),envVars:A(Yt()).optional().describe("Environment variables to protect. `deny` unsets the variable for sandboxed commands; `mask` substitutes a sentinel inside the sandbox and injects the real value at the proxy."),allowPlaintextInject:H().optional().describe("Allow sentinel\u2192real substitution on the plain-HTTP proxy path. "+"Defaults to false: without TLS termination the upstream identity is unverified and the credential travels in cleartext. Set only for trusted-network test fixtures. Only honored from user, managed/policy, or CLI (`--settings`) "+"settings \u2014 project settings (.claude/settings.json and "+".claude/settings.local.json) are ignored."),awsPairs:A(Xt()).optional().describe("Explicit groupings of masked env vars into AWS credential pairs for SigV4 re-signing, for non-standard variable names. The conventional AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN trio is paired automatically when masked. Only honored from user, managed/policy, or CLI (`--settings`) "+"settings \u2014 project settings (.claude/settings.json and "+".claude/settings.local.json) are ignored. A member is only usable when its env var is forwarded as a whole-value `mask` entry (an entry carrying `extract` or `decode` does not "+"qualify \u2014 re-signing needs the whole real value). A pair "+"whose key id or secret member is unusable never re-signs: it is dropped, unless it names a conventional AWS variable, in which case it is forwarded as an inert suppressor so implicit auto-pairing stays overridden. A pair whose ONLY unusable member is the session token still re-signs, without an x-amz-security-token (temporary-credential requests fail upstream until the entry is fixed)."),sigv4:ec().optional().describe("Policies for AWS SigV4 request shapes the proxy cannot re-sign (streaming, presigned, sigv4a) when they reference a masked credential pair: `deny` (default) or `passthrough`. Only honored from user, managed/policy, or CLI (`--settings`) "+"settings \u2014 project settings (.claude/settings.json and "+".claude/settings.local.json) are ignored.")
}).superRefine((e,n)=>{
  let s=new Set;for(let[r,i]of(e?.awsPairs??[]).entries()){
    let d=[["accessKeyIdVar",i.accessKeyIdVar],["secretAccessKeyVar",i.secretAccessKeyVar],["sessionTokenVar",i.sessionTokenVar]],c=new Set;for(let[p,g]of d){
      if(g===void 0)continue;if(s.has(g))n.addIssue({
        code:Q1.custom,path:["awsPairs",r,p],message:`"${g}" appears in more than one awsPairs slot (within or across pairs) \u2014 each variable can fill exactly one slot.`
      });c.add(g)
    }for(let p of c)s.add(p)
  }
}).optional()),pmn=f(()=>u({
  enabled:H().optional(),failIfUnavailable:H().optional().describe("Exit with an error at startup if sandbox.enabled is true but the sandbox cannot start (missing dependencies or unsupported platform). When false (default), a warning is shown and commands run unsandboxed. Intended for managed-settings deployments that require sandboxing as a hard gate."),autoAllowBashIfSandboxed:H().optional(),allowUnsandboxedCommands:H().optional().describe("Allow commands to run outside the sandbox via the dangerouslyDisableSandbox parameter. When false, the dangerouslyDisableSandbox parameter is completely ignored and all commands must run sandboxed. Default: true."),network:Xd(),filesystem:qd(),credentials:tc(),ignoreViolations:fe(o(),A(o())).optional(),enableWeakerNestedSandbox:H().optional(),enableWeakerNetworkIsolation:H().optional().describe("macOS only: Allow access to com.apple.trustd.agent in the sandbox. Needed for Go-based CLI tools (gh, gcloud, terraform, etc.) to verify TLS certificates when using httpProxyPort with a MITM proxy and custom CA. "+"**Reduces security** \u2014 opens a potential data exfiltration vector through the trustd service. Default: false"),allowAppleEvents:H().optional().describe("macOS only: Allow sandboxed commands to send Apple Events (and look up the appleeventsd Mach service). Needed for `open`, `osascript`, and browser-based auth flows that open URLs. "+"**Removes code-execution isolation** \u2014 sandboxed commands can launch other applications "+"unsandboxed with no user prompt, and can script running apps (e.g. Terminal) subject to the user's per-app TCC automation consent. "+"Only honored from user, managed/policy, or CLI (--settings) settings \u2014 "+"project settings (.claude/settings.json and .claude/settings.local.json) are ignored. Default: false"),excludedCommands:A(o()).optional().describe("Command patterns (Bash permission-rule syntax) that always run outside the sandbox. A convenience, not a security boundary: excluded commands still go through the permission flow. Merged across settings sources. "+Yd),ripgrep:u({
    command:o(),args:A(o()).optional()
  }).optional().describe("Custom ripgrep configuration for bundled ripgrep support. "+"Only honored from user, managed/policy, or CLI (--settings) settings \u2014 "+"project settings (.claude/settings.json and .claude/settings.local.json) are ignored."),bwrapPath:Bi((e)=>typeof e==="string"&&xs(e)?e:void 0,o()).optional().catch(void 0).describe("Linux/WSL only: Absolute path to the bwrap (bubblewrap) binary. Overrides auto-detection via PATH. Only honored from admin-controlled managed settings."),socatPath:Bi((e)=>typeof e==="string"&&xs(e)?e:void 0,o()).optional().catch(void 0).describe("Linux/WSL only: Absolute path to the socat binary used for the sandbox network proxy. Overrides auto-detection via PATH. Only honored from admin-controlled managed settings.")
}).passthrough());
var wd=["low","medium","high","xhigh","max"],x0="May use excessive tokens resulting in long response times or overthinking. Use sparingly for the hardest tasks.";
var Qe=f(()=>[{
  path:["allowManagedPermissionRulesOnly"],restrictive:!0
},{
  path:["allowManagedHooksOnly"],restrictive:!0
},{
  path:["allowManagedMcpServersOnly"],restrictive:!0
},{
  path:["enforceAvailableModels"],restrictive:!0
},{
  path:["disableAllHooks"],restrictive:!0
},{
  path:["disableClaudeAiConnectors"],restrictive:!0
},{
  path:["disableCommandPluginSources"],restrictive:!0
},{
  path:["disableSideloadFlags"],restrictive:!0
},{
  path:["disableSkillShellExecution"],restrictive:!0
},{
  path:["disableRemoteControl"],restrictive:!0
},{
  path:["disableAgentView"],restrictive:!0
},{
  path:["disableWorkflows"],restrictive:!0
},{
  path:["disableArtifact"],restrictive:!0
},{
  path:["disableBundledSkills"],restrictive:!0
},{
  path:["fastModePerSessionOptIn"],restrictive:!0
},{
  path:["isolatePeerMachines"],restrictive:!0
},{
  path:["strictPluginOnlyCustomization"],restrictive:!0
},{
  path:["disableAutoMode"],restrictive:"disable"
},{
  path:["disableDeepLinkRegistration"],restrictive:"disable"
},{
  path:["permissions","disableBypassPermissionsMode"],restrictive:"disable"
},{
  path:["permissions","disableAutoMode"],restrictive:"disable"
},{
  path:["permissions","blockReadsOutsideWorkingDirectories"],restrictive:!0
},{
  path:["autoMode","classifyAllShell"],restrictive:!0
},...[],{
  path:["worktree","bgIsolation"],restrictive:"worktree"
},{
  path:["enableArtifact"],restrictive:!1
},{
  path:["enableWorkflows"],restrictive:!1
},{
  path:["syncClaudeAiSkills"],restrictive:!1
},{
  path:["syncClaudeAiPlugins"],restrictive:!1
},{
  path:["useAutoModeDuringPlan"],restrictive:!1
},{
  path:["skipDangerousModePermissionPrompt"],restrictive:!1
},{
  path:["skipAutoPermissionPrompt"],restrictive:!1
},{
  path:["enableAllProjectMcpServers"],restrictive:!1
},{
  path:["channelsEnabled"],restrictive:!1
},{
  path:["skipWebFetchPreflight"],restrictive:!1
},{
  path:["skipWorkflowUsageWarning"],restrictive:!1
},{
  path:["autoUploadSessions"],restrictive:!1
},{
  path:["remoteControlAtStartup"],restrictive:!1
},{
  path:["remoteTools","allowUnattendedServing"],restrictive:!1
},{
  path:["autoContinueAtUsageLimit"],restrictive:!1
},...[],{
  path:["attribution","sessionUrl"],restrictive:!1
},{
  path:["crossSessionInbound"],restrictive:["refuse","hold"]
},{
  path:["remoteControl","shareHostProfile"],restrictive:["off","basic"]
},{
  path:["modelProposedGoals"],restrictive:["disabled","alwaysAsk"]
},{
  path:["maxEffortLevel"],restrictive:wd
},{
  path:["feedbackDrafts"],restrictive:"off"
},{
  path:["availableModelsMatch"],restrictive:"exact"
},{
  path:["askUserQuestionTimeout"],restrictive:"never"
},{
  path:["dialogExpiry"],restrictive:"never"
},{
  path:["sandbox","enabled"],restrictive:!0
},{
  path:["sandbox","failIfUnavailable"],restrictive:!0
},{
  path:["sandbox","autoAllowBashIfSandboxed"],restrictive:!1
},{
  path:["sandbox","allowUnsandboxedCommands"],restrictive:!1
},{
  path:["sandbox","enableWeakerNestedSandbox"],restrictive:!1
},{
  path:["sandbox","enableWeakerNetworkIsolation"],restrictive:!1
},{
  path:["sandbox","allowAppleEvents"],restrictive:!1
},{
  path:["sandbox","network","allowManagedDomainsOnly"],restrictive:!0
},{
  path:["sandbox","network","strictAllowlist"],restrictive:!0
},{
  path:["sandbox","network","allowAllUnixSockets"],restrictive:!1
},{
  path:["sandbox","network","allowLocalBinding"],restrictive:!1
},{
  path:["sandbox","filesystem","allowManagedReadPathsOnly"],restrictive:!0
},{
  path:["sandbox","filesystem","disabled"],restrictive:!1
},{
  path:["sandbox","credentials","allowPlaintextInject"],restrictive:!1
},{
  path:["sandbox","credentials","sigv4","streaming"],restrictive:"deny"
},{
  path:["sandbox","credentials","sigv4","presigned"],restrictive:"deny"
},{
  path:["sandbox","credentials","sigv4","sigv4a"],restrictive:"deny"
},{
  path:["isolation","required"],restrictive:!0
},{
  path:["isolation","persistHome"],restrictive:!1
}]);
function st(e){
  return Array.isArray(e)?e:[e]
}function Ee(e,n){
  let s=e;
  for(let r of n){
    if(s===null||typeof s!=="object")return;
    s=s[r]
  }return s
}function Ve(e,n,s){
  let r=[e],i=e;
  for(let c of n.slice(0,-1)){
    let p={
      ...i[c]
    };
    i[c]=p,i=p,r.push(i)
  }let d=n.at(-1);
  if(s!==void 0){
    i[d]=s;
    return
  }delete i[d];
  for(let c=r.length-1;c>0;c--){
    if(Object.keys(r[c]).length>0)break;
    delete r[c-1][n[c-1]]
  }
}var Ls=new Set(["disableAllHooks"]);
function X3n(e){
  let n={
  };
  for(let{
    path:m,restrictive:S
  }of Qe()){
    if(Ls.has(m[0]))continue;
    let y=Ee(e,m);
    if((typeof y==="boolean"||typeof y==="string")&&st(S).includes(y))Ve(n,m,y)
  }if(Ee(e,["attribution"])===!1)Ve(n,["attribution","sessionUrl"],!1);
  let s=qt(e.permissions,["deny","ask","disableBypassPermissionsMode","disableAutoMode"]);
  if(s)n.permissions={
    ...n.permissions,...s
  };
  for(let m of nc)if(e[m]!==void 0)n[m]=e[m];
  for(let[m,S]of Object.entries(e))if((m.startsWith("disable")&&(S===!0||S==="disable")||m.startsWith("enable")&&S===!1)&&!Ls.has(m))n[m]=S;
  if(e.disableAllHooks===!0)n.allowManagedHooksOnly=!0;
  if(Array.isArray(e.httpHookAllowedEnvVars)&&e.httpHookAllowedEnvVars.length===0)n.httpHookAllowedEnvVars=[];
  let r=qt(e.sandbox?.filesystem,["denyRead","denyWrite","allowManagedReadPathsOnly"]),i=qt(e.sandbox?.network,["deniedDomains","strictAllowlist","allowManagedDomainsOnly"]),d=qt(e.sandbox?.credentials,["files","envVars"])??{
  },c=(e.sandbox?.credentials?.awsPairs??[]).flatMap((m)=>[m.accessKeyIdVar,m.secretAccessKeyVar,m.sessionTokenVar]),p=SRe.filter((m)=>c.includes(m));
  if(p.length>0)d.awsPairs=p.map((m,S)=>({
    accessKeyIdVar:m,secretAccessKeyVar:`${Rt}${S+1}_`
  }));
  let g=e.sandbox?.credentials?.sigv4;
  if(g){
    let m={
    };
    for(let[S,y]of Object.entries(g))if(y==="deny")m[S]="deny";
    if(Object.keys(m).length>0)d.sigv4=m
  }let h=Object.keys(d).length>0;
  if(r||i||h){
    let m=n.sandbox??{
    };
    n.sandbox={
      ...m,...r&&{
        filesystem:{
          ...m.filesystem,...r
        }
      },...i&&{
        network:{
          ...m.network,...i
        }
      },...h&&{
        credentials:{
          ...m.credentials,...d
        }
      }
    }
  }return Object.keys(n).length>0?n:null
}function qt(e,n){
  if(!e)return;
  let s={
  };
  for(let r of n)if(e[r]!==void 0)s[r]=e[r];
  return Object.keys(s).length>0?s:void 0
}var nc=["allowedMcpServers","deniedMcpServers","allowManagedMcpServersOnly","disabledMcpjsonServers","allowManagedHooksOnly","allowedHttpHookUrls","strictKnownMarketplaces","allowedMarketplaces","blockedMarketplaces","strictPluginOnlyCustomization","availableModels","enforceAvailableModels","availableModelsMatch","deniedModels"];
function BNo(e,{
  maxLength:n
}){
  let s=zs(e);
  if(s!==-1)return{
    kind:"line_break",index:Ye(e,s)
  };
  for(let i=0;i<e.length;i++){
    let d=e.charCodeAt(i);
    if(d===0)return{
      kind:"nul",index:Ye(e,i)
    };
    if(d===32||d===9)return{
      kind:"whitespace",index:Ye(e,i)
    };
    if(d<32||d===127)return{
      kind:"control_character",index:Ye(e,i),codePoint:d
    };
    if(d>126)return{
      kind:"non_ascii",index:Ye(e,i),codePoint:Hs(e,i)
    }
  }let r=js(e);
  if(r>n)return{
    kind:"too_long",length:r,maxLength:n
  };
  return null
}function J3n(e){
  let n=0,s=e.length;
  while(n<s&&Ns(e.charCodeAt(n)))n++;
  while(s>n&&Ns(e.charCodeAt(s-1)))s--;
  let r=zs(e.slice(n,s));
  if(r!==-1)return{
    kind:"line_break",index:Ye(e,n+r)
  };
  for(let i=n;i<s;i++){
    let d=e.charCodeAt(i);
    if(d===0)return{
      kind:"nul",index:Ye(e,i)
    };
    if(d>255)return{
      kind:"non_ascii",index:Ye(e,i),codePoint:Hs(e,i)
    }
  }return null
}function Q3n(e){
  let n=1;
  for(let s=0;s<e.length;s++){
    let r=e.charCodeAt(s);
    if(r===10)n++;
    else if(r===13){
      if(n++,e.charCodeAt(s+1)===10)s++
    }
  }return{
    length:js(e),lineCount:n
  }
}function Z3n(e,{
  length:n,lineCount:s
}){
  let r=n===1?"1 character":`${n} characters`,i=s>1?`${r} on ${s} lines`:r;
  switch(e.kind){
    case"line_break":return`it contains a line break at character ${e.index+1} (${i})`;
    case"nul":return`it contains a NUL byte at character ${e.index+1} (${i})`;
    case"control_character":return`it contains a control character at character ${e.index+1} (${i})`;
    case"whitespace":return`it contains whitespace at character ${e.index+1} (${i})`;
    case"non_ascii":return`it contains ${sc(e.codePoint)??"a non-ASCII character"} at character ${e.index+1} (${i})`;
    case"too_long":return`it is ${e.length} characters long (limit ${e.maxLength})`
  }
}function sc(e){
  switch(e){
    case 65279:return"a byte-order mark (U+FEFF)";
    case 8203:case 8204:case 8205:case 8288:return`a zero-width character (${vt(e)})`;
    case 160:case 8239:return`a no-break space (${vt(e)})`;
    case 8216:case 8217:case 8220:case 8221:return`a typographic quote (${vt(e)})`;
    case 8211:case 8212:return`a typographic dash (${vt(e)})`;
    case 8230:return"an ellipsis character (U+2026)";
    case 8232:case 8233:return`a line or paragraph separator (${vt(e)})`;
    case 65533:return"a replacement character (U+FFFD)";
    default:return e>=55296&&e<=57343?"an unpaired UTF-16 surrogate":null
  }
}function vt(e){
  return`U+${e.toString(16).toUpperCase().padStart(4,"0")}`
}function zs(e){
  let n=e.indexOf(`
`),s=e.indexOf("\r");
  if(n===-1)return s;
  return s===-1?n:Math.min(n,s)
}function Ns(e){
  return e===9||e===32||e===10||e===13
}function Hs(e,n){
  return e.codePointAt(n)??e.charCodeAt(n)
}function Ye(e,n){
  let s=0;
  for(let r=0;r<n;r++){
    let i=e.charCodeAt(r);
    if(i>=55296&&i<=56319&&r+1<e.length&&(e.charCodeAt(r+1)&64512)===56320)r++;
    s++
  }return s
}function js(e){
  return Ye(e,e.length)
}var jNo=/^$|[=\x00-\x1f\x7f-\x9f]/,G1=["CLAUDE_CODE_USE_BEDROCK","CLAUDE_CODE_USE_VERTEX","CLAUDE_CODE_USE_FOUNDRY","CLAUDE_CODE_USE_ANTHROPIC_AWS","CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD","CLAUDE_CODE_USE_MANTLE","CLAUDE_CODE_USE_GATEWAY","ANTHROPIC_FOUNDRY_RESOURCE","ANTHROPIC_VERTEX_PROJECT_ID","ANTHROPIC_AWS_WORKSPACE_ID","ANTHROPIC_GOOGLE_CLOUD_PROJECT","ANTHROPIC_GOOGLE_CLOUD_LOCATION","ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID","CLOUD_ML_REGION"],Xn=["CLAUDE_CODE_USE_BEDROCK","CLAUDE_CODE_USE_ANTHROPIC_AWS","CLAUDE_CODE_USE_MANTLE"],rc=["AWS_BEARER_TOKEN_BEDROCK","ANTHROPIC_AWS_API_KEY"],Dpt="OTEL_EXPORTER_OTLP_",Ks=["OTEL_LOG_RAW_API_BODIES","OTEL_LOG_USER_PROMPTS","OTEL_LOG_ASSISTANT_RESPONSES","OTEL_LOG_TOOL_CONTENT","OTEL_LOG_TOOL_DETAILS","OTEL_LOG_MANAGED_SETTINGS","OTEL_LOGS_EXPORTER","ENABLE_BETA_TRACING_DETAILED","BETA_TRACING_ENDPOINT","ANT_OTEL_LOGS_EXPORTER"],$s=[Dpt,`ANT_${Dpt}`],ic=new Set(["projectSettings","localSettings"]);
function sUt(e){
  return ic.has(e)
}var fmn=["OTEL_EXPORTER_OTLP_ENDPOINT","OTEL_EXPORTER_OTLP_HEADERS","OTEL_EXPORTER_OTLP_PROTOCOL","OTEL_EXPORTER_OTLP_CERTIFICATE","OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE","OTEL_EXPORTER_OTLP_CLIENT_KEY","OTEL_EXPORTER_OTLP_INSECURE","OTEL_EXPORTER_OTLP_TRACES_ENDPOINT","OTEL_EXPORTER_OTLP_TRACES_HEADERS","OTEL_EXPORTER_OTLP_TRACES_PROTOCOL","OTEL_EXPORTER_OTLP_TRACES_CERTIFICATE","OTEL_EXPORTER_OTLP_TRACES_CLIENT_CERTIFICATE","OTEL_EXPORTER_OTLP_TRACES_CLIENT_KEY","OTEL_EXPORTER_OTLP_TRACES_INSECURE","OTEL_EXPORTER_OTLP_METRICS_ENDPOINT","OTEL_EXPORTER_OTLP_METRICS_HEADERS","OTEL_EXPORTER_OTLP_METRICS_PROTOCOL","OTEL_EXPORTER_OTLP_METRICS_CERTIFICATE","OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE","OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY","OTEL_EXPORTER_OTLP_METRICS_INSECURE","OTEL_EXPORTER_OTLP_LOGS_ENDPOINT","OTEL_EXPORTER_OTLP_LOGS_HEADERS","OTEL_EXPORTER_OTLP_LOGS_PROTOCOL","OTEL_EXPORTER_OTLP_LOGS_CERTIFICATE","OTEL_EXPORTER_OTLP_LOGS_CLIENT_CERTIFICATE","OTEL_EXPORTER_OTLP_LOGS_CLIENT_KEY","OTEL_EXPORTER_OTLP_LOGS_INSECURE","OTEL_EXPORTER_OTLP_PROFILES_ENDPOINT","OTEL_EXPORTER_OTLP_PROFILES_HEADERS","OTEL_EXPORTER_OTLP_PROFILES_PROTOCOL","OTEL_EXPORTER_OTLP_PROFILES_CERTIFICATE","OTEL_EXPORTER_OTLP_PROFILES_CLIENT_CERTIFICATE","OTEL_EXPORTER_OTLP_PROFILES_CLIENT_KEY","OTEL_EXPORTER_OTLP_PROFILES_INSECURE","OTEL_EXPORTER_PROMETHEUS_HOST","OTEL_EXPORTER_PROMETHEUS_PORT","CLAUDE_CODE_ENABLE_TELEMETRY","OTEL_LOGS_EXPORTER","OTEL_METRICS_EXPORTER","OTEL_TRACES_EXPORTER","CLAUDE_CODE_ENHANCED_TELEMETRY_BETA","ENABLE_ENHANCED_TELEMETRY_BETA","OTEL_LOG_USER_PROMPTS","OTEL_LOG_ASSISTANT_RESPONSES","OTEL_LOG_TOOL_CONTENT","OTEL_LOG_TOOL_DETAILS","OTEL_LOG_MANAGED_SETTINGS"],ac=new Set(["OTEL_LOG_USER_PROMPTS","OTEL_LOG_TOOL_CONTENT","OTEL_LOG_TOOL_DETAILS"]),lc=new Set(["OTEL_LOGS_EXPORTER","OTEL_METRICS_EXPORTER","OTEL_TRACES_EXPORTER"]);
function mmn(e,n,s){
  if(e!==e.toUpperCase()||typeof n!=="string"&&typeof n!=="number"&&typeof n!=="boolean")return!1;
  if(!(ac.has(e)?Wo(typeof n==="boolean"?n:String(n)):lc.has(e)&&String(n).trim()==="none"))return!1;
  return!Object.keys(s()).some((i)=>i.toUpperCase()===e)
}var Fs={
  apiKeyHelper:["ANTHROPIC_BASE_URL","_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL"],awsAuthRefresh:[...Xn,"ANTHROPIC_BEDROCK_BASE_URL","ANTHROPIC_AWS_BASE_URL","ANTHROPIC_BEDROCK_MANTLE_BASE_URL"],awsCredentialExport:[...Xn,"ANTHROPIC_BEDROCK_BASE_URL","ANTHROPIC_AWS_BASE_URL","ANTHROPIC_BEDROCK_MANTLE_BASE_URL"],gcpAuthRefresh:["CLAUDE_CODE_USE_VERTEX","CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD","ANTHROPIC_VERTEX_BASE_URL","ANTHROPIC_GOOGLE_CLOUD_BASE_URL"]
},Bs=["CLAUDE_CODE_MEMORY_API_BASE_URL","CLAUDE_CODE_MEMORY_API_TOKEN"];
function Hye(e){
  return Bs.includes(e)
}var LL=["ANTHROPIC_BASE_URL","_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL","ANTHROPIC_BEDROCK_BASE_URL","ANTHROPIC_VERTEX_BASE_URL","ANTHROPIC_FOUNDRY_BASE_URL","ANTHROPIC_AWS_BASE_URL","ANTHROPIC_GOOGLE_CLOUD_BASE_URL","ANTHROPIC_BEDROCK_MANTLE_BASE_URL","CLAUDE_CODE_ARTIFACTS_API_BASE_URL","CLAUDE_CODE_ARTIFACTS_API_TOKEN","CLAUDE_CODE_ARTIFACT_ASSET_BASE_URL","CLAUDE_CODE_ARTIFACT_LIVE_BASE_URL","CLAUDE_CODE_ARTIFACT_SYNC_BASE_URL","CLAUDE_CODE_ARTIFACT_VIEWER_BASE_URL",...Bs],qFe=[{
  endpoint:"ANTHROPIC_BASE_URL",companions:["_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL","ANTHROPIC_CUSTOM_HEADERS"]
},{
  endpoint:"ANTHROPIC_BEDROCK_BASE_URL",selection:"CLAUDE_CODE_USE_BEDROCK",companions:["CLAUDE_CODE_SKIP_BEDROCK_AUTH","ANTHROPIC_CUSTOM_HEADERS"]
},{
  endpoint:"ANTHROPIC_VERTEX_BASE_URL",selection:"CLAUDE_CODE_USE_VERTEX",companions:["CLAUDE_CODE_SKIP_VERTEX_AUTH","ANTHROPIC_CUSTOM_HEADERS"]
},{
  endpoint:"ANTHROPIC_FOUNDRY_BASE_URL",selection:"CLAUDE_CODE_USE_FOUNDRY",companions:["CLAUDE_CODE_SKIP_FOUNDRY_AUTH","ANTHROPIC_CUSTOM_HEADERS"]
},{
  endpoint:"ANTHROPIC_AWS_BASE_URL",selection:"CLAUDE_CODE_USE_ANTHROPIC_AWS",companions:["CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH","ANTHROPIC_CUSTOM_HEADERS"]
},{
  endpoint:"ANTHROPIC_GOOGLE_CLOUD_BASE_URL",selection:"CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD",companions:["CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH","ANTHROPIC_CUSTOM_HEADERS"]
},{
  endpoint:"ANTHROPIC_BEDROCK_MANTLE_BASE_URL",selection:"CLAUDE_CODE_USE_MANTLE",companions:["CLAUDE_CODE_SKIP_MANTLE_AUTH","ANTHROPIC_CUSTOM_HEADERS"]
}],wRe=D(qFe.flatMap((e)=>[e.endpoint,...e.companions])),I0=["ANTHROPIC_API_KEY","ANTHROPIC_AUTH_TOKEN","CLAUDE_CODE_OAUTH_TOKEN","AWS_BEARER_TOKEN_BEDROCK","ANTHROPIC_FOUNDRY_API_KEY","ANTHROPIC_FOUNDRY_AUTH_TOKEN","ANTHROPIC_AWS_API_KEY"],gmn=["CLAUDE_CODE_SKIP_BEDROCK_AUTH","CLAUDE_CODE_SKIP_VERTEX_AUTH","CLAUDE_CODE_SKIP_FOUNDRY_AUTH","CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH","CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH","CLAUDE_CODE_SKIP_MANTLE_AUTH"],qYe=["ANTHROPIC_MODEL","ANTHROPIC_DEFAULT_MODEL","ANTHROPIC_DEFAULT_FABLE_MODEL","ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION","ANTHROPIC_DEFAULT_FABLE_MODEL_NAME","ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES","ANTHROPIC_DEFAULT_HAIKU_MODEL","ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION","ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME","ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES","ANTHROPIC_DEFAULT_OPUS_MODEL","ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION","ANTHROPIC_DEFAULT_OPUS_MODEL_NAME","ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES","ANTHROPIC_DEFAULT_SONNET_MODEL","ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION","ANTHROPIC_DEFAULT_SONNET_MODEL_NAME","ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES","ANTHROPIC_SMALL_FAST_MODEL","ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION","CLAUDE_CODE_SUBAGENT_MODEL","CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT","CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT"],hmn=["ANTHROPIC_CUSTOM_MODEL_OPTION","ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION","ANTHROPIC_CUSTOM_MODEL_OPTION_NAME","ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES"],iUt=["CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR","CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR","CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR","CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR"],aUt=["CLAUDE_CODE_OAUTH_TOKEN",...iUt,"CLAUDE_CODE_ARTIFACTS_API_TOKEN","CLAUDE_CODE_SLACK_TAG_TOKEN","CLAUDE_CODE_HFI_BEARER_TOKEN","CLAUDE_BRIDGE_OAUTH_TOKEN","CLAUDE_TRUSTED_DEVICE_TOKEN","AGENT_PROXY_AUTH_TOKEN","CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN","CLAUDE_BG_AUTH_SNAPSHOT_PATH","CLAUDE_BG_SOCKET_TOKENS_PATH","CLAUDE_BG_RV_AUTH","CLAUDE_BG_PTY_AUTH","CLAUDE_BG_CLAIM_AUTH"],qn=["AWS_ACCESS_KEY_ID","AWS_SECRET_ACCESS_KEY","AWS_SESSION_TOKEN"],Lpt=[...qn,"AWS_PROFILE","AWS_CONFIG_FILE","AWS_SHARED_CREDENTIALS_FILE","GOOGLE_APPLICATION_CREDENTIALS","GOOGLE_CLOUD_PROJECT"];
function Npt(e,n){
  for(let s of qn)delete e[s];
  for(let s of Lpt)if(!n?.[s])delete e[s]
}var Zn=["AWS_CONTAINER_CREDENTIALS_FULL_URI","AWS_CONTAINER_CREDENTIALS_RELATIVE_URI","AWS_CONTAINER_AUTHORIZATION_TOKEN","AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE","AWS_EC2_METADATA_SERVICE_ENDPOINT","AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE","AWS_WEB_IDENTITY_TOKEN_FILE","AWS_ROLE_ARN"],ymn=["GCE_METADATA_HOST","GCE_METADATA_ROOT","GCE_METADATA_IP","METADATA_SERVER_DETECTION"],dc=new Set(["CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST",...G1,...LL,...I0,...gmn,"CLAUDE_CODE_HOST_AUTH_ENV_VAR","CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH","CLAUDE_CODE_HOST_AUTH_REFRESH_TIMEOUT_MS","CLAUDE_CODE_HOST_CREDS_FILE",...Lpt,"GCLOUD_PROJECT","GOOGLE_CLOUD_QUOTA_PROJECT",...ymn,...Zn,"AWS_REGION","AWS_DEFAULT_REGION",...qYe,"ANTHROPIC_BEDROCK_SERVICE_TIER","ANTHROPIC_BEDROCK_REGION_PREFIX","CLAUDE_CODE_CERT_STORE","DISABLE_GROWTHBOOK","CLAUDE_CODE_AUTO_MODE_MODEL","CLAUDE_CODE_BG_CLASSIFIER_MODEL","CLAUDE_CODE_SUBAGENT_MODEL_FORCE",...hmn]),_mn=["VERTEX_REGION_CLAUDE_"],cc=["AWS_ENDPOINT_URL"];
function bmn(e){
  let n=e.toUpperCase();
  return dc.has(n)||_mn.some((s)=>n.startsWith(s))||cc.some((s)=>n.startsWith(s))
}var uc=new Set(["AWS_PROFILE"]);
function WNo(e){
  return uc.has(e.toUpperCase())
}var pc=new Set(["HTTP_PROXY","HTTPS_PROXY","NO_PROXY"]);
function Smn(e){
  return pc.has(e.toUpperCase())
}var gc=new Set(["CLAUDE_CODE_CLIENT_CERT","CLAUDE_CODE_CLIENT_KEY","CLAUDE_CODE_CLIENT_KEY_PASSPHRASE","NODE_EXTRA_CA_CERTS","NODE_TLS_REJECT_UNAUTHORIZED","CLAUDE_CODE_OAUTH_SCOPES"]);
function KYe(e){
  return gc.has(e.toUpperCase())
}var KFe=["ANTHROPIC_UNIX_SOCKET","CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST","CLAUDE_CODE_HOST_AUTH_ENV_VAR"];
function $pt(e){
  return!!e.ANTHROPIC_UNIX_SOCKET||Le(e.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)||!!e.CLAUDE_CODE_HOST_AUTH_ENV_VAR
}function YFe(e){
  if(!Le(e.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST))return[];
  let n=Xn.some((i)=>Le(e[i])),s=!!e.CLAUDE_CODE_HOST_AUTH_ENV_VAR||rc.some((i)=>!!e[i])||!!e.AWS_PROFILE||!!e.AWS_CONFIG_FILE||!!e.AWS_SHARED_CREDENTIALS_FILE,r=Lpt.filter((i)=>e[i]==="");
  return["ANTHROPIC_CUSTOM_HEADERS",...I0,...n&&s?qn:[],...r,vRe(e),"CLAUDE_CODE_HOST_CREDS_FILE"].filter((i)=>!!i)
}function vRe(e){
  let n=e.CLAUDE_CODE_HOST_AUTH_ENV_VAR;
  if(!n||KFe.includes(n)||G1.includes(n))return;
  return n
}var Ws=["apiKeyHelper","awsAuthRefresh","awsCredentialExport","fileSuggestion","gcpAuthRefresh","otelHeadersHelper","processWrapper","policyHelpers","proxyAuthHelper","statusLine","subagentStatusLine"],Qn=["bwrapPath","ripgrep","socatPath"],Gs=["allowAppleEvents","credentials","enableWeakerNestedSandbox","enableWeakerNetworkIsolation","filesystem.disabled","network.allowAllUnixSockets","network.allowMachLookup","network.allowUnixSockets","network.httpProxyPort","network.socksProxyPort","network.tlsTerminate"],Vs=["required","egress"],mc=new Set(["ANTHROPIC_BEDROCK_REGION_PREFIX","ANTHROPIC_BEDROCK_SERVICE_TIER","ANTHROPIC_CUSTOM_MODEL_OPTION","ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION","ANTHROPIC_CUSTOM_MODEL_OPTION_NAME","ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES","ANTHROPIC_DEFAULT_FABLE_MODEL","ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION","ANTHROPIC_DEFAULT_FABLE_MODEL_NAME","ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES","ANTHROPIC_DEFAULT_MODEL","ANTHROPIC_DEFAULT_HAIKU_MODEL","ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION","ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME","ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES","ANTHROPIC_DEFAULT_OPUS_MODEL","ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION","ANTHROPIC_DEFAULT_OPUS_MODEL_NAME","ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES","ANTHROPIC_DEFAULT_SONNET_MODEL","ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION","ANTHROPIC_DEFAULT_SONNET_MODEL_NAME","ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES","ANTHROPIC_FOUNDRY_API_KEY","ANTHROPIC_MODEL","ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION","ANTHROPIC_SMALL_FAST_MODEL","AWS_DEFAULT_REGION","AWS_PROFILE","AWS_REGION","BASH_DEFAULT_TIMEOUT_MS","BASH_MAX_OUTPUT_LENGTH","BASH_MAX_TIMEOUT_MS","CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR","CLAUDE_CODE_API_KEY_HELPER_TTL_MS","CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS","CLAUDE_CODE_DISABLE_TERMINAL_TITLE","CLAUDE_CODE_ENABLE_AUTO_MODE","CLAUDE_CODE_ENABLE_DESIGN_SYNC","CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL","CLAUDE_CODE_ENABLE_TELEMETRY","CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS","CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL","CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH","CLAUDE_CODE_MAX_OUTPUT_TOKENS","CLAUDE_CODE_SKIP_BEDROCK_AUTH","CLAUDE_CODE_SKIP_FOUNDRY_AUTH","CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH","CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH","CLAUDE_CODE_SKIP_MANTLE_AUTH","CLAUDE_CODE_SKIP_VERTEX_AUTH","CLAUDE_CODE_SUBAGENT_MODEL","CLAUDE_CODE_USE_BEDROCK","CLAUDE_CODE_USE_FOUNDRY","CLAUDE_CODE_USE_ANTHROPIC_AWS","CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD","CLAUDE_CODE_USE_GATEWAY","CLAUDE_CODE_USE_MANTLE","CLAUDE_CODE_USE_POWERSHELL_TOOL","CLAUDE_CODE_USE_VERTEX","DISABLE_AUTOUPDATER","DISABLE_BUG_COMMAND","DISABLE_COST_WARNINGS","DISABLE_FEEDBACK_COMMAND","DISABLE_GROWTHBOOK","DISABLE_INSTALLATION_CHECKS","DISABLE_UPDATES","ENABLE_TOOL_SEARCH","MAX_MCP_OUTPUT_TOKENS","MAX_THINKING_TOKENS","MCP_CONNECT_TIMEOUT_MS","MCP_TIMEOUT","MCP_TOOL_TIMEOUT","OTEL_EXPORTER_OTLP_COMPRESSION","OTEL_EXPORTER_OTLP_HEADERS","OTEL_EXPORTER_OTLP_LOGS_COMPRESSION","OTEL_EXPORTER_OTLP_LOGS_HEADERS","OTEL_EXPORTER_OTLP_LOGS_PROTOCOL","OTEL_EXPORTER_OTLP_METRICS_COMPRESSION","OTEL_EXPORTER_OTLP_METRICS_HEADERS","OTEL_EXPORTER_OTLP_METRICS_PROTOCOL","OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE","OTEL_EXPORTER_OTLP_PROTOCOL","OTEL_EXPORTER_OTLP_TRACES_COMPRESSION","OTEL_EXPORTER_OTLP_TRACES_HEADERS","OTEL_EXPORTER_OTLP_TRACES_PROTOCOL","OTEL_LOG_ASSISTANT_RESPONSES","OTEL_LOG_TOOL_CONTENT","OTEL_LOG_TOOL_DETAILS","OTEL_LOG_USER_PROMPTS","OTEL_LOGS_EXPORT_INTERVAL","OTEL_LOGS_EXPORTER","OTEL_METRIC_EXPORT_INTERVAL","OTEL_METRICS_EXPORTER","OTEL_METRICS_INCLUDE_ACCOUNT_UUID","OTEL_METRICS_INCLUDE_ENTRYPOINT","OTEL_METRICS_INCLUDE_REPOSITORY","OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES","OTEL_METRICS_INCLUDE_SESSION_ID","OTEL_METRICS_INCLUDE_VERSION","OTEL_RESOURCE_ATTRIBUTES","OTEL_SERVICE_NAME","OTEL_TRACES_EXPORT_INTERVAL","OTEL_TRACES_EXPORTER","USE_BUILTIN_RIPGREP","VERTEX_REGION_CLAUDE_3_5_HAIKU","VERTEX_REGION_CLAUDE_3_5_SONNET","VERTEX_REGION_CLAUDE_3_7_SONNET","VERTEX_REGION_CLAUDE_4_0_OPUS","VERTEX_REGION_CLAUDE_4_0_SONNET","VERTEX_REGION_CLAUDE_4_1_OPUS","VERTEX_REGION_CLAUDE_4_5_OPUS","VERTEX_REGION_CLAUDE_4_6_OPUS","VERTEX_REGION_CLAUDE_4_7_OPUS","VERTEX_REGION_CLAUDE_4_8_OPUS","VERTEX_REGION_CLAUDE_5_OPUS","VERTEX_REGION_CLAUDE_5_5_OPUS","VERTEX_REGION_CLAUDE_FABLE_5","VERTEX_REGION_CLAUDE_FABLE_5_1","VERTEX_REGION_CLAUDE_4_5_SONNET","VERTEX_REGION_CLAUDE_4_6_SONNET","VERTEX_REGION_CLAUDE_5_SONNET","VERTEX_REGION_CLAUDE_HAIKU_4_5","CLAUDE_AUTOCOMPACT_PCT_OVERRIDE","CLAUDE_CODE_AUTO_COMPACT_WINDOW","CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT","CLAUDE_CODE_MAX_CONTEXT_TOKENS","DISABLE_AUTO_COMPACT","DISABLE_COMPACT","CLAUDE_CODE_ALWAYS_ENABLE_EFFORT","CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING","CLAUDE_CODE_DISABLE_FAST_MODE","CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP","CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK","CLAUDE_CODE_DISABLE_THINKING","CLAUDE_CODE_EFFORT_LEVEL","CLAUDE_CODE_MAX_EFFORT_REMINDER","CLAUDE_CODE_PROMPT_CACHE_TTL","CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL","DISABLE_INTERLEAVED_THINKING","DISABLE_PROMPT_CACHING","DISABLE_PROMPT_CACHING_FABLE","DISABLE_PROMPT_CACHING_HAIKU","DISABLE_PROMPT_CACHING_OPUS","DISABLE_PROMPT_CACHING_SONNET","ENABLE_PROMPT_CACHING_1H","ENABLE_PROMPT_CACHING_1H_BEDROCK","FALLBACK_FOR_ALL_PRIMARY_MODELS","FORCE_PROMPT_CACHING_5M","CLAUDE_AUTO_BACKGROUND_TASKS","CLAUDE_CODE_DISABLE_ADVISOR_TOOL","CLAUDE_CODE_DISABLE_AGENT_VIEW","CLAUDE_CODE_DISABLE_ARTIFACT","CLAUDE_CODE_DISABLE_BACKGROUND_TASKS","CLAUDE_CODE_DISABLE_BUNDLED_SKILLS","CLAUDE_CODE_DISABLE_CRON","CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS","CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY","CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING","CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND","CLAUDE_CODE_DISABLE_MEMORY_RO_UNSAVED_NOTICE","CLAUDE_CODE_DISABLE_WORKFLOWS","CLAUDE_CODE_ENABLE_AWAY_SUMMARY","CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING","CLAUDE_CODE_ENABLE_FUNCTION_HOOKS","CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION","CLAUDE_CODE_ENABLE_TASKS","CLAUDE_CODE_FORK_SUBAGENT","CLAUDE_CODE_PLAN_MODE_REQUIRED","DISABLE_DOCTOR_COMMAND","DISABLE_EXTRA_USAGE_COMMAND","DISABLE_INSTALL_GITHUB_APP_COMMAND","DISABLE_LOGIN_COMMAND","DISABLE_LOGOUT_COMMAND","DISABLE_UPGRADE_COMMAND","CLAUDE_AX_SCREEN_READER","CLAUDE_CODE_ACCESSIBILITY","CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN","CLAUDE_CODE_DISABLE_MOUSE","CLAUDE_CODE_DISABLE_MOUSE_CLICKS","CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL","CLAUDE_CODE_FORCE_STRIKETHROUGH","CLAUDE_CODE_FORCE_TERMINAL_IMAGES","CLAUDE_CODE_HIDE_CWD","CLAUDE_CODE_NATIVE_CURSOR","CLAUDE_CODE_NO_FLICKER","CLAUDE_CODE_SCROLL_SPEED","CLAUDE_CODE_SYNTAX_HIGHLIGHT","API_TIMEOUT_MS","CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS","CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS","CLAUDE_CODE_GLOB_TIMEOUT_SECONDS","CLAUDE_CODE_MAX_RETRIES","CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION","CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY","CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION","CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS","CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT","CLAUDE_CODE_TEAM_TEARDOWN_PARK_TIMEOUT_MS","CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS","CLAUDE_STREAM_IDLE_TIMEOUT_MS","MAX_STRUCTURED_OUTPUT_RETRIES","MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE","MCP_SERVER_CONNECTION_BATCH_SIZE","SLASH_COMMAND_TOOL_CHAR_BUDGET","TASK_MAX_OUTPUT_LENGTH","MCP_CONNECTION_NONBLOCKING","CLAUDE_ENABLE_BYTE_WATCHDOG","CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK","CLAUDE_ENABLE_STREAM_WATCHDOG"]),fc=new Set(["API_FORCE_IDLE_TIMEOUT","CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC","DISABLE_ERROR_REPORTING","DISABLE_TELEMETRY","DO_NOT_TRACK"]),hc=new Set(["ENABLE_BETA_TRACING_DETAILED","OTEL_LOG_RAW_API_BODIES"]),yc=/auth|key|token|cookie|secret|credential|session|signature|passw|jwt|assertion|cert|oidc|org|tenant|account|project|workspace|user|email|identity|principal|consumer|client|host|url|base|target|upstream|endpoint|proxy|forward|route|fallback|override|apigw|x-goog-|l5d-|bypass|guardrail|amz|x-ms-|azureml|extra-parameters|envoy|helicone|litellm|cf-aig|cf-access|beta|version/;
function _c(e){
  if(/\r(?!\n)/.test(e))return!0;
  return e.split(/\n|\r\n/).some((n)=>{
    let s=n.indexOf(":");if(s===-1)return!1;let r=n.slice(0,s).trim();return!Sc.test(r)||J3n(n.slice(s+1))!==null||yc.test(r.toLowerCase())
  })
}var Sc=/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
function Fpt(e,n){
  let s=e.toUpperCase();
  return mc.has(s)||fc.has(s)&&Le(n)||hc.has(s)&&Wo(n)||s==="ANTHROPIC_CUSTOM_HEADERS"&&!_c(n)
}import{
  posix as zi,win32 as Hi
}from"path";
var t1r=f(()=>G(["local","user","project","dynamic","enterprise","claudeai","managed","agent"])),M_=f(()=>G(["stdio","sse","sse-ide","http","ws","sdk"]));
function Mye(e){
  return e==="sdk"||e==="sse-ide"||e==="ws-ide"
}var pt=f(()=>R("comms").optional().catch(void 0)),tt=f(()=>k().int().positive()),bc=300000,Ys=f(()=>k().int().positive().optional().catch(void 0).describe("@internal CCR backend wire hint; folded into timeout at parse."));
function o5n({
  request_timeout_ms:e,...n
}){
  return{
    ...n,...n.timeout===void 0&&e!==void 0&&{
      timeout:Math.min(e,bc)
    }
  }
}var QFe=f(()=>u({
  type:R("stdio").optional(),command:o().min(1,"Command cannot be empty"),args:A(o()).default([]),env:fe(o(),o()).optional(),timeout:tt().optional(),alwaysLoad:H().optional(),bareElicitationCapability:H().optional(),role:pt()
})),Ec=f(()=>H()),Xs=f(()=>u({
  clientId:o().optional(),callbackPort:k().int().positive().optional(),authServerMetadataUrl:o().url().startsWith("https://",{
    message:"authServerMetadataUrl must use https://"
  }).optional(),scopes:o().min(1).optional(),xaa:Ec().optional()
})),Js=f(()=>u({
  name:o(),permission_policy:G(["always_allow","always_ask","always_deny"]).optional()
})),Gpt=f(()=>u({
  type:R("sse"),url:o(),headers:fe(o(),o()).optional(),headersHelper:o().optional(),oauth:Xs().optional(),timeout:tt().optional(),request_timeout_ms:Ys(),tools:A(Js()).optional(),alwaysLoad:H().optional(),bareElicitationCapability:H().optional(),discoveryCache:H().optional(),role:pt(),toolPermissions:fe(o(),Amn()).optional()
}).transform(o5n)),kc=f(()=>u({
  type:R("sse-ide"),url:o(),ideName:o(),ideRunningInWindows:H().optional(),timeout:tt().optional(),alwaysLoad:H().optional(),role:pt()
})),Ac=f(()=>u({
  type:R("ws-ide"),url:o(),ideName:o(),authToken:o().optional(),ideRunningInWindows:H().optional(),timeout:tt().optional(),alwaysLoad:H().optional(),role:pt()
})),QYe=f(()=>u({
  type:G(["http","streamable-http"]).transform(()=>"http"),url:o(),headers:fe(o(),o()).optional(),headersHelper:o().optional(),oauth:Xs().optional(),timeout:tt().optional(),request_timeout_ms:Ys(),tools:A(Js()).optional(),alwaysLoad:H().optional(),bareElicitationCapability:H().optional(),discoveryCache:H().optional(),role:pt(),toolPermissions:fe(o(),Amn()).optional()
}).transform(o5n)),Oc=["command","args","env","headersHelper"],wc=new Set(["http","streamable-http","sse"]),Rc=/[\p{Cc}\p{Cf}\u2028\u2029]/u,vc=/[\p{Cc}\p{Cf}\u2028\u2029]/gu;
function eo(e){
  return/^[A-Za-z0-9_-]+$/.test(e)&&e!=="__proto__"&&e!=="constructor"&&e!=="prototype"
}function Cc(e){
  try{
    let n=new URL(e);
    return n.protocol==="https:"&&n.hostname!==""
  }catch{
    return!1
  }
}function qs(e,n="",s=0){
  if(typeof e==="string")return[[n,e,!1]];
  if(s>4||e===null||typeof e!=="object")return[];
  return Object.entries(e).flatMap(([r,i])=>{
    let d=r.replace(vc,(p)=>`\\u${p.codePointAt(0).toString(16).padStart(4,"0")}`),c=n?`${n}.${d}`:d;return[[c,r,!0],...qs(i,c,s+1)]
  })
}var to=f(()=>fe(o(),ae()).check((e)=>{
  let n=(r,i)=>{
    e.issues.push({
      code:"custom",path:r,message:i,input:e.value
    })
  };for(let r of Oc)if(Object.hasOwn(e.value,r))n([r],`"${r}" is not allowed in managed settings: only http/sse URL servers can be delivered this way, and a managed settings document must not name a program to run`);if(!wc.has(e.value.type))n(["type"],'managed settings can only deliver "http" or "sse" servers');let s=e.value.url;if(typeof s==="string"&&!Cc(s))n(["url"],"managed settings servers must use a valid https:// url");for(let[r,i,d]of qs(e.value))if(Rc.test(i))n(r.split("."),"contains control or invisible format characters (in a key or a value); a managed settings document must not be able to print escape sequences");else if(!d&&One(i))n(r.split("."),"${VAR} references are not expanded in managed settings; use a literal value (a managed settings document must not read the user's environment)")
}).pipe(Fe([QYe(),Gpt()]))),no=`"managedMcpServers" must be an object keyed by server name (the .mcp.json mcpServers shape; Claude Desktop's array form of its same-named key is not accepted here: use the server name as the key and "type" instead of "transport"). No managed MCP servers are installed from it until it is fixed.`;
function Zt(e,n){
  if(e===void 0)return;
  if(e===null||typeof e!=="object"||Array.isArray(e)){
    n("",no);
    return
  }let s=Object.create(null);
  for(let[r,i]of Object.entries(e)){
    if(!eo(r)){
      n("<invalid name>","server names may only contain letters, numbers, hyphens and underscores");
      continue
    }let d=to().safeParse(i);
    if(d.success){
      s[r]=d.data;
      continue
    }let c=d.error.issues[0];
    n(r,c?[c.path.join("."),c.message].filter(Boolean).join(": "):"failed validation")
  }return s
}var bUt=f(()=>u({
  type:R("ws"),url:o(),headers:fe(o(),o()).optional(),headersHelper:o().optional(),timeout:tt().optional(),alwaysLoad:H().optional(),bareElicitationCapability:H().optional(),role:pt()
})),n1r=f(()=>u({
  type:R("sdk"),name:o(),timeout:tt().optional(),alwaysLoad:H().optional()
})),Amn=f(()=>G(["allow","ask","blocked"])),r1r=f(()=>u({
  type:R("claudeai-proxy"),url:o(),id:o(),displayName:o().optional(),iconUrl:o().optional(),timeout:tt().optional(),alwaysLoad:H().optional(),toolPermissions:fe(o(),Amn()).optional(),stateless:H().optional(),cachedInitResponse:fe(o(),ae()).nullish(),discoverSupport:G(["supported","legacy","unknown"]).optional().catch(void 0),cachedDiscoverResponse:fe(o(),ae()).nullish(),eligible:H().nullish(),ineligibleReason:o().nullish(),enterpriseManaged:H().optional()
})),Kq=f(()=>Fe([QFe(),Gpt(),kc(),Ac(),QYe(),bUt(),n1r(),r1r()]));
function p6(e){
  return e?.pluginSource!==void 0
}function ZYe(e){
  if(e.type!=="claudeai-proxy")return!1;
  return e.scope==="claudeai"||e.scope==="dynamic"&&!p6(e)
}var I_=f(()=>u({
  mcpServers:fe(o(),Kq())
}));
function As(e){
  return e.type==="connected"||e.type==="cached"
}function e8e(e,n){
  if(n.type!=="cached"||!e)return!0;
  return!(e.type==="connected"||e.type==="disabled"||e.type==="needs-auth")
}var $r=O()==="macos"?"\u23FA":"\u25CF",Dye="\u2219",GNo="\u2315",hA="\u273B",zpt="\u2234",Cmn="\u2237",Pc="\u2235",Rmn=[zpt,Cmn,Pc,Cmn],s5n="\u25CC",Yq="\u2191",bF="\u2193",SUt="\u21B3",z1="\u2190",zNo="\u2192",ZFe="\u23CE",bne="\u21AF",VNo="\u25CB",wUt="\u25D0",o1r="\u25CF",qNo="\u25C9",KNo="\u25C8",xmn="\u2726",vUt="\u25CE";
var ode="\u23F8",t8e="\u23F5\u23F5",s1r="\u21BB",Lye="\u2190",YE="\u2442",Ay="\u25C7",Lv="\u25C6",Vpt="\u203B",Nv="\u26A0",Dd="\u29C9";
function i1r(e){
  return`${Dd} ${e}`
}var Imn="\u266A";
var YNo="\u258E",a1r="\u2588",Ux="\u2500",l1r="\u2504",c1r="\u2503",XNo="\xA0",Pmn=["\xB7|\xB7","\xB7/\xB7","\xB7\u2014\xB7","\xB7\\\xB7"],EUt="\xB7\u2714\uFE0E\xB7",d1r="\xD7",kUt="\u2715",SF="\u25B8",JNo="\u23BF",Omn="\u283F",Tc=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"];
function u1r(){
  return Tc
}var bb={
  topLeft:"\u256D",topRight:"\u256E",bottomLeft:"\u2570",bottomRight:"\u256F"
},QNo="\u2013",n_={
  branch:"\u251C",last:"\u2514",pipe:"\u2502",teeDown:"\u252C",teeUp:"\u2534"
};
var n8e=new Set(["Claude Preview","Claude Browser"]),Zs=new Set(["claude-in-chrome","Claude in Chrome"]),Hmn=new Set([...Zs,...n8e]),xc="remote-devices",Qs=["Claude_Browser__"],er=["claude-in-chrome__","Claude_in_Chrome__"],ZNo=[...Qs,...er];
function tr(e,n){
  if(e?.serverName!==xc)return!1;
  let s=vn(e.toolName);
  return n.some((r)=>s.startsWith(r))
}function Dc(e){
  return e!==void 0&&n8e.has(e.serverName)||tr(e,Qs)
}function Mc(e){
  return e!==void 0&&Zs.has(e.serverName)||tr(e,er)
}function KH(e,n){
  let s=e?.mcpInfo?.serverName,r=s!==void 0?n.mcpPermissionModeOverrides?.[s]:void 0,i=n.mode==="bypassPermissions"||n.mode==="auto"||V1(n.mode,n.isBypassPermissionsModeAvailable);
  if(r!==void 0&&i)return r;
  if(i&&(Dc(e?.mcpInfo)||Mc(e?.mcpInfo)&&n.chromeClassifierFloorEnabled===!0))return n.canAutoClassifierRun===!0?"auto":"default";
  return n.mode
}function e$o(e){
  if(e===null)return{
    ok:!0,override:void 0
  };
  if(e==="default"||e==="auto")return{
    ok:!0,override:e
  };
  return{
    ok:!1,rejected:e
  }
}function Ic(e){
  return e.mode==="plan"
}function V1(e,n){
  return e==="plan"&&n===!0&&!Te()
}function TUt(e){
  return Ic(e)||e.sandboxAutoAllowSuspended===!0
}var t$o=f(()=>Bi(Dm,G(KE))),Mmn=f(()=>Bi(Dm,G(NL))),nr={
  plan:0,bubble:1,default:1,dontAsk:1,acceptEdits:2,auto:3,bypassPermissions:4
};
function f6(e,n){
  if(!e)return;
  if(n==="auto"&&e==="acceptEdits")return;
  return nr[e]<=nr[n]?e:void 0
}var or={
  default:{
    title:"Manual",shortTitle:"Manual",indicator:"manual mode",symbol:ode,color:"inactive",external:"default"
  },plan:{
    title:"Plan",shortTitle:"Plan",indicator:"plan mode",symbol:ode,color:"planMode",external:"plan"
  },acceptEdits:{
    title:"Accept edits",shortTitle:"Accept",indicator:"accept edits",symbol:t8e,color:"autoAccept",external:"acceptEdits"
  },bypassPermissions:{
    title:"Bypass Permissions",shortTitle:"Bypass",indicator:"bypass permissions",symbol:t8e,color:"error",external:"bypassPermissions"
  },dontAsk:{
    title:"Don't Ask",shortTitle:"DontAsk",indicator:"don't ask",symbol:t8e,color:"error",external:"dontAsk"
  },auto:{
    title:"Auto",shortTitle:"Auto",indicator:"auto mode",symbol:t8e,color:"warning",external:"auto"
  }
};
function cz(e){
  return e!=="bubble"
}function Pt(e){
  return or[e]??or.default
}function oc(e){
  return Pt(e).external
}function n$o(e){
  let n=oc(e.newMode),s=n==="plan"&&Boolean(e.newUltraplan),r=e.rule==="while-latched"?s:s&&oc(e.prevMode)!=="plan"&&!e.prevUltraplan;
  return{
    permission_mode:n,is_ultraplan_mode:r?!0:null
  }
}function XE(e){
  return Ng(e)??"default"
}function dz(e){
  return Pt(e).title
}function r$o(e){
  return e==="default"||e===void 0
}function qpt(e,n){
  if(e==="auto")return"classify";
  if(e==="bypassPermissions"||V1(e,n))return"allow";
  if(e==="dontAsk")return"deny";
  return"ask"
}function uz(e){
  return Pt(e).indicator
}function Sne(e){
  return Pt(e).symbol
}function yA(e){
  return Pt(e).color
}import{
  posix as Lu,win32 as Nu
}from"path";
var i5n={
  ".ts":"ts",".tsx":"tsx",".jsx":"jsx",".js":"js",".mjs":"js",".cjs":"js",".mts":"ts",".cts":"ts"
};
var r8e=Object.keys(i5n);
var p1r=`${r8e.slice(0,-1).join(", ")} or `+String(r8e.at(-1));
import{
  isIPv4 as Uc,isIPv6 as lr
}from"net";
var zc=new Set(["metadata.google.internal","metadata.goog","metadata","instance-data","instance-data.ec2.internal","ip6-localhost","ip6-loopback","localhost.localdomain","localhost4","localhost4.localdomain4","localhost6","localhost6.localdomain6"]),ir=new Set(["100.100.100.200","168.63.129.16","192.0.0.192"]);
function ar(e,n,s,r){
  return e===127||e===169&&n===254||e===0
}function dr(e){
  let n=e.indexOf("%"),r=(n>=0?e.slice(0,n):e).toLowerCase().split("::");
  if(r.length>2)return;
  let i=r[0]?r[0].split(":"):[],d=r.length===2&&r[1]?r[1].split(":"):[],c=r.length===2?d:i,p=[],g=c.at(-1);
  if(g!==void 0&&g.includes(".")){
    let E=g.split(".").map(Number);
    if(E.length!==4||E.some((C)=>!Number.isInteger(C)||C<0||C>255))return;
    p=E,c.pop()
  }let h=(E)=>{
    let C=[];
    for(let I of E){
      if(!/^[0-9a-f]{1,4}$/.test(I))return;
      let x=parseInt(I,16);
      C.push(x>>8,x&255)
    }return C
  },m=h(r.length===2?i:[]),S=h(c);
  if(m===void 0||S===void 0)return;
  let y=m.length+S.length+p.length;
  if(y>16||r.length===1&&y!==16)return;
  return[...m,...Array(16-y).fill(0),...S,...p]
}function cr(e){
  return oo(e)&&e[4]===0&&e[5]===1
}function oo(e){
  return e[0]===0&&e[1]===100&&e[2]===255&&e[3]===155
}function o$o(e){
  if(!lr(e))return!1;
  let n=dr(e);
  if(n===void 0)return!1;
  let r=n.slice(0,10).every((d)=>d===0)&&n[10]===255&&n[11]===255,i=oo(n)&&n.slice(4,12).every((d)=>d===0);
  return r||i||cr(n)
}function Hc(e){
  let n=[];
  if(e[0]===32&&e[1]===2)n.push(e.slice(2,6));
  let s=e.slice(0,10).every((p)=>p===0),r=s&&e[10]===255&&e[11]===255,i=s&&e[10]===0&&e[11]===0,d=oo(e)&&e.slice(4,12).every((p)=>p===0),c=(e[8]===0||e[8]===2)&&e[9]===0&&e[10]===94&&e[11]===254;
  if(r||i||d||c)n.push(e.slice(12,16));
  return n
}function m6(e){
  let n=e.toLowerCase().replace(/^\[|\]$/g,"");
  if(n.endsWith("."))n=n.slice(0,-1);
  if(n===""||n==="localhost"||n.endsWith(".localhost"))return!0;
  if(zc.has(n))return!0;
  if(n.startsWith("instance-data.")&&n.endsWith(".compute.internal"))return!0;
  if(Uc(n)){
    if(ir.has(n))return!0;
    let[r=0,i=0,d=0,c=0]=n.split(".").map(Number);
    return ar(r,i,d,c)
  }if(!lr(n))return!1;
  let s=dr(n);
  if(s===void 0)return!0;
  if(cr(s))return!0;
  if(s.every((r)=>r===0))return!0;
  if(s.slice(0,15).every((r)=>r===0)&&s[15]===1)return!0;
  if(n==="fd00:ec2::254")return!0;
  if(s[0]===254&&(s[1]??0)>=128&&(s[1]??0)<=191)return!0;
  return Hc(s).some((r)=>{
    let[i=0,d=0,c=0,p=0]=r;return ar(i,d,c,p)||ir.has(`${i}.${d}.${c}.${p}`)
  })
}function Kpt(e){
  if(e.href)return e.href;
  let n=e.host??(e.hostname&&(e.hostname.includes(":")&&!e.hostname.startsWith("[")?`[${e.hostname}]`:e.hostname)+(e.port?`:${e.port}`:""));
  return e.protocol&&n?`${e.protocol}//${n}`:""
}var ur=/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF]|[\uDC00-\uDFFF]/g;
function pr(e){
  return e.replace(ur,(n)=>n.length===2?n:"")
}var so=/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs}/gu;
function tn(e){
  if(typeof e!=="string")return"";
  return re(Dmn(e.length>4096?e.slice(0,4096):e),1024)
}function Dmn(e){
  if(typeof e!=="string")return"";
  let n=e;
  for(let s=0;s<64;s++){
    let r=pr(n).replace(so,"");
    if(r===n)return r;
    n=r
  }return""
}function f1r(e){
  if(typeof e!=="string")return"";
  return(e.length>4096?e.slice(0,4096):e).replace(ur,(s)=>s.length===2?s:" ").replace(so," ")
}function a5n(e){
  if(e.length>16384)return null;
  let n=e;
  for(let s=0;s<64;s++){
    let r=pr(n).replace(so,"");
    if(r===n)return[...r].length<=8192?r:null;
    n=r
  }return null
}function s$o(e){
  let n=e.slice(0,3).map((r)=>a5n(r)??"[elicitation URL too long to relay]"),s=e.length>3?` \u2026and ${e.length-3} more \u2014 re-run in the terminal to see all`:"";
  return`${n.join(", ")}${s}`
}var Mm=["PreToolUse","PostToolUse","PostToolUseFailure","PostToolBatch","Notification","UserPromptSubmit","UserPromptExpansion","SessionStart","SessionEnd","Stop","StopFailure","SubagentStart","SubagentStop","PreCompact","PostCompact","PreModelSwitch","PostModelSwitch","PermissionRequest","PermissionDenied","Setup","TeammateIdle","TaskCreated","TaskCompleted","Elicitation","ElicitationResult","ConfigChange","WorktreeCreate","WorktreeRemove","InstructionsLoaded","CwdChanged","FileChanged","DirectoryAdded","MessageDisplay"],FNo=["clear","resume","logout","prompt_input_exit","other"],hF="__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__";
function Xe(e){
  return!Array.isArray?br(e)==="[object Array]":Array.isArray(e)
}var Kc=1/0;
function $c(e){
  if(typeof e=="string")return e;
  let n=e+"";
  return n=="0"&&1/e==-Kc?"-0":n
}function Fc(e){
  return e==null?"":$c(e)
}function ze(e){
  return typeof e==="string"
}function _r(e){
  return typeof e==="number"
}function Bc(e){
  return e===!0||e===!1||Wc(e)&&br(e)=="[object Boolean]"
}function Sr(e){
  return typeof e==="object"
}function Wc(e){
  return Sr(e)&&e!==null
}function ke(e){
  return e!==void 0&&e!==null
}function ro(e){
  return!e.trim().length
}function br(e){
  return e==null?e===void 0?"[object Undefined]":"[object Null]":Object.prototype.toString.call(e)
}var Gc="Incorrect 'index' type",Vc=(e)=>`Invalid value for key ${e}`,Yc=(e)=>`Pattern length exceeds max of ${e}.`,Xc=(e)=>`Missing ${e} property in key`,Jc=(e)=>`Property 'weight' in key '${e}' must be a positive integer`,gr=Object.prototype.hasOwnProperty;
class Er{
  constructor(e){
    this._keys=[],this._keyMap={
    };
    let n=0;
    e.forEach((s)=>{
      let r=kr(s);this._keys.push(r),this._keyMap[r.id]=r,n+=r.weight
    }),this._keys.forEach((s)=>{
      s.weight/=n
    })
  }get(e){
    return this._keyMap[e]
  }keys(){
    return this._keys
  }toJSON(){
    return JSON.stringify(this._keys)
  }
}function kr(e){
  let n=null,s=null,r=null,i=1,d=null;
  if(ze(e)||Xe(e))r=e,n=mr(e),s=ao(e);
  else{
    if(!gr.call(e,"name"))throw Error(Xc("name"));
    let c=e.name;
    if(r=c,gr.call(e,"weight")){
      if(i=e.weight,i<=0)throw Error(Jc(c))
    }n=mr(c),s=ao(c),d=e.getFn
  }return{
    path:n,id:s,weight:i,src:r,getFn:d
  }
}function mr(e){
  return Xe(e)?e:e.split(".")
}function ao(e){
  return Xe(e)?e.join("."):e
}function qc(e,n){
  let s=[],r=!1,i=(d,c,p)=>{
    if(!ke(d))return;
    if(!c[p])s.push(d);
    else{
      let g=c[p],h=d[g];
      if(!ke(h))return;
      if(p===c.length-1&&(ze(h)||_r(h)||Bc(h)))s.push(Fc(h));
      else if(Xe(h)){
        r=!0;
        for(let m=0,S=h.length;m<S;m+=1)i(h[m],c,p+1)
      }else if(c.length)i(h,c,p+1)
    }
  };
  return i(e,ze(n)?n.split("."):n,0),r?s:s[0]
}var Zc={
  includeMatches:!1,findAllMatches:!1,minMatchCharLength:1
},Qc={
  isCaseSensitive:!1,includeScore:!1,keys:[],shouldSort:!0,sortFn:(e,n)=>e.score===n.score?e.idx<n.idx?-1:1:e.score<n.score?-1:1
},eu={
  location:0,threshold:0.6,distance:100
},tu={
  useExtendedSearch:!1,getFn:qc,ignoreLocation:!1,ignoreFieldNorm:!1,fieldNormWeight:1
},X={
  ...Qc,...Zc,...eu,...tu
},nu=/[^ ]+/g;
function ou(e=1,n=3){
  let s=new Map,r=Math.pow(10,n);
  return{
    get(i){
      let d=i.match(nu).length;
      if(s.has(d))return s.get(d);
      let c=1/Math.pow(d,0.5*e),p=parseFloat(Math.round(c*r)/r);
      return s.set(d,p),p
    },clear(){
      s.clear()
    }
  }
}class nn{
  constructor({
    getFn:e=X.getFn,fieldNormWeight:n=X.fieldNormWeight
  }={
  }){
    this.norm=ou(n,3),this.getFn=e,this.isCreated=!1,this.setIndexRecords()
  }setSources(e=[]){
    this.docs=e
  }setIndexRecords(e=[]){
    this.records=e
  }setKeys(e=[]){
    this.keys=e,this._keysMap={
    },e.forEach((n,s)=>{
      this._keysMap[n.id]=s
    })
  }create(){
    if(this.isCreated||!this.docs.length)return;
    if(this.isCreated=!0,ze(this.docs[0]))this.docs.forEach((e,n)=>{
      this._addString(e,n)
    });
    else this.docs.forEach((e,n)=>{
      this._addObject(e,n)
    });
    this.norm.clear()
  }add(e){
    let n=this.size();
    if(ze(e))this._addString(e,n);
    else this._addObject(e,n)
  }removeAt(e){
    this.records.splice(e,1);
    for(let n=e,s=this.size();n<s;n+=1)this.records[n].i-=1
  }getValueForItemAtKeyId(e,n){
    return e[this._keysMap[n]]
  }size(){
    return this.records.length
  }_addString(e,n){
    if(!ke(e)||ro(e))return;
    let s={
      v:e,i:n,n:this.norm.get(e)
    };
    this.records.push(s)
  }_addObject(e,n){
    let s={
      i:n,$:{
      }
    };
    this.keys.forEach((r,i)=>{
      let d=r.getFn?r.getFn(e):this.getFn(e,r.path);if(!ke(d))return;if(Xe(d)){
        let c=[],p=[{
          nestedArrIndex:-1,value:d
        }];while(p.length){
          let{
            nestedArrIndex:g,value:h
          }=p.pop();if(!ke(h))continue;if(ze(h)&&!ro(h)){
            let m={
              v:h,i:g,n:this.norm.get(h)
            };c.push(m)
          }else if(Xe(h))h.forEach((m,S)=>{
            p.push({
              nestedArrIndex:S,value:m
            })
          })
        }s.$[i]=c
      }else if(ze(d)&&!ro(d)){
        let c={
          v:d,n:this.norm.get(d)
        };s.$[i]=c
      }
    }),this.records.push(s)
  }toJSON(){
    return{
      keys:this.keys,records:this.records
    }
  }
}function Ar(e,n,{
  getFn:s=X.getFn,fieldNormWeight:r=X.fieldNormWeight
}={
}){
  let i=new nn({
    getFn:s,fieldNormWeight:r
  });
  return i.setKeys(e.map(kr)),i.setSources(n),i.create(),i
}function su(e,{
  getFn:n=X.getFn,fieldNormWeight:s=X.fieldNormWeight
}={
}){
  let{
    keys:r,records:i
  }=e,d=new nn({
    getFn:n,fieldNormWeight:s
  });
  return d.setKeys(r),d.setIndexRecords(i),d
}function Qt(e,{
  errors:n=0,currentLocation:s=0,expectedLocation:r=0,distance:i=X.distance,ignoreLocation:d=X.ignoreLocation
}={
}){
  let c=n/e.length;
  if(d)return c;
  let p=Math.abs(r-s);
  if(!i)return p?1:c;
  return c+p/i
}function ru(e=[],n=X.minMatchCharLength){
  let s=[],r=-1,i=-1,d=0;
  for(let c=e.length;d<c;d+=1){
    let p=e[d];
    if(p&&r===-1)r=d;
    else if(!p&&r!==-1){
      if(i=d-1,i-r+1>=n)s.push([r,i]);
      r=-1
    }
  }if(e[d-1]&&d-r>=n)s.push([r,d-1]);
  return s
}var it=32;
function iu(e,n,s,{
  location:r=X.location,distance:i=X.distance,threshold:d=X.threshold,findAllMatches:c=X.findAllMatches,minMatchCharLength:p=X.minMatchCharLength,includeMatches:g=X.includeMatches,ignoreLocation:h=X.ignoreLocation
}={
}){
  if(n.length>it)throw Error(Yc(it));
  let m=n.length,S=e.length,y=Math.max(0,Math.min(r,S)),E=d,C=y,I=p>1||g,x=I?Array(S):[],L;
  while((L=e.indexOf(n,C))>-1){
    let oe=Qt(n,{
      currentLocation:L,expectedLocation:y,distance:i,ignoreLocation:h
    });
    if(E=Math.min(oe,E),C=L+m,I){
      let _=0;
      while(_<m)x[L+_]=1,_+=1
    }
  }C=-1;
  let F=[],W=1,ne=m+S,me=1<<m-1;
  for(let oe=0;oe<m;oe+=1){
    let _=0,w=ne;
    while(_<w){
      if(Qt(n,{
        errors:oe,currentLocation:y+w,expectedLocation:y,distance:i,ignoreLocation:h
      })<=E)_=w;
      else ne=w;
      w=Math.floor((ne-_)/2+_)
    }ne=w;
    let T=Math.max(1,y-w+1),M=c?S:Math.min(y+w,S)+m,V=Array(M+2);
    V[M+1]=(1<<oe)-1;
    for(let Y=M;Y>=T;Y-=1){
      let ee=Y-1,ie=s[e.charAt(ee)];
      if(I)x[ee]=+!!ie;
      if(V[Y]=(V[Y+1]<<1|1)&ie,oe)V[Y]|=(F[Y+1]|F[Y])<<1|1|F[Y+1];
      if(V[Y]&me){
        if(W=Qt(n,{
          errors:oe,currentLocation:ee,expectedLocation:y,distance:i,ignoreLocation:h
        }),W<=E){
          if(E=W,C=ee,C<=y)break;
          T=Math.max(1,2*y-C)
        }
      }
    }if(Qt(n,{
      errors:oe+1,currentLocation:y,expectedLocation:y,distance:i,ignoreLocation:h
    })>E)break;
    F=V
  }let te={
    isMatch:C>=0,score:Math.max(0.001,W)
  };
  if(I){
    let oe=ru(x,p);
    if(!oe.length)te.isMatch=!1;
    else if(g)te.indices=oe
  }return te
}function au(e){
  let n={
  };
  for(let s=0,r=e.length;s<r;s+=1){
    let i=e.charAt(s);
    n[i]=(n[i]||0)|1<<r-s-1
  }return n
}class mo{
  constructor(e,{
    location:n=X.location,threshold:s=X.threshold,distance:r=X.distance,includeMatches:i=X.includeMatches,findAllMatches:d=X.findAllMatches,minMatchCharLength:c=X.minMatchCharLength,isCaseSensitive:p=X.isCaseSensitive,ignoreLocation:g=X.ignoreLocation
  }={
  }){
    if(this.options={
      location:n,threshold:s,distance:r,includeMatches:i,findAllMatches:d,minMatchCharLength:c,isCaseSensitive:p,ignoreLocation:g
    },this.pattern=p?e:e.toLowerCase(),this.chunks=[],!this.pattern.length)return;
    let h=(S,y)=>{
      this.chunks.push({
        pattern:S,alphabet:au(S),startIndex:y
      })
    },m=this.pattern.length;
    if(m>it){
      let S=0,y=m%it,E=m-y;
      while(S<E)h(this.pattern.substr(S,it),S),S+=it;
      if(y){
        let C=m-it;
        h(this.pattern.substr(C),C)
      }
    }else h(this.pattern,0)
  }searchIn(e){
    let{
      isCaseSensitive:n,includeMatches:s
    }=this.options;
    if(!n)e=e.toLowerCase();
    if(this.pattern===e){
      let E={
        isMatch:!0,score:0
      };
      if(s)E.indices=[[0,e.length-1]];
      return E
    }let{
      location:r,distance:i,threshold:d,findAllMatches:c,minMatchCharLength:p,ignoreLocation:g
    }=this.options,h=[],m=0,S=!1;
    this.chunks.forEach(({
      pattern:E,alphabet:C,startIndex:I
    })=>{
      let{
        isMatch:x,score:L,indices:F
      }=iu(e,E,C,{
        location:r+I,distance:i,threshold:d,findAllMatches:c,minMatchCharLength:p,includeMatches:s,ignoreLocation:g
      });if(x)S=!0;if(m+=L,x&&F)h=[...h,...F]
    });
    let y={
      isMatch:S,score:S?m/this.chunks.length:1
    };
    if(S&&s)y.indices=h;
    return y
  }
}class Je{
  constructor(e){
    this.pattern=e
  }static isMultiMatch(e){
    return fr(e,this.multiRegex)
  }static isSingleMatch(e){
    return fr(e,this.singleRegex)
  }search(){
  }
}function fr(e,n){
  let s=e.match(n);
  return s?s[1]:null
}class Or extends Je{
  constructor(e){
    super(e)
  }static get type(){
    return"exact"
  }static get multiRegex(){
    return/^="(.*)"$/
  }static get singleRegex(){
    return/^=(.*)$/
  }search(e){
    let n=e===this.pattern;
    return{
      isMatch:n,score:n?0:1,indices:[0,this.pattern.length-1]
    }
  }
}class wr extends Je{
  constructor(e){
    super(e)
  }static get type(){
    return"inverse-exact"
  }static get multiRegex(){
    return/^!"(.*)"$/
  }static get singleRegex(){
    return/^!(.*)$/
  }search(e){
    let s=e.indexOf(this.pattern)===-1;
    return{
      isMatch:s,score:s?0:1,indices:[0,e.length-1]
    }
  }
}class Rr extends Je{
  constructor(e){
    super(e)
  }static get type(){
    return"prefix-exact"
  }static get multiRegex(){
    return/^\^"(.*)"$/
  }static get singleRegex(){
    return/^\^(.*)$/
  }search(e){
    let n=e.startsWith(this.pattern);
    return{
      isMatch:n,score:n?0:1,indices:[0,this.pattern.length-1]
    }
  }
}class vr extends Je{
  constructor(e){
    super(e)
  }static get type(){
    return"inverse-prefix-exact"
  }static get multiRegex(){
    return/^!\^"(.*)"$/
  }static get singleRegex(){
    return/^!\^(.*)$/
  }search(e){
    let n=!e.startsWith(this.pattern);
    return{
      isMatch:n,score:n?0:1,indices:[0,e.length-1]
    }
  }
}class Cr extends Je{
  constructor(e){
    super(e)
  }static get type(){
    return"suffix-exact"
  }static get multiRegex(){
    return/^"(.*)"\$$/
  }static get singleRegex(){
    return/^(.*)\$$/
  }search(e){
    let n=e.endsWith(this.pattern);
    return{
      isMatch:n,score:n?0:1,indices:[e.length-this.pattern.length,e.length-1]
    }
  }
}class Pr extends Je{
  constructor(e){
    super(e)
  }static get type(){
    return"inverse-suffix-exact"
  }static get multiRegex(){
    return/^!"(.*)"\$$/
  }static get singleRegex(){
    return/^!(.*)\$$/
  }search(e){
    let n=!e.endsWith(this.pattern);
    return{
      isMatch:n,score:n?0:1,indices:[0,e.length-1]
    }
  }
}class fo extends Je{
  constructor(e,{
    location:n=X.location,threshold:s=X.threshold,distance:r=X.distance,includeMatches:i=X.includeMatches,findAllMatches:d=X.findAllMatches,minMatchCharLength:c=X.minMatchCharLength,isCaseSensitive:p=X.isCaseSensitive,ignoreLocation:g=X.ignoreLocation
  }={
  }){
    super(e);
    this._bitapSearch=new mo(e,{
      location:n,threshold:s,distance:r,includeMatches:i,findAllMatches:d,minMatchCharLength:c,isCaseSensitive:p,ignoreLocation:g
    })
  }static get type(){
    return"fuzzy"
  }static get multiRegex(){
    return/^"(.*)"$/
  }static get singleRegex(){
    return/^(.*)$/
  }search(e){
    return this._bitapSearch.searchIn(e)
  }
}class ho extends Je{
  constructor(e){
    super(e)
  }static get type(){
    return"include"
  }static get multiRegex(){
    return/^'"(.*)"$/}static get singleRegex(){return/^'(.*)$/
  }search(e){
    let n=0,s,r=[],i=this.pattern.length;
    while((s=e.indexOf(this.pattern,n))>-1)n=s+i,r.push([s,n-1]);
    let d=!!r.length;
    return{
      isMatch:d,score:d?0:1,indices:r
    }
  }
}var lo=[Or,ho,Rr,vr,Pr,Cr,wr,fo],hr=lo.length,lu=/ +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/,du="|";
function cu(e,n={
}){
  return e.split(du).map((s)=>{
    let r=s.trim().split(lu).filter((d)=>d&&!!d.trim()),i=[];for(let d=0,c=r.length;d<c;d+=1){
      let p=r[d],g=!1,h=-1;while(!g&&++h<hr){
        let m=lo[h],S=m.isMultiMatch(p);if(S)i.push(new m(S,n)),g=!0
      }if(g)continue;h=-1;while(++h<hr){
        let m=lo[h],S=m.isSingleMatch(p);if(S){
          i.push(new m(S,n));break
        }
      }
    }return i
  })
}var uu=new Set([fo.type,ho.type]);
class Tr{
  constructor(e,{
    isCaseSensitive:n=X.isCaseSensitive,includeMatches:s=X.includeMatches,minMatchCharLength:r=X.minMatchCharLength,ignoreLocation:i=X.ignoreLocation,findAllMatches:d=X.findAllMatches,location:c=X.location,threshold:p=X.threshold,distance:g=X.distance
  }={
  }){
    this.query=null,this.options={
      isCaseSensitive:n,includeMatches:s,minMatchCharLength:r,findAllMatches:d,ignoreLocation:i,location:c,threshold:p,distance:g
    },this.pattern=n?e:e.toLowerCase(),this.query=cu(this.pattern,this.options)
  }static condition(e,n){
    return n.useExtendedSearch
  }searchIn(e){
    let n=this.query;
    if(!n)return{
      isMatch:!1,score:1
    };
    let{
      includeMatches:s,isCaseSensitive:r
    }=this.options;
    e=r?e:e.toLowerCase();
    let i=0,d=[],c=0;
    for(let p=0,g=n.length;p<g;p+=1){
      let h=n[p];
      d.length=0,i=0;
      for(let m=0,S=h.length;m<S;m+=1){
        let y=h[m],{
          isMatch:E,indices:C,score:I
        }=y.search(e);
        if(E){
          if(i+=1,c+=I,s){
            let x=y.constructor.type;
            if(uu.has(x))d=[...d,...C];
            else d.push(C)
          }
        }else{
          c=0,i=0,d.length=0;
          break
        }
      }if(i){
        let m={
          isMatch:!0,score:c/i
        };
        if(s)m.indices=d;
        return m
      }
    }return{
      isMatch:!1,score:1
    }
  }
}var co=[];
function pu(...e){
  co.push(...e)
}function uo(e,n){
  for(let s=0,r=co.length;s<r;s+=1){
    let i=co[s];
    if(i.condition(e,n))return new i(e,n)
  }return new mo(e,n)
}var en={
  AND:"$and",OR:"$or"
},po={
  PATH:"$path",PATTERN:"$val"
},go=(e)=>!!(e[en.AND]||e[en.OR]),gu=(e)=>!!e[po.PATH],mu=(e)=>!Xe(e)&&Sr(e)&&!go(e),yr=(e)=>({
  [en.AND]:Object.keys(e).map((n)=>({
    [n]:e[n]
  }))
});
function xr(e,n,{
  auto:s=!0
}={
}){
  let r=(i)=>{
    let d=Object.keys(i),c=gu(i);
    if(!c&&d.length>1&&!go(i))return r(yr(i));
    if(mu(i)){
      let g=c?i[po.PATH]:d[0],h=c?i[po.PATTERN]:i[g];
      if(!ze(h))throw Error(Vc(g));
      let m={
        keyId:ao(g),pattern:h
      };
      if(s)m.searcher=uo(h,n);
      return m
    }let p={
      children:[],operator:d[0]
    };
    return d.forEach((g)=>{
      let h=i[g];if(Xe(h))h.forEach((m)=>{
        p.children.push(r(m))
      })
    }),p
  };
  if(!go(e))e=yr(e);
  return r(e)
}function fu(e,{
  ignoreFieldNorm:n=X.ignoreFieldNorm
}){
  e.forEach((s)=>{
    let r=1;s.matches.forEach(({
      key:i,norm:d,score:c
    })=>{
      let p=i?i.weight:null;r*=Math.pow(c===0&&p?Number.EPSILON:c,(p||1)*(n?1:d))
    }),s.score=r
  })
}function hu(e,n){
  let s=e.matches;
  if(n.matches=[],!ke(s))return;
  s.forEach((r)=>{
    if(!ke(r.indices)||!r.indices.length)return;let{
      indices:i,value:d
    }=r,c={
      indices:i,value:d
    };if(r.key)c.key=r.key.src;if(r.idx>-1)c.refIndex=r.idx;n.matches.push(c)
  })
}function yu(e,n){
  n.score=e.score
}function _u(e,n,{
  includeMatches:s=X.includeMatches,includeScore:r=X.includeScore
}={
}){
  let i=[];
  if(s)i.push(hu);
  if(r)i.push(yu);
  return e.map((d)=>{
    let{
      idx:c
    }=d,p={
      item:n[c],refIndex:c
    };if(i.length)i.forEach((g)=>{
      g(d,p)
    });return p
  })
}class yne{
  constructor(e,n={
  },s){
    this.options={
      ...X,...n
    },this.options.useExtendedSearch,this._keyStore=new Er(this.options.keys),this.setCollection(e,s)
  }setCollection(e,n){
    if(this._docs=e,n&&!(n instanceof nn))throw Error(Gc);
    this._myIndex=n||Ar(this.options.keys,this._docs,{
      getFn:this.options.getFn,fieldNormWeight:this.options.fieldNormWeight
    })
  }add(e){
    if(!ke(e))return;
    this._docs.push(e),this._myIndex.add(e)
  }remove(e=()=>!1){
    let n=[];
    for(let s=0,r=this._docs.length;s<r;s+=1){
      let i=this._docs[s];
      if(e(i,s))this.removeAt(s),s-=1,r-=1,n.push(i)
    }return n
  }removeAt(e){
    this._docs.splice(e,1),this._myIndex.removeAt(e)
  }getIndex(){
    return this._myIndex
  }search(e,{
    limit:n=-1
  }={
  }){
    let{
      includeMatches:s,includeScore:r,shouldSort:i,sortFn:d,ignoreFieldNorm:c
    }=this.options,p=ze(e)?ze(this._docs[0])?this._searchStringList(e):this._searchObjectList(e):this._searchLogical(e);
    if(fu(p,{
      ignoreFieldNorm:c
    }),i)p.sort(d);
    if(_r(n)&&n>-1)p=p.slice(0,n);
    return _u(p,this._docs,{
      includeMatches:s,includeScore:r
    })
  }_searchStringList(e){
    let n=uo(e,this.options),{
      records:s
    }=this._myIndex,r=[];
    return s.forEach(({
      v:i,i:d,n:c
    })=>{
      if(!ke(i))return;let{
        isMatch:p,score:g,indices:h
      }=n.searchIn(i);if(p)r.push({
        item:i,idx:d,matches:[{
          score:g,value:i,norm:c,indices:h
        }]
      })
    }),r
  }_searchLogical(e){
    let n=xr(e,this.options),s=(c,p,g)=>{
      if(!c.children){
        let{
          keyId:m,searcher:S
        }=c,y=this._findMatches({
          key:this._keyStore.get(m),value:this._myIndex.getValueForItemAtKeyId(p,m),searcher:S
        });
        if(y&&y.length)return[{
          idx:g,item:p,matches:y
        }];
        return[]
      }let h=[];
      for(let m=0,S=c.children.length;m<S;m+=1){
        let y=c.children[m],E=s(y,p,g);
        if(E.length)h.push(...E);
        else if(c.operator===en.AND)return[]
      }return h
    },r=this._myIndex.records,i={
    },d=[];
    return r.forEach(({
      $:c,i:p
    })=>{
      if(ke(c)){
        let g=s(n,c,p);if(g.length){
          if(!i[p])i[p]={
            idx:p,item:c,matches:[]
          },d.push(i[p]);g.forEach(({
            matches:h
          })=>{
            i[p].matches.push(...h)
          })
        }
      }
    }),d
  }_searchObjectList(e){
    let n=uo(e,this.options),{
      keys:s,records:r
    }=this._myIndex,i=[];
    return r.forEach(({
      $:d,i:c
    })=>{
      if(!ke(d))return;let p=[];if(s.forEach((g,h)=>{
        p.push(...this._findMatches({
          key:g,value:d[h],searcher:n
        }))
      }),p.length)i.push({
        idx:c,item:d,matches:p
      })
    }),i
  }_findMatches({
    key:e,value:n,searcher:s
  }){
    if(!ke(n))return[];
    let r=[];
    if(Xe(n))n.forEach(({
      v:i,i:d,n:c
    })=>{
      if(!ke(i))return;let{
        isMatch:p,score:g,indices:h
      }=s.searchIn(i);if(p)r.push({
        score:g,key:e,value:i,idx:d,norm:c,indices:h
      })
    });
    else{
      let{
        v:i,n:d
      }=n,{
        isMatch:c,score:p,indices:g
      }=s.searchIn(i);
      if(c)r.push({
        score:p,key:e,value:i,norm:d,indices:g
      })
    }return r
  }
}yne.version="7.0.0";
yne.createIndex=Ar;
yne.parseIndex=su;
yne.config=X;
yne.parseQuery=xr;
pu(Tr);
var umn=/[:_-]/g;
class V3n{
  fuse;
  constructor(e){
    let n=e.map((s)=>{
      let{
        name:r,displayName:i
      }=s,d=r.split(umn).filter(Boolean),c=i!==r?i.split(umn).filter(Boolean):[];return{
        descriptionKey:(s.description??"").split(" ").map((p)=>p.toLowerCase().replace(/[^a-z0-9]/g,"")).filter(Boolean),partKey:d.length>1?d:void 0,displayPartKey:c.length>1?c:void 0,commandName:r,displayName:i,candidate:s,aliasKey:s.aliases
      }
    });
    this.fuse=new yne(n,{
      includeScore:!0,threshold:0.3,location:0,distance:100,keys:[{
        name:"commandName",weight:3
      },{
        name:"displayName",weight:2
      },{
        name:"partKey",weight:2
      },{
        name:"aliasKey",weight:2
      },{
        name:"displayPartKey",weight:1
      },{
        name:"descriptionKey",weight:0.5
      }]
    })
  }search(e,n){
    let{
      getScoreBoost:s,filter:r
    }=n??{
    },i=e.trim().toLowerCase(),d=this.fuse.search(i);
    if(r)d=d.filter((g)=>r(g.item.candidate));
    return d.map((g)=>{
      let h=g.item.commandName.toLowerCase(),m=g.item.displayName.toLowerCase(),S=g.item.aliasKey?.map((E)=>E.toLowerCase())??[],y=s?s(g.item.candidate):0;return{
        r:g,name:h,display:m,aliases:S,boost:y
      }
    }).sort((g,h)=>{
      let m=g.name,S=h.name,y=g.aliases,E=h.aliases,C=m===i||g.display===i,I=S===i||h.display===i;if(C&&!I)return-1;if(I&&!C)return 1;let x=y.some((M)=>M===i),L=E.some((M)=>M===i);if(x&&!L)return-1;if(L&&!x)return 1;let F=(M,V)=>Math.min(M.startsWith(i)?M.length:1/0,V.startsWith(i)?V.length:1/0),W=F(m,g.display),ne=F(S,h.display),me=W<1/0,te=ne<1/0;if(me&&!te)return-1;if(te&&!me)return 1;if(me&&te&&W!==ne)return W-ne;let oe=y.find((M)=>M.startsWith(i)),_=E.find((M)=>M.startsWith(i));if(oe&&!_)return-1;if(_&&!oe)return 1;if(oe&&_&&oe.length!==_.length)return oe.length-_.length;let w=Math.floor((g.r.score??0)*10),T=Math.floor((h.r.score??0)*10);if(w!==T)return w-T;return h.boost-g.boost
    }).map((g)=>g.r.item.candidate)
  }
}function Dv(){
  if(typeof setImmediate==="function")return new Promise((e)=>setImmediate(e));
  if(typeof MessageChannel==="function")return new Promise((e)=>{
    let n=new MessageChannel;n.port1.onmessage=()=>{
      n.port1.close(),e()
    },n.port2.postMessage(null)
  });
  return Q(0)
}var Dr=16,Lr=8,Su=6,Nr=4,Ur=8,zr=3,Hr=1,bu=100,yo=64,nUt=4;
class rUt{
  paths=[];
  lowerPaths=[];
  charBits=new Int32Array(0);
  pathLens=new Uint16Array(0);
  nameStarts=new Uint16Array(0);
  nameCharBits=new Int32Array(0);
  topLevelCache=null;
  matchPositions=new Int32Array(yo);
  nameMatchPositions=new Int32Array(yo);
  readyCount=0;
  buildGen=0;
  loadFromFileList(e){
    let n=new Set,s=[];
    for(let r of e)if(r.length>0&&!n.has(r))n.add(r),s.push(r);
    this.buildIndex(s)
  }loadFromFileListAsync(e){
    let n=()=>{
    },s=new Promise((i)=>{
      n=i
    }),r=this.buildAsync(e,n);
    return{
      queryable:s,done:r
    }
  }async buildAsync(e,n){
    let s=++this.buildGen,r=new Set,i=[],d=performance.now();
    for(let p=0;p<e.length;p++){
      let g=e[p];
      if(g.length>0&&!r.has(g))r.add(g),i.push(g);
      if((p&255)===255&&performance.now()-d>nUt){
        if(await Dv(),this.buildGen!==s)return n(),!1;
        d=performance.now()
      }
    }this.resetArrays(i),d=performance.now();
    let c=!0;
    for(let p=0;p<i.length;p++)if(this.indexPath(p),(p&255)===255&&performance.now()-d>nUt){
      if(this.readyCount=p+1,c)n(),c=!1;
      if(await Dv(),this.buildGen!==s)return!1;
      d=performance.now()
    }return this.readyCount=i.length,n(),!0
  }buildIndex(e){
    this.buildGen++,this.resetArrays(e);
    for(let n=0;n<e.length;n++)this.indexPath(n);
    this.readyCount=e.length
  }resetArrays(e){
    let n=e.length;
    this.paths=e,this.lowerPaths=Array(n),this.charBits=new Int32Array(n),this.pathLens=new Uint16Array(n),this.nameStarts=new Uint16Array(n),this.nameCharBits=new Int32Array(n),this.readyCount=0,this.topLevelCache=Ru(e,bu)
  }indexPath(e){
    let n=this.paths[e].toLowerCase();
    this.lowerPaths[e]=n;
    let s=n.length;
    this.pathLens[e]=s;
    let r=0,i=0,d=0;
    for(let c=0;c<s;c++){
      let p=n.charCodeAt(c);
      if(p>=97&&p<=122)r|=1<<p-97,d|=1<<p-97;
      else if((p===47||p===92)&&c<s-1)i=c+1,d=0
    }this.charBits[e]=r,this.nameStarts[e]=s===this.paths[e].length?i:0,this.nameCharBits[e]=d
  }search(e,n){
    if(n<=0)return[];
    if(e.length===0){
      if(this.topLevelCache)return this.topLevelCache.slice(0,n).map(({
        path:te,score:oe
      })=>({
        path:te,score:oe,positions:[]
      }));
      return[]
    }let s=e!==e.toLowerCase(),r=s?e:e.toLowerCase(),i=Math.min(r.length,yo),d=Array(i),c=0;
    for(let te=0;te<i;te++){
      let oe=r.charAt(te);
      d[te]=oe;
      let _=oe.charCodeAt(0);
      if(_>=97&&_<=122)c|=1<<_-97
    }let p=i*(Dr+Lr)+Ur+32,g=[],h=-1/0,{
      paths:m,lowerPaths:S,charBits:y,pathLens:E,readyCount:C
    }=this,{
      nameStarts:I,nameCharBits:x
    }=this,L=this.matchPositions,F=this.nameMatchPositions;
    e:for(let te=0;te<C;te++){
      if((y[te]&c)!==c)continue;
      let oe=s?m[te]:S[te],_=oe.indexOf(d[0]);
      if(_===-1)continue;
      L[0]=_;
      let w=0,T=0,M=_;
      for(let se=1;se<i;se++){
        if(_=oe.indexOf(d[se],M+1),_===-1)continue e;
        L[se]=_;
        let ue=_-M-1;
        if(ue===0)T+=Nr;
        else w+=zr+ue*Hr;
        M=_
      }let V=I[te],Z=w>0&&L[0]<V&&(x[te]&c)===c?Eu(oe,d,V,F):-1/0;
      if(g.length===n&&p+Math.max(T-w,Z)<=h)continue;
      let Y=m[te],ee=E[te],ie=T-w+Mr(Y,L,i),ve=0;
      if(Z!==-1/0){
        let se=Z+Mr(Y,F,i);
        if(se>=ie)ie=se,ve=V
      }if(ie+=i*Dr+Math.max(0,32-(ee>>2)),g.length<n){
        if(g.push({
          pathIndex:te,fuzzScore:ie,scanFrom:ve
        }),g.length===n)g.sort((se,ue)=>se.fuzzScore-ue.fuzzScore),h=g[0].fuzzScore
      }else if(ie>h){
        let se=0,ue=g.length;
        while(se<ue){
          let he=se+ue>>1;
          if(g[he].fuzzScore<ie)se=he+1;
          else ue=he
        }g.splice(se,0,{
          pathIndex:te,fuzzScore:ie,scanFrom:ve
        }),g.shift(),h=g[0].fuzzScore
      }
    }g.sort((te,oe)=>oe.fuzzScore-te.fuzzScore);
    let W=g.length,ne=Math.max(W,1),me=Array(W);
    for(let te=0;te<W;te++){
      let oe=g[te].pathIndex,_=m[oe],w=S[oe],T=s?_:w,M=Array(i),V=g[te].scanFrom;
      for(let ee=0;ee<i;ee++){
        let ie=T.indexOf(d[ee],V);
        M[ee]=ie,V=ie+1
      }if(!s&&w.length!==_.length)wu(_,M);
      let Z=te/ne,Y=_.includes("test")?Math.min(Z*1.05,1):Z;
      me[te]={
        path:_,score:Y,positions:M
      }
    }return me
  }
}function Eu(e,n,s,r){
  let i=0,d=s-1;
  for(let c=0;c<n.length;c++){
    let p=e.indexOf(n[c],d+1);
    if(p===-1)return-1/0;
    r[c]=p;
    let g=p-d-1;
    if(c>0)i+=g===0?Nr:-(zr+g*Hr);
    d=p
  }return i
}function Mr(e,n,s){
  let r=Ir(e,n[0],!0);
  for(let i=1;i<s;i++)r+=Ir(e,n[i],!1);
  return r
}function Ir(e,n,s){
  if(n===0)return s?Ur:0;
  let r=e.charCodeAt(n-1);
  if(ku(r))return Lr;
  if(Au(r)&&Ou(e.charCodeAt(n)))return Su;
  return 0
}function ku(e){
  return e===47||e===92||e===45||e===95||e===46||e===32
}function Au(e){
  return e>=97&&e<=122
}function Ou(e){
  return e>=65&&e<=90
}function wu(e,n){
  let s=0,r=0,i=0;
  while(i<n.length&&s<e.length){
    let d=e.codePointAt(s),c=d>65535?2:1,p=String.fromCodePoint(d).toLowerCase().length;
    while(i<n.length&&n[i]<r+p)n[i]=s,i++;
    s+=c,r+=p
  }
}function Ru(e,n){
  let s=new Set;
  for(let i of e){
    let d=i.length;
    for(let p=0;p<i.length;p++){
      let g=i.charCodeAt(p);
      if(g===47||g===92){
        d=p;
        break
      }
    }let c=i.slice(0,d);
    if(c.length>0){
      if(s.add(c),s.size>=n)break
    }
  }let r=Array.from(s);
  return r.sort((i,d)=>{
    let c=i.length-d.length;if(c!==0)return c;return i<d?-1:i>d?1:0
  }),r.slice(0,n).map((i)=>({
    path:i,score:0,positions:[]
  }))
}var BBr=["You've hit your","You've reached your","You're out of usage credits","Your org is out of usage \xB7 add funds to continue","Your org is out of usage \xB7 contact your admin","Your seat type doesn't include usage credits","Your seat type doesn't include usage","Your usage allocation has been disabled by your admin","Your group's usage limit is set to $0","Fable 5 requires usage credits","You're out of extra usage","Your seat type doesn't include extra usage"],UNo=[/^Fable(?: [^\u00B7\n]{1,40})? requires usage credits\./],jBr=["This service is disabled for your org"],WBr=["You've used","You're close to"],GBr=["You're now using usage credits","You're now using your usage allocation","Now using your usage allocation","Now using usage credits","You're now using extra usage","Now using extra usage"];
class VFe extends Error{
}var jr=["bash","powershell"];
var Tt=f(()=>o().optional().describe('Permission rule syntax to filter when this hook runs (e.g., "Bash(git *)"). Only runs if the tool call matches the pattern. Avoids spawning hooks for non-matching commands.'));
function vu(){
  let e=u({
    type:R("command").describe("Shell command hook type"),command:o().describe("Shell command to execute"),args:A(o()).optional().describe("Argument list for exec form. When present, `command` is resolved as "+"an executable and spawned directly with these arguments \u2014 no shell. "+"Path placeholders like ${CLAUDE_PLUGIN_ROOT} are substituted per-element as plain strings, so paths with quotes, $, or backticks never reach a shell parser. When absent, `command` runs through a shell (bash on POSIX, PowerShell on Windows without Git Bash)."),if:Tt(),shell:G(jr).optional().describe("Shell interpreter. 'bash' uses your $SHELL (bash/zsh/sh); 'powershell' uses pwsh. Defaults to bash (powershell on Windows without Git Bash)."),timeout:k().positive().optional().describe("Timeout in seconds for this specific command"),statusMessage:o().optional().describe("Custom status message to display in spinner while hook runs"),once:H().optional().describe("If true, hook runs once and is removed after execution"),async:H().optional().describe("If true, hook runs in background without blocking"),asyncRewake:H().optional().describe("If true, hook runs in background and wakes the model on exit code 2 (blocking error). Implies async."),rewakeMessage:o().min(1).optional().describe("@internal Custom prefix for the system-reminder shown to the model when an asyncRewake hook exits with code 2. The hook output is appended after this prefix."),rewakeSummary:o().min(1).optional().describe('@internal One-line summary shown to the user in the terminal when an asyncRewake hook exits with code 2. Defaults to "Stop hook feedback".'),cloud:G(["device","skip"]).optional().catch("skip").describe("@internal Where this hook may run when a cloud session is driven from this machine. 'device': offer it to the cloud session and run it here even when its script sits where the cloud session can write on this machine or cannot be pinned \u2014 the author accepts that the session may have changed files this hook executes. 'skip': never offer it to cloud sessions. Omit for the default: a command hook whose script could be read and pinned and lies outside everything the cloud session can write here is offered; other command hooks are not. Applies to this entry only: the same hook written in another settings scope keeps its own setting. An unrecognised value reads as 'skip' (the file still loads; the hook stays on this machine).")
  }),n=u({
    type:R("prompt").describe("LLM prompt hook type"),prompt:o().describe("Prompt to evaluate with LLM. Use $ARGUMENTS placeholder for hook input JSON."),if:Tt(),timeout:k().positive().optional().describe("Timeout in seconds for this specific prompt evaluation"),model:o().optional().describe('Model to use for this prompt hook (e.g., "claude-sonnet-5"). If not specified, uses the default small fast model.'),continueOnBlock:H().optional().describe(`Sets the continue value for the decision:"block" produced when ok is false. Default false (turn ends). Whether continue:true lets the turn proceed depends on the event's decision:"block" semantics. On PostToolUse, the reason is fed back to Claude and the turn continues.`),statusMessage:o().optional().describe("Custom status message to display in spinner while hook runs"),once:H().optional().describe("If true, hook runs once and is removed after execution")
  }),s=u({
    type:R("mcp_tool").describe("MCP tool hook type"),server:o().describe("Name of an already-configured MCP server to invoke"),tool:o().describe("Name of the tool on that server to call"),input:fe(o(),ae()).optional().describe('Arguments passed to the MCP tool. String values support ${path} interpolation from the hook input JSON (e.g. "${tool_input.file_path}").'),if:Tt(),timeout:k().positive().optional().describe("Timeout in seconds for this specific tool call"),statusMessage:o().optional().describe("Custom status message to display in spinner while hook runs"),once:H().optional().describe("If true, hook runs once and is removed after execution")
  }),r=u({
    type:R("http").describe("HTTP hook type"),url:o().url().describe("URL to POST the hook input JSON to"),if:Tt(),timeout:k().positive().optional().describe("Timeout in seconds for this specific request"),headers:fe(o(),o()).optional().describe('Additional headers to include in the request. Values may reference environment variables using $VAR_NAME or ${VAR_NAME} syntax (e.g., "Authorization": "Bearer $MY_TOKEN"). Only variables listed in allowedEnvVars will be interpolated.'),allowedEnvVars:A(o()).optional().describe("Explicit list of environment variable names that may be interpolated in header values. Only variables listed here will be resolved; all other $VAR references are left as empty strings. Required for env var interpolation to work."),statusMessage:o().optional().describe("Custom status message to display in spinner while hook runs"),once:H().optional().describe("If true, hook runs once and is removed after execution"),cloud:G(["device","skip"]).optional().catch("skip").describe("@internal Where this hook may run when a cloud session is driven from this machine. 'skip': never offer it to cloud sessions; 'device' or omitted: offered (an HTTP hook has no script to pin). Applies to this entry only. An unrecognised value reads as 'skip' (the file still loads).")
  }),i=u({
    type:R("agent").describe("Agentic verifier hook type"),prompt:o().describe('Prompt describing what to verify (e.g. "Verify that unit tests ran and passed."). Use $ARGUMENTS placeholder for hook input JSON.'),if:Tt(),timeout:k().positive().optional().describe("Timeout in seconds for agent execution (default 60)"),model:o().optional().describe('Model to use for this agent hook (e.g., "claude-sonnet-5"). If not specified, uses Haiku.'),statusMessage:o().optional().describe("Custom status message to display in spinner while hook runs"),once:H().optional().describe("If true, hook runs once and is removed after execution")
  });
  return{
    BashCommandHookSchema:e,PromptHookSchema:n,HttpHookSchema:r,AgentHookSchema:i,McpToolHookSchema:s
  }
}var i$o=24576,CRe=f(()=>{
  let{
    BashCommandHookSchema:e,PromptHookSchema:n,AgentHookSchema:s,HttpHookSchema:r,McpToolHookSchema:i
  }=vu();return Jo("type",[...[e,n,s,r,i]])
}),on=f(()=>u({
  matcher:o().optional().describe('String pattern to match (e.g. tool names like "Write")'),hooks:A(CRe()).describe("List of hooks to execute when the matcher matches")
})),g6=f(()=>wft(G(Mm),A(on())));
function a$o(e){
  if(/\$(?!\{CLAUDE_(?:PROJECT_DIR|PLUGIN_ROOT|PLUGIN_DATA)\})/.test(e)||e.includes("`")||/%[A-Za-z_][A-Za-z0-9_]*%/.test(e))return"Only ${CLAUDE_PROJECT_DIR}, ${CLAUDE_PLUGIN_ROOT} and ${CLAUDE_PLUGIN_DATA} are expanded in `file` (no shell runs); any other $\u2026, backtick or %NAME% is not expanded";
  let n=/^[a-zA-Z]:/.test(e)||e.includes("\\");
  if(O()==="windows"?/^[\\/](?![\\/])/.test(e)||/^[a-zA-Z]:(?![\\/])/.test(e):n)return O()==="windows"?"`file` is drive-relative on Windows (\\path or C:path); use a drive-absolute path, ~/ or a ${CLAUDE_\u2026} placeholder":"`file` is a Windows path (C:\u2026 or \\\u2026) read on another platform; use ~/, a ${CLAUDE_\u2026} placeholder or a relative path so the hook resolves everywhere";
  if(e.startsWith("~")&&e!=="~"&&!/^~[\\/]/.test(e))return"`file` starting with ~name is not expanded; use an absolute path or ~/";
  if(e.trim()===""||e==="."||e===".."||e==="~"||/[\\/]$/.test(e)||/[\\/]\.{1,2}$/.test(e)||/^\$\{CLAUDE_(?:PROJECT_DIR|PLUGIN_ROOT|PLUGIN_DATA)\}$/.test(e))return"`file` must name a script file, not a directory or an empty path";
  return
}function sn(){
  return new Set(CRe().options.map((e)=>e.shape.type.value))
}function Cu(e,n){
  if(!e||typeof e!=="object"||Array.isArray(e)){
    let i=De(e);
    return{
      problem:`Hook entry must be an object; received ${i}`,received:i,aboutType:!1
    }
  }let s=e.type;
  if(typeof s!=="string"){
    let i=De(s);
    return{
      problem:s===void 0?'Hook entry has no "type"':`Hook entry "type" must be a string; received ${i}`,received:i,aboutType:!0
    }
  }if(!n.has(s)){
    let i=zm(s);
    return{
      problem:`Unknown hook type "${i}"`,received:i,aboutType:!0
    }
  }let r=CRe().safeParse(e);
  if(!r.success)return{
    problem:`Invalid ${s} hook (${_o(r.error)})`,received:s,aboutType:!1
  };
  return
}function _o(e){
  return e.issues.map((n)=>n.path.length>0?`${n.path.join(".")}: ${n.message}`:n.message).join("; ")
}function wne(e){
  if(!e||typeof e!=="object"||Array.isArray(e))return!1;
  if(!("matcher"in e)&&Object.keys(e).some((s)=>Mm.includes(s)))return!1;
  let n=e.hooks;
  if(Array.isArray(n))return n.length>0;
  return!!n&&typeof n==="object"&&(("matcher"in e)||typeof n.type==="string")
}function Nye(e,n=3,{
  matchersCount:s=!0,unscannedKeys:r=Kr,inHooksList:i=!1
}={
}){
  if(Br(e))return!0;
  if(s&&wne(e))return!0;
  if(n===0||!e||typeof e!=="object")return!1;
  if(Array.isArray(e))return e.some((d)=>Nye(d,n-1,{
    matchersCount:s,unscannedKeys:r,inHooksList:i
  }));
  if(i&&typeof e.type==="string")return!1;
  return Object.entries(e).some(([d,c])=>!r.has(d)&&Nye(c,n-1,{
    unscannedKeys:r,matchersCount:s&&!Mm.includes(d),inHooksList:d==="hooks"&&Array.isArray(c)
  }))
}function Xq(e,n){
  if(!e||typeof e!=="object"||Array.isArray(e))return!1;
  return Br(e)||Object.entries(e).some(([s,r])=>s!=="hooks"&&!n.has(s)&&Nye(r,3,{
    unscannedKeys:n,matchersCount:!Mm.includes(s)
  }))
}var Kr=new Set,Fr=new Set(["mcpServers","managedMcpServers","lspServers","pluginConfigs","enabledPlugins","extraKnownMarketplaces","env","skillOverrides","modelSettings"]),Ypt=new Set(["metadata","mcpServers","lspServers"]),m1r=new Set([...Ypt,"experimental"]),Lmn=Kr;
function Br(e){
  if(!e||typeof e!=="object"||Array.isArray(e))return!1;
  return Object.entries(e).some(([n,s])=>EJ.has(n)&&s!==null&&s!==void 0&&!(Array.isArray(s)&&s.length===0))
}function sde(e){
  if(wne(e))return!0;
  if(Array.isArray(e))return e.some(sde);
  if(!e||typeof e!=="object")return!1;
  return Object.entries(e).some(([n,s])=>EJ.has(n)&&s!==null&&s!==void 0&&!(Array.isArray(s)&&s.length===0))
}var EJ=new Set(["PreToolUse","PermissionRequest"]);
function rn(e,n){
  if(!Array.isArray(e))return{
    stripped:[],unloadableGuards:[]
  };
  let s=EJ.has(n),r=sn(),i=on(),d=[],c=[];
  for(let p=e.length-1;p>=0;p--){
    let g=e[p],h=(E,C)=>{
      if(!s)e.splice(p,1);
      d.push({
        matcherIndex:p,hookIndex:void 0,path:`${p}`,problem:E,received:C,aboutType:!1
      })
    };
    if(Nye(g,3,{
      matchersCount:!1
    })){
      (s?d:c).push({
        matcherIndex:p,hookIndex:void 0,path:`${p}`,problem:"holds PreToolUse/PermissionRequest hooks where a matcher was expected",received:De(g),aboutType:!1
      });
      continue
    }if(!g||typeof g!=="object"||Array.isArray(g)){
      h(`Hook matcher must be an object; received ${De(g)}`,De(g));
      continue
    }let m=g.hooks;
    if(!Array.isArray(m)){
      h(`Hook matcher "hooks" must be an array of hook entries; received ${De(m)}`,De(m));
      continue
    }let S=[];
    for(let E=m.length-1;E>=0;E--){
      let C=Cu(m[E],r);
      if(C!==void 0){
        if(!s)m.splice(E,1);
        S.push({
          matcherIndex:p,hookIndex:E,path:`${p}.hooks.${E}`,...C
        })
      }
    }let y=i.safeParse(s?{
      ...g,hooks:[]
    }:g);
    if(!y.success){
      h(`Invalid hook matcher (${_o(y.error)})`,"matcher");
      continue
    }d.push(...S)
  }return d.reverse(),c.reverse(),s?{
    stripped:[],unloadableGuards:d
  }:{
    stripped:d,unloadableGuards:c
  }
}class vne extends Error{
}var Yb="a PreToolUse/PermissionRequest hook that cannot be loaded may be what guards the permissions declared beside it, so nothing it sits in is applied until the entry is fixed or removed";
function Ene(e){
  if(wne(e)||Array.isArray(e)&&e.some(wne))return{
    notes:[],unloadableGuards:[`hooks: must be an object mapping event names to matcher arrays; received ${Array.isArray(e)?"an array of matchers":"a single matcher"}`]
  };
  if(!e||typeof e!=="object"||Array.isArray(e))return{
    notes:[],unloadableGuards:[]
  };
  let n=e,s=new Set(Mm),r=[],i=[];
  for(let[d,c]of Object.entries(n)){
    let p=zm(d);
    if(!s.has(d)){
      if(Nye(c,3,{
        matchersCount:!Array.isArray(c)
      })){
        i.push(`hooks.${p}: not a hook event, but it holds PreToolUse/PermissionRequest hooks`);
        continue
      }delete n[d],r.push(`hooks.${p}: unknown hook event; entry ignored`);
      continue
    }if(!Array.isArray(c)){
      if(EJ.has(d)&&c!==null||Nye(c,3,{
        matchersCount:!1
      })){
        i.push(`hooks.${p}: must be an array of matchers; received ${De(c)}`);
        continue
      }delete n[d],r.push(`hooks.${p}: must be an array of matchers; received ${De(c)}; entry ignored`);
      continue
    }let g=rn(c,d);
    for(let h of g.stripped)r.push(`hooks.${p}.${h.path}: ${h.problem}; entry ignored`);
    for(let h of g.unloadableGuards)i.push(`hooks.${p}.${h.path}: ${h.problem}`)
  }return{
    notes:r,unloadableGuards:i
  }
}function g1r(e){
  if(typeof e!=="object"||e===null||Array.isArray(e))return{
    hooks:void 0,invalid:[{
      path:"hooks",reason:`must be an object mapping hook event names to matcher arrays; received ${De(e)}`
    }],unloadableGuards:Array.isArray(e)&&e.some(wne)?["hooks"]:[]
  };
  if(wne(e))return{
    hooks:void 0,invalid:[{
      path:"hooks",reason:"must be an object mapping hook event names to matcher arrays; received a single matcher"
    }],unloadableGuards:["hooks"]
  };
  let n=new Set(Mm),s=A(on()),r=Object.entries(e).map(([d,c])=>{
    if(!n.has(d))return{
      invalid:{
        path:`hooks.${d}`,reason:`unknown hook event. Valid events: ${Mm.join(", ")}`
      }
    };let{
      stripped:p,unloadableGuards:g
    }=rn(c,d);if(g.length>0)return{
      invalid:{
        path:`hooks.${d}`,reason:`${g.map((y)=>`${y.path}: ${y.problem}`).join("; ")} \u2014 ${Yb}`
      },unloadableGuard:!0
    };let h=p.map((y)=>`${y.path}: ${y.problem}; entry ignored`),m=s.safeParse(c);if(m.success){
      let y=h.length>0&&{
        invalid:{
          path:`hooks.${d}`,reason:h.join("; ")
        }
      };if(y&&!m.data.some((E)=>E.hooks.length>0))return{
        ...y
      };return{
        entry:[d,m.data],...y
      }
    }let S=Array.isArray(c)?[...h,_o(m.error)].join("; "):`must be an array of matchers; received ${De(c)}`;return{
      invalid:{
        path:`hooks.${d}`,reason:S
      },...EJ.has(d)&&c!==null&&!Array.isArray(c)&&{
        unloadableGuard:!0
      }
    }
  }),i=r.flatMap((d)=>d.entry?[d.entry]:[]);
  return{
    hooks:i.length>0?Object.fromEntries(i):void 0,invalid:r.flatMap((d)=>d.invalid?[d.invalid]:[]),unloadableGuards:r.flatMap((d)=>d.unloadableGuard&&d.invalid?[d.invalid.path]:[])
  }
}function De(e){
  if(e===null||e===void 0)return String(e);
  if(Array.isArray(e))return"an array";
  let n=typeof e;
  return`${n==="object"?"an":"a"} ${n}`
}import{
  homedir as Pu
}from"os";
import{
  resolve as Tu
}from"path";
var Xpt=/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;
async function eUe(e){
  let n=e.trim(),s=ce(),r=n.match(/^([a-zA-Z0-9._-]+@[^:]+:.+?(?:\.git)?)(#(.+))?$/);
  if(r?.[1]){
    let c=r[1],p=r[3];
    return p?{
      source:"git",url:c,ref:p
    }:{
      source:"git",url:c
    }
  }if(n.startsWith("http://")||n.startsWith("https://")){
    let c=n.match(/^([^#]+)(#(.+))?$/),p=c?.[1]||n,g=c?.[3];
    if(p.endsWith(".git")||p.includes("/_git/"))return g?{
      source:"git",url:p,ref:g
    }:{
      source:"git",url:p
    };
    let h;
    try{
      h=new URL(p)
    }catch(m){
      return{
        source:"url",url:p
      }
    }if(Co(h.hostname)){
      if(h.pathname.match(/^\/([^/]+\/[^/]+?)(\/|\.git|$)/)?.[1]&&!ZUe(p)){
        let S=p.replace(/(?:[/?#]|%2[Ff]|%3[Ff]|%23)+$/,""),y=S.indexOf("/",S.indexOf("://")+3),E=y===-1?"":S.slice(y);
        if(/^\/[^/]+\/[^/]+/.test(E)){
          let C=S.endsWith(".git")?S:`${S}.git`;
          return g?{
            source:"git",url:C,ref:g
          }:{
            source:"git",url:C
          }
        }
      }
    }if(Iu(h.hostname)){
      let m=h.pathname.split("/").filter(Boolean),S=p.indexOf("/",p.indexOf("://")+3),y=S===-1?"":p.slice(S).replace(/\/+$/,""),E=m.map((I)=>{
        try{
          return decodeURIComponent(I)
        }catch{
          return null
        }
      });
      if(m.length>=2&&y===`/${m.join("/")}`&&!/[\t\n\r]/.test(p)&&!ZUe(p)&&E.every((I)=>I!==null)&&E[0]!=="api"&&!E.includes("-")){
        let I=p.replace(/\/+$/,""),x=I.endsWith(".git")?I:`${I}.git`;
        return g?{
          source:"git",url:x,ref:g
        }:{
          source:"git",url:x
        }
      }
    }return{
      source:"url",url:p
    }
  }let d=!1;
  if(n.startsWith("./")||n.startsWith("../")||n.startsWith("/")||n.startsWith("~")||d){
    let c=Tu(n.startsWith("~")?n.replace(/^~/,()=>Pu()):n);
    if(nM(c))return{
      error:`${c} is a device-namespace path, which can't be checked for links to a network location. Give it without the \\\\?\\ or \\\\.\\ prefix.`
    };
    if(!yN(c)){
      let g=O9e(),h=await hK(s,c,{
        anchors:g===null?[c]:[g,c],launchAncestry:hxe(s),surfaceNetworkRaw:!0,unreadableAncestry:"unverified"
      });
      if(h!==void 0)return{
        error:h===Fh?`Can't check ${c} for links to a network location: a folder or link along it can't be examined. Use a directory whose folders can be read, or owner/repo or an https:// URL.`:`${c} passes through a link to a network location, or to a link target that can't be checked, so it was not read. Give the link's target itself, or use a local directory, owner/repo or an https:// URL.`
      }
    }let p;
    try{
      p=await s.stat(c)
    }catch(g){
      let h=v(g);
      return{
        error:h==="ENOENT"?`Path does not exist: ${c}`:`Cannot access path: ${c} (${h??g})`
      }
    }if(p.isFile())if(c.endsWith(".json"))return{
      source:"file",path:c
    };
    else return{
      error:`File path must point to a .json file (marketplace.json), but got: ${c}`
    };
    else if(p.isDirectory())return{
      source:"directory",path:c
    };
    else return{
      error:`Path is neither a file nor a directory: ${c}`
    }
  }if(n.includes("/")&&!n.startsWith("@")){
    if(n.includes(":"))return null;
    let c=n.match(/^([^#@]+)(?:[#@](.+))?$/),p=c?.[1]||n,g=c?.[2];
    if(!Xpt.test(p))return{
      error:`'${n}' is not a valid GitHub owner/repo shorthand. For a git repo, use the full https:// clone URL from your host (typically ending in .git \u2014 some hosts like Azure DevOps omit it). For a hosted marketplace.json, use its https:// URL. For a local path, use ./ or an absolute path.`
    };
    return g?{
      source:"github",repo:p,ref:g
    }:{
      source:"github",repo:p
    }
  }return null
}function l5n(e){
  if(w_e(e))return null;
  let n=e,s=e.indexOf("://");
  if(s!==-1){
    let i;
    try{
      i=new URL(e)
    }catch{
      i=null
    }let d=e.slice(s+3).search(/[/?#]/)+s+3;
    if(i===null||!xu.has(i.protocol)||!(Du.has(i.protocol)?Wr(i.hostname):Co(i.hostname))||e[d]!=="/")return null;
    n=e.slice(d+1).split(/[?#]/)[0]??""
  }else if(e.includes(":")){
    let i=e.indexOf(":");
    if(e.slice(0,i).includes("/")||!Wr(e.slice(e.indexOf("@")+1,i)))return null;
    n=e.slice(i+1).replace(/^\//,"")
  }let r=n.replace(/\/$/,"").replace(/\.git$/i,"");
  if(!Xpt.test(r)||/\/\.\.?$/.test(r))return null;
  return r.toLowerCase()
}var xt="anthropics";
function Nmn(e){
  return l5n(e)?.startsWith(`${xt}/`)===!0
}var xu=new Set(["https:","http:","git:","git+https:","git+http:","git+ssh:","ssh:"]),Du=new Set(["ssh:","git+ssh:"]);
function Wr(e){
  return Co(e)||fYn(e,"ssh.github.com")
}var Mu="gitlab.com";
function Iu(e){
  return fYn(e,Mu)
}var o8e=500,c5n=32;
function Zr(){
  return{
    claudeaiPluginId:o().max(128).optional().catch(void 0),archiveSha256:yi().optional().catch(void 0)
  }
}function ei(){
  return{
    directoryRepositoryKey:o().max(4096).optional().catch(void 0)
  }
}function $mn(e){
  if(!/^https?:\/\/[^/\\]/i.test(e))return!1;
  try{
    let{
      protocol:n
    }=new URL(e);
    return n==="https:"||n==="http:"
  }catch{
    return!1
  }
}function ti(){
  return{
    npmVersionSpec:o().max(256).optional().catch(void 0),npmResolved:o().max(2048).optional().catch(void 0),npmIntegrity:o().max(256).optional().catch(void 0),npmRegistry:o().max(2048).refine($mn).optional().catch(void 0)
  }
}function ni(){
  return{
    sourceCommand:o().max(o8e+20).optional().catch(void 0).describe("The `command`-source command the user accepted at explicit install/update. The once-per-session background re-resolve only runs while the marketplace entry still declares this exact command; a changed command (or an entry that became command-sourced later) is skipped with a warning until the user runs an explicit update."),sourceProducerPath:o().max(4096).refine(Gr,{
      message:"must be an absolute path"
    }).optional().catch(void 0).describe("The directory a `command`-source plugin was last resolved to (what its command printed). Served in place in link mode and re-copied every session in copy mode, so the sandbox write-denies it; refreshed on every install/update, including no-op updates that resolve to a new location."),previousProducerPaths:A(ae()).transform((e)=>e.filter((n)=>typeof n==="string"&&n.length<=4096&&Gr(n)).slice(-c5n)).optional().catch(void 0).describe("Producer directories this installation was resolved to before the current one (most recent last, bounded). A concurrent older session may still serve one of them, so the sandbox keeps write-denying them too.")
  }
}function Gr(e){
  return Lu.isAbsolute(e)||Nu.isAbsolute(e)
}var oi=/[^\x20-\x7E]| {4,}/;
function wo(){
  return o().max(o8e,{
    message:"headersHelper must not be longer than the install consent UI can display"
  }).refine((e)=>!oi.test(e),{
    message:"headersHelper must be printable ASCII (letters, digits, punctuation, single spaces) with no runs of 4 or more spaces"
  })
}var RRe="anthropic-plugin-directory",AUt=new Set(["claude-community","claude-plugins-community","healthcare"]),tUe=new Set(["claude-code-marketplace","claude-code-plugins","claude-plugins-official","anthropic-marketplace","anthropic-plugins","agent-skills","anthropic-agent-skills","life-sciences","knowledge-work-plugins","claude-for-legal","claude-for-financial-services","financial-services-plugins","first-party-plugins","claude-tag-plugins"]),Fmn=new Set([RRe,"claude-plugin-directory"]),kne=new Set([...tUe,...AUt,...Fmn]),Uu=new Set(["knowledge-work-plugins","first-party-plugins"]);
function $ye(e,n,s){
  if(s!==void 0)return s;
  if(n.autoUpdate!==void 0)return n.autoUpdate;
  if(n.source?.source==="claudeai")return!0;
  if(n.source?.source==="pluginDirectory")return!0;
  let r=e.toLowerCase();
  return tUe.has(r)&&!Uu.has(r)
}function zu(){
  return["marketplace","plugins","official"]
}var Hu=new RegExp(`(?:official[^a-z0-9]*(anthropic|claude)|(?:anthropic|claude)[^a-z0-9]*official|^(?:anthropic|claude)[^a-z0-9]*(${zu().join("|")}))`,"i"),si=/[^\u0020-\u007E]/;
function d5n(e){
  if(kne.has(e.toLowerCase()))return!1;
  if(si.test(e))return!0;
  if(Hu.test(e))return!0;
  return!1
}function u5n(e){
  return d5n(e)&&!si.test(e)
}function ju(e){
  let n=e.trim();
  return n.includes(":")&&Nmn(n)
}function s8e(e,n){
  let s=e.toLowerCase();
  if(!kne.has(s))return null;
  if(n.source==="github"){
    let r=n.repo??"";
    if(r.includes(":")||!Nmn(r))return`The name '${e}' is reserved for official Anthropic marketplaces. Only repositories from 'github.com/${xt}/' can use this name.`;
    return null
  }if(n.source==="git"&&n.url){
    if(ju(n.url))return null;
    return`The name '${e}' is reserved for official Anthropic marketplaces. Only repositories from 'github.com/${xt}/' can use this name.`
  }return`The name '${e}' is reserved for official Anthropic marketplaces and can only be used with GitHub sources from the '${xt}' organization.`
}var Ae=f(()=>o().startsWith("./")),at=f(()=>Ae().endsWith(".json")),Vr=f(()=>Fe([R("."),Ae()])),Yr=f(()=>Fe([Ae().refine((e)=>e.endsWith(".mcpb")||e.endsWith(".dxt"),{
  message:"MCPB file path must end with .mcpb or .dxt"
}).describe("Path to MCPB file relative to plugin root"),o().url().refine((e)=>e.endsWith(".mcpb")||e.endsWith(".dxt"),{
  message:"MCPB URL must end with .mcpb or .dxt"
}).describe("URL to MCPB file")])),bo=f(()=>Ae().endsWith(".md")),Eo=f(()=>Fe([bo(),Ae()])),Ro={
  inline:"--plugin-dir session plugins",builtin:"built-in plugins","skills-dir":"plugins auto-loaded from .claude/skills/",synced:"plugins synced from your claude.ai account","claude-plugin-test":"plugins loaded by claude plugin test",npm:"plugins installed from an npm registry (`<package>@npm`); remove this marketplace and add it again under another name",pip:"plugins installed from a Python package index (reserved; not yet available)",uv:"plugins installed from a Python package index through uv (reserved; not yet available)",cargo:"plugins installed from a Rust crate registry (reserved; not yet available)",github:"plugins installed straight from a GitHub repository (`<owner>/<repo>@github`; reserved; not yet available)",gh:"plugins installed straight from a GitHub repository (reserved; not yet available)"
},GS="npm",ri=["pip","uv","cargo","github","gh"];
function h1r(e){
  return e!==void 0&&ri.includes(e)
}function l$o(e){
  return`Installing plugins from ${e} (\`<package>@${e}\`) is not available yet.`
}function Jq(e){
  return Object.hasOwn(Ro,e)
}var Ku=[GS,...ri];
function p5n(e){
  return Ku.includes(e.toLowerCase())
}function $u(e,n){
  let s=e.toLowerCase();
  if(p5n(s)&&Jq(s))n.addIssue({
    code:"custom",message:`Marketplace name "${s}" is reserved for ${Ro[s]}`
  })
}var f5n="Marketplace name impersonates an official Anthropic/Claude marketplace",ii=(e)=>o().min(1,"Marketplace must have a name").refine((n)=>!n.includes(" "),{
  message:'Marketplace name cannot contain spaces. Use kebab-case (e.g., "my-marketplace")'
}).refine((n)=>!IUt.test(n),{
  message:"Marketplace name cannot contain control or bidirectional-formatting characters"
}).refine((n)=>!n.includes("/")&&!n.includes("\\")&&!n.includes("..")&&n!==".",{
  message:'Marketplace name cannot contain path separators (/ or \\), ".." sequences, or be "."'
}).refine((n)=>!e||!d5n(n),{
  message:f5n
}).superRefine((n,s)=>{
  let r=n.toLowerCase();if(!Jq(r)||p5n(r))return;s.addIssue({
    code:"custom",message:`Marketplace name "${r}" is reserved for ${Ro[r]}`
  })
}),m5n=f(()=>ii(!0)),Fu=f(()=>ii(!1)),ln=f(()=>o().min(1,"Plugin name cannot be empty").refine((e)=>!e.includes(" "),{
  message:'Plugin name cannot contain spaces. Use kebab-case (e.g., "my-plugin")'
}).refine((e)=>!IUt.test(e),{
  message:"Plugin name cannot contain control or bidirectional-formatting characters"
})),Po=f(()=>u({
  name:o().min(1,"Author name cannot be empty").describe("Display name of the plugin author or organization"),email:o().optional().describe("Contact email for support or feedback"),url:o().optional().describe("Website, GitHub profile, or organization URL")
})),Bu=f(()=>u({
  $schema:o().optional().describe("JSON Schema reference for editor autocomplete/validation; ignored at load time"),name:ln().describe("Unique identifier for the plugin, used for namespacing (prefer kebab-case)"),displayName:o().optional().describe('Human-readable name shown in UI (e.g., "GitHub Utils"). Falls back to `name` when omitted. Unlike `name`, may contain spaces and any casing; not used for namespacing or lookup.'),version:o().optional().describe("Semantic version (e.g., 1.2.3) following semver.org specification"),description:o().optional().describe("Brief, user-facing explanation of what the plugin provides"),author:Po().optional().describe("Information about the plugin creator or maintainer"),homepage:o().url().optional().describe("Plugin homepage or documentation URL"),repository:o().optional().describe("Source code repository URL"),license:o().optional().describe("SPDX license identifier (e.g., MIT, Apache-2.0)"),keywords:A(o()).optional().describe("Tags for plugin discovery and categorization"),defaultEnabled:H().optional().describe("Whether the plugin starts enabled when the user has no explicit enabled/disabled setting for it (default: true). Explicit enabledPlugins values always win, and a plugin required by an enabled dependent is enabled regardless of this value."),dependencies:A(Dp()).optional().describe(`Plugins that must be enabled for this plugin to function. Bare names (no "@marketplace") are resolved against the declaring plugin's own marketplace.`),metadata:Bi((e)=>z(e)?e:void 0,fe(o(),ae()).optional()).describe("Free-form metadata for the plugin author's own use (e.g. entitlement or catalog fields). Preserved on the parsed manifest but not read by Claude Code.")
})),Wu=1,Umn=f(()=>u({
  $schema:o().optional().catch(void 0).describe("JSON Schema reference for editor autocomplete/validation; ignored at load time"),description:o().optional().describe("Brief, user-facing explanation of what these hooks provide"),hooks:wA(()=>g6()).optional().describe("The hooks provided by the plugin, in the same format as the one used for settings"),modules:A(o()).max(Wu,{
    message:"hooks.json `modules` names one hooks module per plugin; a second entry is refused"
  }).optional().describe(`The hooks module: one path, relative to this hooks.json, of a module exporting register(on). The module, and every file it imports from the plugin, is named like code (${p1r}; a file named otherwise is not loaded) and is an ES module whatever its suffix. What it hooks and calls is read from its source before it loads; \`claude plugin validate\` shows the result.`),surface:jRe({
    error:'hooks.json `surface` is gone: name the module in the Client element, `Client({ module: "./board.tsx", key })`, a path relative to the file that builds it'
  }).optional()
}).refine((e)=>e.hooks!==void 0||(e.modules?.length??0)>0,{
  message:"hooks.json must have `hooks` (the hook matchers) or `modules` (hooks modules), or both"
})),Gu=f(()=>u({
  hooks:Fe([at().describe("Path to file with additional hooks (in addition to those in hooks/hooks.json, if it exists), relative to the plugin root"),wA(()=>g6()).describe("Additional hooks (in addition to those in hooks/hooks.json, if it exists)"),A(Fe([at().describe("Path to file with additional hooks (in addition to those in hooks/hooks.json, if it exists), relative to the plugin root"),wA(()=>g6()).describe("Additional hooks (in addition to those in hooks/hooks.json, if it exists)")]))])
})),Vu=f(()=>u({
  source:Eo().optional().describe("Path to command markdown file, relative to plugin root"),content:o().optional().describe("Inline markdown content for the command"),description:o().optional().describe("Command description override"),argumentHint:o().optional().describe('Hint for command arguments (e.g., "[file]")'),model:o().optional().describe("Default model for this command"),allowedTools:A(o()).optional().describe("Tools allowed when command runs")
}).refine((e)=>e.source&&!e.content||!e.source&&e.content,{
  message:'Command must have either "source" (file path) or "content" (inline markdown), but not both'
})),Yu=f(()=>u({
  commands:Fe([Eo().describe("Path to a command file or skill directory, relative to the plugin root. When set, the commands/ directory is not auto-loaded \u2014 list its files here if you want both."),A(Eo().describe("Path to a command file or skill directory, relative to the plugin root. When set, the commands/ directory is not auto-loaded \u2014 list its files here if you want both.")).describe("List of command file or skill directory paths. When set, the commands/ directory is not auto-loaded."),fe(o(),Vu()).describe('Object mapping of command names to their metadata and source files. Command name becomes the slash command name (e.g., "about" \u2192 "/plugin:about")')])
})),Xu=f(()=>u({
  agents:Fe([bo().describe("Path to an agent file, relative to the plugin root. When set, the agents/ directory is not auto-loaded \u2014 list its files here if you want both."),A(bo().describe("Path to an agent file, relative to the plugin root. When set, the agents/ directory is not auto-loaded \u2014 list its files here if you want both.")).describe("List of agent file paths. When set, the agents/ directory is not auto-loaded.")])
})),Ju=f(()=>u({
  skills:Fe([Vr().describe('Path to a skill directory, relative to the plugin root ("." / "./" denote the plugin root itself). Loaded in addition to the skills/ directory (except: for a marketplace entry whose source resolves to the marketplace root, declaring a specific subdirectory replaces the skills/ scan).'),A(Vr().describe('Path to a skill directory, relative to the plugin root ("." / "./" denote the plugin root itself).')).describe("List of skill directory paths, loaded in addition to the skills/ directory (except: for a marketplace entry whose source resolves to the marketplace root, declaring specific subdirectories replaces the skills/ scan).")])
})),g5n=f(()=>Fe([o(),A(o())])),ai=f(()=>u({
  outputStyles:Fe([Ae().describe("Path to an output-styles directory or file, relative to the plugin root. When set, the output-styles/ directory is not auto-loaded \u2014 list its files here if you want both."),A(Ae().describe("Path to an output-styles directory or file, relative to the plugin root. When set, the output-styles/ directory is not auto-loaded \u2014 list its files here if you want both.")).describe("List of output-style directory or file paths. When set, the output-styles/ directory is not auto-loaded.")])
})),qu=f(()=>o().max(64).regex(/^[a-z][a-z0-9_-]*$/,"must match ^[a-z][a-z0-9_-]*$")),Zu=16,Qu=f(()=>u({
  id:qu(),remote:o().max(256).regex(/^(npm:[@a-z0-9/._-]+(@[a-z0-9._+-]+)?|github:[\w.-]+\/[\w.-]+@[\w./-]+#.+\.js)$/,"must be npm:<pkg>[@ver] or github:<owner>/<repo>@<ref>#<path>.js").optional(),integrity:o().max(512).regex(/^sha(256|384|512)-[A-Za-z0-9+/=]+$/,"must be SRI form: sha256-, sha384-, or sha512-<base64>").optional()
}).strict()),ep=f(()=>u({
  syntaxHighlighting:u({
    hljsLanguages:A(Qu()).max(Zu)
  }).strict()
})),li=f(()=>u({
  themes:Fe([Ae().describe("Path to a themes directory or file, relative to the plugin root. When set, the themes/ directory is not auto-loaded \u2014 list its files here if you want both."),A(Ae().describe("Path to a themes directory or file, relative to the plugin root. When set, the themes/ directory is not auto-loaded \u2014 list its files here if you want both.")).describe("List of theme directory or file paths. When set, the themes/ directory is not auto-loaded.")])
})),tp=f(()=>u({
  workflows:Fe([Ae().describe("Path to a workflows directory or .js file, relative to the plugin root. When set, the workflows/ directory is not auto-loaded \u2014 list its files here if you want both."),A(Ae().describe("Path to a workflows directory or .js file, relative to the plugin root. When set, the workflows/ directory is not auto-loaded \u2014 list its files here if you want both.")).describe("List of workflow directory or .js file paths. When set, the workflows/ directory is not auto-loaded.")]).optional()
})),Xr=f(()=>o().min(1)),np=f(()=>o().min(2).refine((e)=>e.startsWith("."),{
  message:'File extensions must start with dot (e.g., ".ts", not "ts")'
})),op=f(()=>u({
  mcpServers:Fe([at().describe("MCP servers to include in the plugin (in addition to those in the .mcp.json file, if it exists)"),Yr().describe("Path or URL to MCPB file containing MCP server configuration"),fe(o(),Kq()).describe("MCP server configurations keyed by server name"),A(Fe([at().describe("Path to MCP servers configuration file"),Yr().describe("Path or URL to MCPB file"),fe(o(),Kq()).describe("Inline MCP server configurations")])).describe("Array of MCP server configurations (paths, MCPB files, or inline definitions)")])
})),di=f(()=>u({
  type:G(["string","number","boolean","directory","file"]).describe("Type of the configuration value"),title:o().describe("Human-readable label shown in the config dialog"),description:o().describe("Help text shown beneath the field in the config dialog"),required:H().optional().describe("If true, validation fails when this field is empty"),default:Fe([o(),k(),H(),A(o())]).optional().describe("Default value used when the user provides nothing"),multiple:H().optional().describe("For string type: allow an array of strings"),sensitive:H().optional().describe("If true, masks dialog input and stores value in secure storage (keychain/credentials file) instead of settings.json"),min:k().optional().describe("Minimum value (number type only)"),max:k().optional().describe("Maximum value (number type only)"),options:A(o().min(1,"An option cannot be empty").max(64,"An option can be at most 64 characters").refine((e)=>Dmn(e)===e,{
    message:"An option cannot contain control, invisible or bidirectional-formatting characters"
  }).refine((e)=>e.trim()===e,{
    message:"An option cannot start or end with a space"
  })).min(1,"options needs at least one value").refine((e)=>new Set(e.map((n)=>n.toLowerCase())).size===e.length,{
    message:"options cannot repeat a value (in any letter case)"
  }).readonly().optional().describe("For string type: the only values the field takes. /config shows the field as a picker over them, and a stored value outside them counts as unset")
}).strict().superRefine((e,n)=>{
  if(e.options===void 0)return;if(e.type!=="string"||e.multiple===!0||e.sensitive===!0){
    n.addIssue({
      code:"custom",path:["options"],message:'options is only for a field of type "string" that is neither multiple nor sensitive'
    });return
  }if(e.default===void 0){
    if(e.required!==!0)n.addIssue({
      code:"custom",path:["default"],message:"a field with options needs a default among them, or required: true"
    });return
  }if(typeof e.default!=="string"||!e.options.includes(e.default))n.addIssue({
    code:"custom",path:["default"],message:`default must be one of the options: ${e.options.join(", ")}`
  })
})),sp=f(()=>u({
  userConfig:fe(o().regex(/^[A-Za-z_]\w*$/,"Option keys must be valid identifiers (letters, digits, underscore; no leading digit) \u2014 they become CLAUDE_PLUGIN_OPTION_<KEY> env vars in hooks"),di()).optional().describe("User-configurable values this plugin needs. Prompted at enable time. Non-sensitive values saved to settings.json; sensitive values to secure storage. Available as ${user_config.KEY} in MCP/LSP server config, hook commands, and (non-sensitive only) skill/agent content. Keep sensitive value counts small.")
})),rp=f(()=>u({
  channels:A(u({
    server:o().min(1).describe("Name of the MCP server this channel binds to. Must match a key in this plugin's mcpServers."),displayName:o().optional().describe('Human-readable name shown in the config dialog title (e.g., "Telegram"). Defaults to the server name.'),userConfig:fe(o(),di()).optional().describe("Fields to prompt the user for when enabling this plugin in assistant mode. Saved values are substituted into ${user_config.KEY} references in the mcpServers env.")
  }).strict()).describe("Channels this plugin provides. Each entry declares an MCP server as a message channel and optionally specifies user configuration to prompt for at enable time.")
})),CUt=f(()=>Ze({
  command:o().min(1).refine((e)=>{
    if(e.includes(" ")&&!e.startsWith("/"))return!1;return!0
  },{
    message:"Command should not contain spaces. Use args array for arguments."
  }).describe('Command to execute the LSP server (e.g., "typescript-language-server")'),args:A(Xr()).optional().describe("Command-line arguments to pass to the server"),extensionToLanguage:fe(np(),Xr()).refine((e)=>Object.keys(e).length>0,{
    message:"extensionToLanguage must have at least one mapping"
  }).describe("Mapping from file extension to LSP language ID. File extensions and languages are derived from this mapping."),transport:G(["stdio","socket"]).default("stdio").describe("Communication transport mechanism"),env:fe(o(),o()).optional().describe("Environment variables to set when starting the server"),initializationOptions:ae().optional().describe("Initialization options passed to the server during initialization"),settings:ae().optional().describe("Settings passed to the server via workspace/didChangeConfiguration"),workspaceFolder:o().optional().describe("Workspace folder path to use for the server"),startupTimeout:k().int().positive().optional().describe("Maximum time to wait for server startup (milliseconds)"),shutdownTimeout:k().int().positive().optional().describe("Maximum time to wait for graceful shutdown (milliseconds)"),restartOnCrash:H().optional().describe("Whether to restart the server if it crashes"),maxRestarts:k().int().nonnegative().optional().describe("Maximum number of restart attempts before giving up"),diagnostics:H().optional().describe("Whether to push publishDiagnostics into the agent context after edits. Set to false to keep LSP navigation (goToDefinition, hover, etc.) but suppress automatic diagnostic injection. Defaults to true.")
})),ip=f(()=>Ze({
  name:o().min(1).describe("Identifier for this monitor, unique within the plugin. Used to dedupe so re-arming (plugin reload, repeat skill invoke) does not spawn duplicates."),command:o().min(1).describe('Shell command to run as a persistent background monitor. Each stdout line is delivered to the model as a <task_notification> event; the process runs for the session lifetime. ${CLAUDE_PLUGIN_ROOT}, ${CLAUDE_PLUGIN_DATA}, ${CLAUDE_PROJECT_DIR}, ${user_config.*}, and ${ENV_VAR} are substituted. Runs in the session cwd (the named --project-config-root when a host set one) \u2014 prefix with `cd "${CLAUDE_PLUGIN_ROOT}" && ` if the script needs its own directory.'),description:o().min(1).describe("Short human-readable description of what is being monitored (shown in task panel and notification summary)."),when:Fe([R("always"),o().startsWith("on-skill-invoke:").refine((e)=>e.length>16,{
    message:"on-skill-invoke: must specify a skill name"
  })]).default("always").describe('Arm trigger. "always" arms at session start and on plugin reload. "on-skill-invoke:<skill>" arms the first time that skill is dispatched (via Skill tool or slash command).')
})),y1r=f(()=>A(ip()).refine((e)=>new Set(e.map((n)=>n.name)).size===e.length,{
  message:"Monitor names must be unique within a plugin"
})),ci=f(()=>u({
  monitors:Fe([at().describe("Path to a JSON file containing the monitors array, relative to the plugin root"),y1r()]).describe("Background watch scripts the host arms as persistent Monitor tasks (unsandboxed, same trust tier as hooks) so plugins need not instruct the model to arm them. When omitted, monitors/monitors.json at the plugin root is loaded if present.")
})),ap=f(()=>u({
  lspServers:Fe([at().describe("Path to .lsp.json configuration file relative to plugin root"),fe(o(),CUt()).describe("LSP server configurations keyed by server name"),A(Fe([at().describe("Path to LSP configuration file"),fe(o(),CUt()).describe("Inline LSP server configurations")])).describe("Array of LSP server configurations (paths or inline definitions)")])
})),lp=/^@[a-z0-9][a-z0-9-._]*\/[a-z0-9][a-z0-9-._]*$/,dp=/^[a-z0-9][a-z0-9-._]*$/,cp=/^@[a-z0-9][a-z0-9-._]*\/\*$/;
function i8e(e){
  return!e.includes("..")&&!e.includes("//")&&(lp.test(e)||dp.test(e))
}var ui=f(()=>o().refine((e)=>!e.includes("..")&&!e.includes("//"),"Package name cannot contain path traversal patterns").refine((e)=>i8e(e),"Invalid npm package name format")),a8e=/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9_-])?$/,_1r=/^[0-9a-f]{64}$/,Jpt=16,h5n=64,Tne=1048576,up=f(()=>u({
  sha256:o().regex(_1r)
}));
function Qpt(e){
  let n=fe(o(),ae()).safeParse(e);
  if(!n.success)return;
  let s=Object.create(null),r=0;
  for(let[i,d]of Object.entries(n.data)){
    if(r>=h5n)break;
    let c=up().safeParse(d);
    if(a8e.test(i)&&c.success)s[i]=c.data,r++
  }return r>0?s:void 0
}var pp=f(()=>u({
  binaries:ae().transform(Qpt).describe("sha256-pinned files to fetch into bin/ at install time, keyed by basename (target triple encoded in the name)")
})),gp=f(()=>u({
  settings:fe(o(),ae()).optional().describe("Settings to merge into the user settings while this plugin is enabled. Only the documented allowlisted keys are applied.")
})),mp=f(()=>u({
  types:Ae().refine((e)=>e.endsWith(".d.ts"),{
    message:"types must name a TypeScript declaration file ending in '.d.ts'"
  }).refine((e)=>!e.split(/[\\/]/).includes(".."),{
    message:"types must stay inside the plugin directory (no '..' segment)"
  }).optional().describe("Path to the plugin's type contract, relative to the plugin root and starting with ./: a self-contained .d.ts (no import, export-from, require or reference) that exports the types of the noun the plugin's hooks module adds in engine.create at its top level and declares the noun in a `declare module 'claude-code' { interface EngineInterface { ... } }` block, nothing else. /plugin-types copies each enabled plugin's contract to .claude/types/claude-code-plugins/<plugin>.d.ts and indexes them in claude-code-plugins.d.ts for dependents to type against; claude plugin validate checks the file.")
})),fp=f(()=>u({
  experimental:Bi((e)=>z(e)?e:void 0,u({
    ...li().partial().shape,...ep().partial().shape,...ci().partial().shape,...ai().partial().shape,evals:g5n().optional().describe("Directory of eval cases for the plugin evaluation harness, relative to the plugin root (default: evals/). A list is accepted; its first entry is the case directory.")
  }).passthrough().optional().describe("Components whose manifest shape may change without a deprecation cycle. Move a key out of here once it is promoted to stable."))
}));
var nUe=f(()=>u({
  ...Bu().shape,...Gu().partial().shape,...Yu().partial().shape,...Xu().partial().shape,...Ju().partial().shape,...ai().partial().shape,...li().partial().shape,...tp().shape,...rp().partial().shape,...op().partial().shape,...ap().partial().shape,...ci().partial().shape,...gp().partial().shape,...mp().partial().shape,...sp().partial().shape,...pp().partial().shape,...fp().partial().shape
})),pi=new Set(["url","github","git","npm","file","directory","skills-dir","hostPattern","pathPattern","settings"]);
function Bmn(e){
  try{
    return new RegExp(e),!0
  }catch{
    return!1
  }
}function RUt(e){
  return ZUe(e)
}var y5n="ssh.github.com";
function ko(e){
  return Co(e)||RF(e)===y5n
}function _5n(e){
  let n,s;
  if(e.includes("://")){
    if(RUt(e))return null;
    try{
      let d=new URL(e);
      n=d.hostname,s=d.pathname.replace(/^\/+/,"")
    }catch{
      return null
    }
  }else{
    let d=e.match(/^[^@]+@([^:]+):(.+)$/);
    if(!d)return null;
    n=d[1],s=d[2]?.replace(/^\/+/,"")
  }if(!n||!s||!ko(n))return null;
  let r=S1r(s),i=r.split("/");
  if(i.length!==2||!i[0]||!i[1])return null;
  return r
}var b1r=/^[A-Za-z0-9._-]+$/;
function jmn(e){
  return b1r.test(e)&&!e.startsWith("-")&&e!=="."&&e!==".."
}function Wmn(e){
  if(!e.endsWith("/*"))return null;
  let n=e.slice(0,-2);
  return jmn(n)?n:null
}function S1r(e){
  let n=e;
  try{
    n=decodeURIComponent(e)
  }catch{
  }let s=gi(n);
  return mi(s)
}function gi(e){
  let n=[];
  for(let s of e.split("/")){
    if(s===".")continue;
    if(s===".."){
      n.pop();
      continue
    }n.push(s)
  }return n.filter((s)=>s!=="").join("/")
}function mi(e){
  let n=e.length;
  for(;;){
    let s=n;
    while(s>0&&e.charCodeAt(s-1)===47)s--;
    if(s>=4&&e.startsWith(".git",s-4))s-=4;
    if(s===n)return n===e.length?e:e.slice(0,n);
    n=s
  }
}function rUe(e){
  let n=RF(e);
  return Co(n)?$o:n
}function Jr(e){
  let n=rUe(e);
  return n===y5n?$o:n
}function xUt(e,n){
  if(e.includes("://"))try{
    let r=new URL(e);
    r.hostname=Jr(r.hostname),r.username="",r.password="",r.search="",r.hash="";
    try{
      r.pathname=decodeURIComponent(r.pathname)
    }catch{
    }let i=gi(r.pathname);
    return r.pathname=n?.stripDotGit?mi(i):i,r.toString()
  }catch{
    return e
  }let s=e.match(/^[^@]+@([^:]+)(:.*)$/s);
  return s?`${Jr(s[1]??"")}${s[2]}`:e
}var hp=new Set(["http:","https:","git:","git+http:","git+https:"]);
function b5n(e){
  if(w_e(e))return e;
  if(e.includes("://"))try{
    let r=new URL(e);
    if(r.hostname=rUe(r.hostname),hp.has(r.protocol)||Co(r.hostname))r.username="",r.password="";
    return r.toString()
  }catch{
    return e
  }let n=Fgn(e);
  if(!n)return e;
  let s=n.host.toLowerCase().replace(/\.+$/,"");
  return Co(s)?`${$o}:${n.path}`:`${n.user}@${s}:${n.path}`
}function fi(e){
  if(e.includes("://")){
    if(RUt(e))return!1;
    let d;
    try{
      d=new URL(e).hostname
    }catch{
      return!1
    }if(!ko(d))return!1;
    if(xUt(e,{
      stripDotGit:!0
    }).includes("*"))return!0;
    let c=b5n(e);
    try{
      let p=new URL(c);
      return p.hostname.includes("*")||p.pathname.includes("*")
    }catch{
      return c.includes("*")
    }
  }let n=e.match(/^(?:[^@]+@)?([^@:/]+):(.*)$/s),s=n?.[1],r=n?.[2];
  if(!s||r===void 0||!ko(s))return!1;
  let i=r;
  try{
    i=decodeURIComponent(r)
  }catch{
  }return i.includes("*")
}function hi(e){
  return Jo("source",[u({
    source:R("url"),url:o().url().describe("Direct URL to marketplace.json file"),headers:fe(o(),o()).optional().describe("Custom HTTP headers (e.g., for authentication)"),headersHelper:wo().optional().describe("Command that prints a JSON object of HTTP headers (e.g. a short-lived auth token). Its output overrides `headers` and, like `headers`, is inherited by same-origin archive downloads from this marketplace. Runs from a fixed directory (the Claude config home, never the session's), so give a bare command found via PATH or an absolute path; it is re-run on later refreshes of this marketplace.")
  }),u({
    source:R("github"),repo:o().describe('GitHub repository in owner/repo format. ONLY in the managed-settings policy lists (strictKnownMarketplaces / blockedMarketplaces) the owner-wildcard form "owner/*" matches every repository under exactly that owner. Everywhere else (marketplace add, extraKnownMarketplaces, known_marketplaces.json) the value '+"must name a single repository \u2014 a wildcard is taken literally and fails to clone."),ref:o().optional().describe('Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.'),path:o().optional().describe("Path to marketplace.json within repo (defaults to .claude-plugin/marketplace.json)"),sparsePaths:A(o()).optional().describe('Directories to include via git sparse-checkout (cone mode). Use for monorepos where the marketplace lives in a subdirectory. Example: [".claude-plugin", "plugins"]. If omitted, the full repository is cloned.'),skipLfs:H().optional().describe("Has no effect; accepted so existing settings keep working. Claude Code's own git never downloads Git LFS content: LFS-tracked files in the marketplace repository are checked out as pointer files whether or not this is set, and adding or updating the marketplace says how many were. To fetch their content, run `git lfs pull` in the marketplace's checkout under ~/.claude/plugins/marketplaces/.")
  }),u({
    source:R("git"),url:o().describe("Full git repository URL"),ref:o().optional().describe('Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.'),path:o().optional().describe("Path to marketplace.json within repo (defaults to .claude-plugin/marketplace.json)"),sparsePaths:A(o()).optional().describe('Directories to include via git sparse-checkout (cone mode). Use for monorepos where the marketplace lives in a subdirectory. Example: [".claude-plugin", "plugins"]. If omitted, the full repository is cloned.'),skipLfs:H().optional().describe("Has no effect; accepted so existing settings keep working. Claude Code's own git never downloads Git LFS content: LFS-tracked files in the marketplace repository are checked out as pointer files whether or not this is set, and adding or updating the marketplace says how many were. To fetch their content, run `git lfs pull` in the marketplace's checkout under ~/.claude/plugins/marketplaces/.")
  }),u({
    source:R("npm"),package:ui().or(o().regex(cp,"Invalid npm package name format")).describe('npm package containing marketplace.json (e.g. "@acme/claude-marketplace"). In strictKnownMarketplaces / blockedMarketplaces an entry also governs plugins installed straight from the npm marketplace (`<package>@npm`): an exact package name matches that package, and "@acme/*" matches every package under the scope.'),version:o().optional().describe('Version or range to fetch (e.g. "1.4.0", "^1.4"); defaults to the latest dist-tag'),registry:o().url().refine($mn,"Registry must be an http(s) URL").optional().describe(`Registry URL. When adding a marketplace: a one-off registry override (otherwise your npm configuration decides). In a policy entry: the origin and path prefix the package's RESOLVED tarball URL must fall under (e.g. "https://npm.example.com/api/npm/internal/").`)
  }),u({
    source:R("file"),path:o().describe("Local file path to marketplace.json")
  }),u({
    source:R("directory"),path:o().describe("Local directory containing .claude-plugin/marketplace.json")
  }),u({
    source:R("skills-dir")
  }).describe("Policy-list sentinel for the ~/.claude/skills/ auto-load (@skills-dir plugins). In strictKnownMarketplaces: opt the scan back IN (by default any allowlist blocks it). In blockedMarketplaces: turn the scan OFF without otherwise restricting marketplaces. Only meaningful in those two managed-settings lists (areLocalPluginDirsAllowedByPolicy); known_marketplaces.json / marketplace add etc. ignore it."),u({
    source:R("hostPattern"),hostPattern:o().describe('Regex pattern to match the host/domain extracted from any marketplace source type. For github sources, matches against github.com. For git sources (SSH or HTTPS), extracts the hostname from the URL. Use in strictKnownMarketplaces to allow all marketplaces from a specific host (e.g., "^github\\.mycompany\\.com$").')
  }),u({
    source:R("pathPattern"),pathPattern:o().describe('Regex pattern matched against the .path field of file and directory sources. Use in strictKnownMarketplaces to allow filesystem-based marketplaces alongside hostPattern restrictions for network sources. Use ".*" to allow all filesystem paths, or a narrower pattern (e.g., "^/opt/approved/") to restrict to specific directories.')
  }),u({
    source:R("settings"),name:e?Fu().describe("Marketplace name, as stored in known_marketplaces.json. A reserved name is refused per entry at load (revalidateReservedNameEntry); a look-alike name is refused when that marketplace's own catalog is parsed."):m5n().refine((n)=>!kne.has(n.toLowerCase()),{
      message:"Reserved marketplace names cannot be used with settings sources. validateOfficialNameSource only accepts github/git sources from anthropics/* for these names; a settings source would be rejected after loadAndCacheMarketplace has already written to disk with cleanupNeeded=false."
    }).describe("Marketplace name. Must match the extraKnownMarketplaces key (enforced); the synthetic manifest is written under this name. Same validation "+"as PluginMarketplaceSchema plus reserved-name rejection \u2014 "+"validateOfficialNameSource runs after the disk write, too late to clean up."),plugins:A(Sp()).describe("Plugin entries declared inline in settings.json"),owner:Po().optional()
  }).describe("Inline marketplace manifest defined directly in settings.json. The reconciler writes a synthetic marketplace.json to the cache; diffMarketplaces detects edits via isEqual on the stored source (the plugins array is inside this object, so edits surface as sourceChanged).")])
}var gt=f(()=>hi(!1)),yp=f(()=>hi(!0)),Dt=f(()=>gt()),Gmn=f(()=>o().length(40).regex(/^[a-f0-9]{40}$/,"Must be a full 40-character lowercase git commit SHA")),yi=f(()=>o().regex(/^[0-9a-fA-F]{64}$/,"Must be a 64-character hex SHA-256 digest")),S5n="Archive URLs must use https:// and must not point at a loopback, link-local, or cloud-metadata host";
function w5n(e){
  try{
    let n=new URL(e);
    return n.protocol==="https:"&&!m6(n.hostname)
  }catch{
    return!1
  }
}var _p=f(()=>u({
  source:R("archive"),url:o().url().refine(w5n,{
    message:S5n
  }).describe("HTTPS URL of a zip archive containing the plugin. The plugin root (the directory holding .claude-plugin/) may be at the top of the archive "+"or nested one directory deep \u2014 a single wrapping directory is stripped."),sha256:yi().optional().describe("SHA-256 digest of the archive. When set, every download is verified against it and the install is refused on mismatch. It also serves as the version identity when neither plugin.json nor the marketplace entry declares a `version`. Recommended. Note the update signal is the version string (plugin.json "+"version, else the entry version, else this digest) \u2014 changing only the digest "+"while a version is declared does not trigger an update.")
}).describe("Plugin distributed as a zip archive fetched over HTTPS \u2014 for hosting on any "+"static file server or artifact repository (S3, GitLab, nginx) with no git or npm on the client. Authentication: the entry's own `headers` / `headersHelper` (bound to this URL), overlaid on the enclosing url-source marketplace's headers (static or `headersHelper`-minted) when the archive shares its origin.")),_i=f(()=>Fe([Bi((e)=>e==="."?"./":e,Ae()).describe("Path to the plugin root, relative to the marketplace root (the directory containing .claude-plugin/, not .claude-plugin/ itself)"),u({
  source:R("npm"),package:ui().or(o().refine((e)=>/^(?:file|https?|git(?:\+https?|\+ssh)?|ssh|github|gitlab|bitbucket):/i.test(e)||!e.includes(".."),'Package reference cannot contain ".." path segments')).describe("Package name (or url, or local path, or anything else that can be passed to `npm` as a package)"),version:o().optional().describe("Specific version or version range (e.g., ^1.0.0, ~2.1.0)"),registry:o().url().refine($mn,"Registry must be an http(s) URL").optional().describe("Custom NPM registry URL (defaults to using system default, likely npmjs.org)")
}).describe("NPM package as plugin source"),u({
  source:R("url"),url:o().describe("Full git repository URL (https:// or git@)"),ref:o().optional().describe('Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.'),sha:Gmn().optional().describe("Specific commit SHA to use")
}),u({
  source:R("github"),repo:o().describe("GitHub repository in owner/repo format"),ref:o().optional().describe('Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.'),sha:Gmn().optional().describe("Specific commit SHA to use")
}),u({
  source:R("git-subdir"),url:o().describe("Git repository: GitHub owner/repo shorthand, https://, or git@ URL"),path:o().min(1).describe('Subdirectory within the repo containing the plugin (e.g., "tools/claude-plugin"). Cloned sparsely using partial clone (--filter=tree:0) to minimize bandwidth for monorepos.'),ref:o().optional().describe('Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.'),sha:Gmn().optional().describe("Specific commit SHA to use")
}).describe("Plugin located in a subdirectory of a larger repository (monorepo). Only the specified subdirectory is materialized; the rest of the repo is not downloaded."),_p(),u({
  source:R("command"),command:o().min(1).max(o8e,{
    message:"command must not be longer than the install consent UI can display"
  }).refine((e)=>!oi.test(e),{
    message:"command must be printable ASCII (letters, digits, punctuation, single spaces) with no runs of 4 or more spaces"
  }).describe("Shell command that prints the absolute path of the plugin directory on stdout (exactly one line) and exits 0. It must leave a complete plugin in that directory before exiting; the directory is copied into the plugin cache, so the printed path may change between runs (it is re-resolved on every install and update, and once per session in the background). Runs through the platform shell (sh on macOS/Linux, cmd.exe on Windows) from the user's home directory with Claude Code's subprocess environment."),timeout:k().int().positive().max(600).optional().describe("Seconds to wait for the command before giving up (default: 60)"),mode:G(["copy","link"]).optional().describe("copy (default): the printed directory is copied into the plugin cache and content-hashed, so it may be deleted afterwards. link: the cache entry links to the printed directory "+"in place (no copy, no size limit; macOS/Linux) \u2014 for large exports; the directory must then stay "+"valid while Claude Code runs, and a different printed path is what signals new content.")
}).describe("Plugin directory produced by a locally installed tool (e.g. an IDE that renders its plugin for the currently selected SDK). Claude Code runs the command, copies the directory it prints, and re-runs it in the background at startup to pick up changes."),u({
  source:R("unsupported"),error:o().optional()
}).describe("Placeholder for source types this Claude Code version does not recognize, or a known type whose fields failed validation (then `error` "+"holds the reason). Never authored by hand \u2014 PluginMarketplaceSchema rewrites "+"unparseable sources to this so the entry remains in marketplace.plugins (detectDelistedPlugins must not see it as removed). Install attempts fail at cachePlugin with an actionable message.")])),Sp=f(()=>u({
  name:ln().describe("Plugin name as it appears in the target repository"),source:_i().describe("Where to fetch the plugin from. Must be a remote source \u2014 relative "+"paths have no marketplace repository to resolve against."),description:o().optional(),version:o().optional(),strict:H().optional(),headers:fe(o(),o()).optional().describe("HTTP headers sent when downloading this entry's `archive` source."),headersHelper:wo().optional().describe("Command that prints a JSON object of HTTP headers for downloading this entry's `archive` source. Runs only when a user explicitly installs or updates this plugin. Unlike a catalog entry, an entry written here does not need `strict: false`: it is declared in a settings file, which has no manifest fields to inline. A declaration in project settings is not operator-authored, so request-routing and client-identity header names are still filtered there. Use an absolute path.")
}).refine((e)=>typeof e.source!=="string",{
  message:'Plugins in a settings-sourced marketplace must use remote sources (github, git-subdir, npm, url, archive, command). Relative-path sources like "./foo" have no marketplace repository to resolve against.'
}).refine((e)=>typeof e.source==="string"||e.source.source!=="unsupported",{
  message:"source.source: 'unsupported' is a parse-time placeholder and cannot be authored. Use a remote source (github, git-subdir, npm, url, archive, command)."
}));
function l8e(e){
  return typeof e==="string"&&e.startsWith("./")
}function Lm(e){
  return e.source==="file"||e.source==="directory"
}var v5n=f(()=>u({
  cli:A(o().max(64)).max(10).optional().describe('First command tokens (e.g. ["stripe"]) \u2014 exact match against commands run this session.'),hosts:A(o().max(128)).max(20).optional().describe('Hostnames (e.g. ["api.stripe.com"]) \u2014 exact, case-insensitive match against '+"hostnames seen in https?:// URLs in bash commands run this session. Bare hostname only: lowercase, no scheme, no port, no path."),filesRead:A(o().max(256)).max(10).optional().describe('Glob patterns (e.g. ["**/*.tf"]) \u2014 the plugin is relevant when a file Claude has read '+"this session matches any pattern. Matched against read-file paths, forward-slash normalized, case-insensitive."),manifestDeps:A(u({
    file:o().max(256),pattern:o().max(256)
  })).max(10).optional().describe("Dependency declared in a package manifest. Each {file, pattern} is a pair of RegExp sources: "+"`file` matches the manifest filename (package.json, go.mod, requirements.txt, \u2026); "+"`pattern` matches the dependency declaration inside that file. Evaluated against files read this session."),cwd:A(o().max(256)).max(10).optional().describe('Glob patterns (e.g. ["Engine/Source/Runtime/Renderer/**"]) \u2014 the plugin is relevant when the '+`session's working directory is at or under a directory matching the pattern. Matched against the cwd both relative to the enclosing git repo root and as an absolute path, forward-slash normalized, case-insensitive. A bare directory (no glob characters) means "cwd is at or under this directory". Known at session start, so this signal can surface a suggestion before the first turn.`)
})),E5n=f(()=>u({
  topic:o().max(64).optional().describe('What the user is working with when this plugin is relevant \u2014 fills "Working with {topic}?". '+'Often the product name (e.g. "Stripe"); use a domain (e.g. "design") when the plugin name does not read naturally as a topic. Defaults to the plugin name with each hyphen-segment capitalized.'),signals:v5n().optional().describe("Matchers that determine when the plugin is relevant.")
})),zmn=f(()=>nUe().partial().extend({
  name:ln().describe("Unique identifier matching the plugin name"),source:_i().describe("Where to fetch the plugin from"),headers:fe(o(),o()).optional().describe("Custom HTTP headers for fetching this plugin's archive; overrides the marketplace's"),headersHelper:wo().optional().describe("Command that prints a JSON object of HTTP headers for fetching this plugin's archive (e.g. a short-lived auth token); overrides this entry's `headers` and the marketplace's. Runs only when the user installs or updates this plugin, never during catalog browse. An entry that sets it must be `strict: false` with its manifest inlined here, so consent is informed from the entry alone before the command runs."),category:o().optional().describe('Category for organizing plugins (e.g., "productivity", "development")'),tags:A(o()).optional().describe("Tags for searchability and discovery"),strict:H().optional().default(!0).describe("Require the plugin manifest to be present in the plugin folder. If false, the marketplace entry provides the manifest."),relevance:Bi((e)=>z(e)?e:void 0,E5n().optional()).describe(`Declares when this plugin is relevant to the user's work. Consumed by the spinner tip ("Working with {topic}?"), session-start auto-suggest, and marketplace browse ranking.`)
})),bp=f(()=>u({
  name:ln()
}));
function Ep(e){
  let n=zmn();
  return e.flatMap((s,r)=>{
    let i=n.safeParse(s);if(i.success){
      let p=i.data.source;if(typeof p==="object"&&p.source==="unsupported"&&p.error!==void 0)return[{
        ...i.data,source:{
          source:"unsupported"
        }
      }];return[i.data]
    }let d=bp().safeParse(s).data?.name,c=i.error.issues.map((p)=>`${p.path.join(".")}: ${p.message}`).join(", ");if(d){
      t(`Stubbing unparseable marketplace plugin entry (${d}): ${c}`,{
        level:"warn"
      });let p=k5n(z(s)?s.source:void 0)?Cp:To(s)?void 0:Ap(i.error.issues)??dn(i.error.issues);return[{
        name:d,source:{
          source:"unsupported",...p&&{
            error:p
          }
        },strict:!0
      }]
    }return t(`Dropping unparseable marketplace plugin entry (index ${r}): ${c}`,{
      level:"warn"
    }),[]
  })
}var kp=new Set(["npm","url","github","git-subdir","archive","command","unsupported"]);
function To(e){
  if(!e||typeof e!=="object")return!1;
  let n=e.source;
  if(!n||typeof n!=="object")return!1;
  let s=n.source;
  return typeof s==="string"&&!kp.has(s)
}function Ap(e){
  let n=e.find((r)=>r.path.length===1&&r.path[0]==="source");
  if(!n||n.code!=="invalid_union")return;
  let s=n.errors.find((r)=>!r.some((i)=>i.path.length===0||i.code==="invalid_value"&&i.path[0]==="source"));
  if(!s||s.length===0)return;
  return dn(s.map((r)=>({
    ...r,path:["source",...r.path]
  })))
}var Op=/^[A-Za-z0-9_$.-]{1,40}$/;
function je(e){
  return Op.test(e)?e:"<key>"
}var wp=3,Rp=160;
function dn(e){
  let n=e.slice(0,wp).map((r)=>{
    let i=r.path.map(String).map((c)=>je(c)).join("."),d=r.code==="unrecognized_keys"?`Unrecognized ${r.keys.length===1?"field":"fields"}: ${r.keys.map(je).join(", ")}`:an(r.message,Rp);return i?`${i}: ${d}`:d
  }),s=e.length-n.length;
  return s>0?`${n.join(", ")} (+${s} more)`:n.join(", ")
}var vp=/^[A-Za-z0-9][-A-Za-z0-9._]*$/,Cp='Bare source names resolve under metadata.pluginRoot, which this marketplace does not set (or sets to a path outside the marketplace root). Use a "./relative/path" source, or set metadata.pluginRoot to allow bare names.';
function k5n(e){
  return typeof e==="string"&&vp.test(e)&&!e.includes("..")
}function w1r(e){
  if(typeof e!=="string"||e===""||e.startsWith("/")||e.includes("\\")||e.includes(":"))return;
  let n=e.replace(/^\.\//,"").replace(/\/+$/,"");
  if(n===""||n===".")return".";
  if(n.split("/").some((s)=>s===""||s==="."||s===".."))return;
  return n
}function v1r(e,n){
  if(n===void 0||!z(e)||!k5n(e.source))return e;
  let s=n==="."?`./${e.source}`:`./${n}/${e.source}`;
  return{
    ...e,source:s
  }
}function E1r(e){
  if(!z(e)||!Array.isArray(e.plugins))return e;
  let n=z(e.metadata)?w1r(e.metadata.pluginRoot):void 0;
  if(n===void 0)return e;
  return{
    ...e,plugins:e.plugins.map((s)=>v1r(s,n))
  }
}var c8e=f(()=>u({
  $schema:o().optional().describe("JSON Schema reference for editor autocomplete/validation; ignored at load time"),name:m5n().superRefine($u),version:o().optional().describe("Marketplace manifest version"),description:o().optional().describe("Human-readable description of this marketplace"),owner:Po().describe("Marketplace maintainer or curator information"),plugins:A(ae()).transform(Ep).describe("Collection of available plugins in this marketplace"),forceRemoveDeletedPlugins:H().optional().describe("When true, plugins removed from this marketplace will be automatically uninstalled and flagged for users"),metadata:u({
    pluginRoot:o().optional().describe('Base directory for bare plugin source names, relative to the marketplace root (e.g. "./plugins" resolves "source": "formatter" as ./plugins/formatter). Sources that already start with "./" are unaffected.'),version:o().optional().describe("Marketplace version"),description:o().optional().describe("Marketplace description")
  }).optional().describe("Optional marketplace metadata"),allowCrossMarketplaceDependenciesOn:A(o()).optional().describe("Marketplace names whose plugins may be auto-installed as dependencies. Only the root marketplace's allowlist applies \u2014 no transitive trust."),renames:fe(o(),o().nullable()).optional().catch(void 0).describe("Append-only map of old plugin name \u2192 current name (or null when removed). The loader follows this on plugin-not-found and migrates user settings to the new name.")
})),pz=f(()=>Bi(E1r,c8e())),Ao="[A-Za-z0-9][-A-Za-z0-9._]*",Pp=new RegExp(`^${Ao}$`);
function xRe(e){
  return Pp.test(e)
}var Tp=new RegExp(`^${Ao}@${Ao}$`),qr=`@${GS}`;
function Ane(e){
  return e.endsWith(qr)&&i8e(e.slice(0,-qr.length))
}var VC=f(()=>o().refine((e)=>Tp.test(e)||Ane(e),"Plugin ID must be in format: plugin@marketplace")),Zpt=new RegExp(`[@:\\s/\\\\${cde}]`,"u"),c$o=new RegExp(`[${cde}]`,"u"),IUt=/[\p{Cc}\u200E\u200F\u202A-\u202E\u2066-\u2069]/u,xp=/^[A-Za-z0-9][-A-Za-z0-9._]*(@[A-Za-z0-9][-A-Za-z0-9._]*)?(@\^[^@]*)?$/,Dp=f(()=>Fe([o().regex(xp,"Dependency must be a plugin name, optionally qualified with @marketplace").transform((e)=>e.replace(/@\^[^@]*$/,"")),u({
  name:o().min(1).regex(/^[A-Za-z0-9][-A-Za-z0-9._]*$/),marketplace:o().min(1).regex(/^[A-Za-z0-9][-A-Za-z0-9._]*$/).optional()
}).loose().transform((e)=>e.marketplace?`${e.name}@${e.marketplace}`:e.name)])),Mp=f(()=>u({
  version:o().describe("Currently installed version"),installedAt:o().describe("ISO 8601 timestamp of installation"),lastUpdated:o().optional().describe("ISO 8601 timestamp of last update"),installPath:o().describe("Absolute path to the installed plugin directory"),gitCommitSha:o().optional().describe("Git commit SHA for git-based plugins (for version tracking)"),resolvedVersion:o().optional().describe("Tag-derived semver this install resolved to (when fetched via a version constraint). Used by verifyAndDemote in preference to manifest.version, since the upstream may have forgotten to bump plugin.json."),auto:H().optional().describe("True when this plugin was pulled in as a dependency rather than installed explicitly. Auto-installed plugins are eligible for removal by the orphan sweep when nothing depends on them. Absent = manual (preserves pre-flag installs)."),...Zr(),...ei(),...ni(),...ti()
})),PUt=f(()=>u({
  version:R(1).describe("Schema version 1"),plugins:fe(VC(),Mp()).describe("Map of plugin IDs to their installation metadata")
})),Ip=f(()=>G(["managed","user","project","local"])),Si=f(()=>u({
  scope:Ip().describe("Installation scope"),projectPath:o().optional().describe("Project path (required for project/local scopes)"),installPath:o().describe("Absolute path to the versioned plugin directory"),version:o().optional().describe("Currently installed version"),installedAt:o().optional().describe("ISO 8601 timestamp of installation"),lastUpdated:o().optional().describe("ISO 8601 timestamp of last update"),gitCommitSha:o().optional().describe("Git commit SHA for git-based plugins"),resolvedVersion:o().optional().describe("Tag-derived semver this install resolved to"),auto:H().optional().describe("True when pulled in as a dependency. Eligible for orphan sweep."),...Zr(),...ei(),...ni(),...ti()
})),lb=f(()=>u({
  version:R(2).describe("Schema version 2"),plugins:fe(VC(),A(Si())).describe("Map of plugin IDs to arrays of installation entries")
})),Lp=f(()=>u({
  version:R(2),plugins:fe(o(),ae())
}));
function T5n(e){
  Lp().parse(e);
  let n={
  },s=Object.create(null),r=Object.create(null),i,d,c=e.plugins;
  for(let[p,g]of Object.entries(c)){
    let h=VC().safeParse(p);
    if(!h.success){
      s[p]=g,i??=h.error;
      continue
    }let m=A(Si()).safeParse(g);
    if(m.success)n[p]=m.data;
    else r[p]=g,i??=m.error,d??=m.error
  }return{
    file:{
      version:2,plugins:n
    },setAside:s,keptRaw:r,firstError:i,firstUnparseableError:d
  }
}var Np=f(()=>u({
  source:yp().describe("Where to fetch the marketplace from"),installLocation:o().describe("Local cache path where marketplace manifest is stored"),lastUpdated:o().describe("ISO 8601 timestamp of last marketplace refresh"),autoUpdate:H().optional().describe("Whether to automatically update this marketplace and its installed plugins on startup")
})),d8e=f(()=>fe(o(),Np())),kJ="claudeai-",Vmn=["org","default","account"];
function qC(e=H()){
  return Bi(Bx,e)
}function Bx(e){
  return e==="true"?!0:e==="false"?!1:e
}var IRe=["aspell","hunspell","ispell"],d$o=`!
`,Up=/^[A-Za-z][A-Za-z0-9_.,-]{0,63}$/;
function qmn(e){
  return Up.test(e)
}function u$o(e,n){
  let s=n!==void 0&&qmn(n)?n:void 0;
  switch(e){
    case"aspell":return["-a","--encoding=utf-8","--sug-mode=ultra",...s?[`--lang=${s}`]:[]];
    case"hunspell":return["-a","-i","utf-8",...s?["-d",s]:[]];
    case"ispell":return["-a",...s?["-d",s]:[]]
  }
}function p$o(e){
  if(!e.startsWith("@(#) International Ispell"))return null;
  if(/but really Aspell/i.test(e))return"aspell";
  if(/but really Hunspell/i.test(e))return"hunspell";
  return"ispell"
}function f$o(e){
  return`^${e.join(" ")}
`
}function m$o(e){
  if(e==="")return{
    type:"end"
  };
  switch(e[0]){
    case"*":case"+":case"-":return{
      type:"correct"
    };
    case"&":case"?":{
      let n=/^[&?] (\S+) \d+ \d+:/.exec(e);
      return n?{
        type:"misspelled",word:n[1]
      }:{
        type:"unrecognized"
      }
    }case"#":{
      let n=/^# (\S+) \d+/.exec(e);
      return n?{
        type:"misspelled",word:n[1]
      }:{
        type:"unrecognized"
      }
    }default:return{
      type:"unrecognized"
    }
  }
}var Fg=2147483647;
var zp=["autoMode","deepLink","voice","briefView","screenReader"];
var cn={
  autoMode:{
    buildGate:()=>!0,shape:()=>({
      skipAutoPermissionPrompt:H().optional().describe("Whether the user has accepted the auto mode opt-in dialog"),useAutoModeDuringPlan:H().optional().describe("Whether plan mode uses auto mode semantics when auto mode is available (default: true)"),autoMode:u({
        allow:A(o()).optional().describe('Rules for the auto mode classifier allow section. Include the literal string "$defaults" to inherit the built-in rules at that position.'),soft_deny:A(o()).optional().describe('Rules for the auto mode classifier SOFT BLOCK section \u2014 destructive/irreversible actions that user intent can clear. Include the literal string "$defaults" to inherit the built-in rules at that position.'),hard_deny:A(o()).optional().describe('Rules for the auto mode classifier HARD BLOCK section \u2014 security boundaries that user intent does NOT clear. Include the literal string "$defaults" to inherit the built-in rules at that position.'),...!1,...{
        },environment:A(o()).optional().describe('Entries for the auto mode classifier environment section. Include the literal string "$defaults" to inherit the built-in entries at that position.'),classifyAllShell:H().optional().describe("When true, every Bash/PowerShell allow rule is suspended while auto mode is active so all shell commands are routed through the classifier (higher safety, more classifier calls). Default: false.")
      }).optional().describe("Auto mode classifier prompt customization")
    }),permissionsShape:()=>({
      disableAutoMode:G(["disable"]).optional().describe("Disable auto mode")
    }),permissionModes:()=>KE.filter((e)=>!NL.includes(e))
  },deepLink:{
    buildGate:()=>!0,shape:()=>({
      disableDeepLinkRegistration:G(["disable"]).optional().describe("Prevent claude-cli:// protocol handler registration with the OS")
    })
  },voice:{
    buildGate:()=>!0,shape:()=>({
      voiceEnabled:H().optional().describe("Enable voice mode (hold-to-talk dictation)")
    })
  },briefView:{
    buildGate:()=>!0,shape:()=>({
      defaultView:G(["chat","transcript"]).optional().describe("Default transcript view: chat (SendUserMessage checkpoints only) or transcript (full)")
    })
  },screenReader:{
    buildGate:()=>!0,shape:()=>({
      axScreenReader:H().optional().describe("Render screen-reader friendly output (flat text, no decorative borders or animations). Overridden by the CLAUDE_AX_SCREEN_READER env var and the --ax-screen-reader CLI flag.")
    })
  }
};
function u8e(){
  return zp.filter((e)=>cn[e].buildGate())
}function bi(e){
  let n={
  };
  for(let s of e)n={
    ...n,...cn[s].shape()
  };
  return n
}function Ei(e){
  let n={
  };
  for(let s of e)n={
    ...n,...cn[s].permissionsShape?.()
  };
  return n
}function xo(e){
  let n=[];
  for(let s of e)n.push(...cn[s].permissionModes?.()??[]);
  return n
}var Hp=Jb,jp=Qb,Do=zn("ZodDeferredOptional",(e,n)=>{
  Hp.init(e,n),jp.init(e,n),e._zod.optin="optional",e._zod.optout="optional",Object.defineProperty(e._zod,"innerType",{
    get(){
      let s=n.getter();return Object.defineProperty(e._zod,"innerType",{
        value:s,configurable:!0
      }),s
    },configurable:!0
  }),e._zod.processJSONSchema=(s,r,i)=>{
    let d=e._zod.innerType;Uv(d,s,i),s.seen.get(e).ref=d
  },Bg(e._zod,"values",()=>{
    let s=e._zod.innerType._zod.values;return s?new Set([...s,void 0]):void 0
  }),Bg(e._zod,"pattern",()=>{
    let s=e._zod.innerType._zod.pattern;return s?new RegExp(`^(${uBt(s.source)})?$`):void 0
  }),Bg(e._zod,"propValues",()=>e._zod.innerType._zod.propValues),e._zod.parse=(s,r)=>{
    if(s.value===void 0)return s;return e._zod.innerType._zod.run(s,r)
  },e.unwrap=()=>e._zod.innerType
});
function Oe(e){
  let n;
  return new Do({
    type:"lazy",getter:()=>{
      if(n===void 0){
        let r=e();if(r._zod.optin==="optional")throw Error("deferredOptional: the inner schema must not accept undefined itself (.optional()/.catch()/.default())");n=r
      }return n
    }
  })
}var Kp=new RegExp("\x00ESCAPED_STAR\x00","g"),$p=new RegExp("\x00ESCAPED_BACKSLASH\x00","g"),Fp=/\/(?:\*\*\/)+/g,Bp=new RegExp("\x00GLOBSTAR\x00","g");
function Fye(e){
  return e.match(/^(.+):\*$/)?.[1]??null
}function k1r(e){
  if(e.endsWith(":*"))return!1;
  for(let n=0;n<e.length;n++)if(e[n]==="*"){
    let s=0,r=n-1;
    while(r>=0&&e[r]==="\\")s++,r--;
    if(s%2===0)return!0
  }return!1
}function A5n(e){
  let n=e.trimEnd();
  if(!n.endsWith("*"))return!1;
  let s=0,r=n.length-2;
  while(r>=0&&n[r]==="\\")s++,r--;
  return s%2===0
}function h6(e,n,s=!1,r=!1){
  if(e.includes("\x00"))return!1;
  let i=e.trim(),d=r?i.replace(/[ \t]+/g," "):i,c=r?n.replace(/[ \t]+/g," "):n,p="",g=0;
  while(g<d.length){
    let x=d[g];
    if(x==="\\"&&g+1<d.length){
      let L=d[g+1];
      if(L==="*"){
        p+="\x00ESCAPED_STAR\x00",g+=2;
        continue
      }else if(L==="\\"){
        p+="\x00ESCAPED_BACKSLASH\x00",g+=2;
        continue
      }
    }p+=x,g++
  }let y=p.replace(/[.+?^${}()|[\]\\'"]/g,"\\$&").replace(Fp,"\x00GLOBSTAR\x00").replaceAll("*",".*").replace(Bp,"/(?:.*/)?").replace(Kp,"\\*").replace($p,"\\\\"),E=(p.match(/\*/g)||[]).length;
  if(y.endsWith(" .*")&&E===1)y=y.slice(0,-3)+"( .*)?";
  let C="s"+(s?"i":"");
  return new RegExp(`^${y}$`,C).test(c)
}function Kmn(e){
  let n=Fye(e);
  if(n!==null)return{
    type:"prefix",prefix:n
  };
  if(k1r(e))return{
    type:"wildcard",pattern:e
  };
  return{
    type:"exact",command:e
  }
}function Ymn(e,n){
  return[{
    type:"addRules",rules:[{
      toolName:e,ruleContent:n
    }],behavior:"allow",destination:"localSettings"
  }]
}function Xmn(e,n){
  return[{
    type:"addRules",rules:[{
      toolName:e,ruleContent:`${n} *`
    }],behavior:"allow",destination:"localSettings"
  }]
}var PRe={
  filePatternTools:["Read","Write","Edit","Glob","NotebookRead","NotebookEdit","Cd"],bashPrefixTools:["Bash"],customValidation:{
    WebSearch:(e)=>{
      if(e.includes("*")||e.includes("?"))return{
        valid:!1,error:"WebSearch does not support wildcards",suggestion:"Use exact search terms without * or ?",examples:["WebSearch(claude ai)","WebSearch(typescript tutorial)"]
      };
      return{
        valid:!0
      }
    },WebFetch:(e)=>{
      if(e.includes("://")||e.startsWith("http"))return{
        valid:!1,error:"WebFetch permissions use domain format, not URLs",suggestion:'Use "domain:hostname" format',examples:["WebFetch(domain:example.com)","WebFetch(domain:github.com)"]
      };
      if(!e.startsWith("domain:"))return{
        valid:!1,error:'WebFetch permissions must use "domain:" prefix',suggestion:'Use "domain:hostname" format',examples:["WebFetch(domain:example.com)","WebFetch(domain:*.google.com)"]
      };
      return{
        valid:!0
      }
    }
  }
};
function Mo(e){
  return PRe.filePatternTools.includes(e)
}function ki(e){
  return PRe.bashPrefixTools.includes(e)
}function Ai(e){
  return Object.hasOwn(PRe.customValidation,e)?PRe.customValidation[e]:void 0
}function wi(e,n){
  let s=0,r=n-1;
  while(r>=0&&e[r]==="\\")s++,r--;
  return s%2!==0
}function Oi(e,n){
  let s=0;
  for(let r=0;r<e.length;r++)if(e[r]===n&&!wi(e,r))s++;
  return s
}var Wp=/(?:^|[^\\])\\[()]/;
function Gp(e){
  return Wp.test(e)&&Oi(e,"(")!==Oi(e,")")
}var Vp=/^(?:[|&;<>]|\d+[<>])/;
function Yp(e){
  return Vp.test(e)
}function Io(e){
  for(let n=0;n<e.length;n++)if(e[n]==="*"&&!wi(e,n))return!0;
  return!1
}function Xp(e){
  if(e.endsWith(":*"))return;
  let n=e.trim().split(/\s+/).filter(Boolean),s=n[0];
  if(n.length<3||s===void 0||Io(s))return;
  let r=!1;
  for(let i of n.slice(1)){
    if(Yp(i))return;
    if(Io(i)){
      r=!0;
      continue
    }if(i.startsWith("-"))continue;
    return r?s:void 0
  }return
}function eft(e){
  if(!KC(e))return null;
  let n=Us(e);
  if(n&&!KC(n.serverName))return null;
  return{
    valid:!1,error:`Wildcard tool name "${e}" is not supported in allow rules`,suggestion:"An allow pattern must name the scope it widens \u2014 globs are permitted only in the tool position after a literal mcp__<server>__ prefix. Deny and ask rules accept wildcards anywhere",examples:["mcp__puppeteer__*","mcp__github__get_*"]
  }
}function Uye(e,n){
  if(!e||e.trim()==="")return{
    valid:!1,error:"Permission rule cannot be empty"
  };
  let s=bUe(e);
  if(s.kind==="malformed")return{
    valid:!1,error:"Malformed Tool(content) rule",suggestion:'Rules take the form Tool or Tool(content) and must end at the closing ")"; parentheses inside the content are literal'
  };
  if(s.kind==="call"&&s.rawContent===""){
    if(!s.toolName)return{
      valid:!1,error:"Empty parentheses with no tool name",suggestion:"Specify a tool name before the parentheses"
    };
    return{
      valid:!1,error:"Empty parentheses",suggestion:`Either specify a pattern or use just "${s.toolName}" without parentheses`,examples:[`${s.toolName}`,`${s.toolName}(some-pattern)`]
    }
  }let r=Jn(e),i=Us(r.toolName);
  if(i){
    if(s.kind==="call")return{
      valid:!1,error:"MCP rules do not support patterns in parentheses",suggestion:`Use "${r.toolName}" without parentheses, or use "mcp__${i.serverName}__*" for all tools`,examples:[`mcp__${i.serverName}`,`mcp__${i.serverName}__*`,i.toolName&&i.toolName!=="*"?`mcp__${i.serverName}__${i.toolName}`:void 0].filter(Boolean)
    };
    if(n==="allow"){
      let c=eft(r.toolName);
      if(c)return c
    }return{
      valid:!0
    }
  }if(!r.toolName||r.toolName.length===0)return{
    valid:!1,error:"Tool name cannot be empty"
  };
  if(n==="allow"){
    let c=eft(r.toolName);
    if(c)return c
  }if(!r.toolName.includes("_")&&r.toolName[0]!==r.toolName[0]?.toUpperCase())return{
    valid:!1,error:"Tool names must start with uppercase",suggestion:`Use "${Jd(String(r.toolName))}"`
  };
  if(s.kind==="call"&&Gp(s.rawContent)){
    let c=Mo(r.toolName);
    return{
      valid:!1,error:'Ambiguous "\\(" or "\\)" beside an unescaped parenthesis',suggestion:c?"Write a Windows path with forward slashes, or spell a literal parenthesis as [(] or [)]":'Double a backslash that is a path separator ("\\\\("), and escape literal parentheses in pairs',examples:c?[`${r.toolName}(C:/Projects/(drafts)/**)`,`${r.toolName}(C:\\Projects\\[(]drafts)\\**)`]:[`${r.toolName}(C:\\tools\\\\(x86)\\run.exe *)`]
    }
  }let d=Ai(r.toolName);
  if(d&&r.ruleContent!==void 0){
    let c=d(r.ruleContent);
    if(!c.valid)return c
  }if(ki(r.toolName)&&r.ruleContent!==void 0){
    let c=r.ruleContent;
    if(c===":*")return{
      valid:!1,error:"Prefix cannot be empty before :*",suggestion:"Specify a command prefix before :*",examples:["Bash(npm *)","Bash(git *)"]
    };
    if(n==="allow"){
      let g=Xp(c);
      if(g!==void 0){
        let h=g==="git",m=h?" For git, options such as -c and --exec-path can run arbitrary commands.":"",S=h?" (for example Bash(git status *))":"";
        return{
          valid:!0,warning:`${Hn(r)} has a wildcard before the rest of the command, so it also matches any options inserted at that position and approves them without a prompt.${m} Replace that * with the exact value you mean, or only use * after the subcommand${S}.`
        }
      }
    }let p=Fye(c)?.trimEnd();
    if(p!==void 0){
      if(Io(p)){
        let g=A5n(p),h=g?"matches only commands containing a literal * at that position":"will likely never match",m=g?p:`${p}*`,S=n==="allow"?" Replace that * with the exact value you mean.":m.endsWith(":*")?"":` Use ${Hn({toolName:r.toolName,ruleContent:m})} for wildcard matching.`;
        return{
          valid:!0,warning:`${Hn(r)} mixes * with the trailing :* prefix syntax, so it is matched as a literal prefix (the * is not expanded) and ${h}.${S}`
        }
      }
    }else if(c.includes(":*")&&!c.endsWith(":*")){
      let g=n==="allow"?"Replace that :* with the exact value you mean.":"It already matches as a * wildcard; moving :* to the end would make it a literal prefix and change which commands match.";
      return{
        valid:!0,warning:`${Hn(r)} has a :* that is not at the end, so it is matched as a * wildcard (the : is literal), not as the trailing :* prefix syntax. ${g}`
      }
    }
  }if(Mo(r.toolName)&&r.ruleContent!==void 0){
    if(r.ruleContent.includes(":*"))return{
      valid:!1,error:'The ":*" syntax is only for Bash prefix rules',suggestion:'Use glob patterns like "*" or "**" for file matching',examples:[`${r.toolName}(*.ts) - matches .ts files`,`${r.toolName}(src/**) - matches all files in src`,`${r.toolName}(**/*.test.ts) - matches test files`]
    }
  }if(r.ruleContent!==void 0){
    let c=r.toolName==="Write"||r.toolName==="NotebookEdit"||r.toolName==="MultiEdit"?"Edit":r.toolName==="Glob"?"Read":void 0;
    if(c!==void 0&&!r.ruleContent.includes(":*"))return{
      valid:!0,warning:`${Hn(r)} is not matched by file permission checks \u2014 only ${c}(path) rules are. Use ${Hn({toolName:c,ruleContent:r.ruleContent})} instead (${c} rules cover all file-${c==="Edit"?"editing":"reading"} tools).`
    }
  }return{
    valid:!0
  }
}var Lo=f(()=>vi()),Ri=f(()=>vi("allow"));
function vi(e){
  return o().superRefine((n,s)=>{
    let r=Uye(n,e);if(!r.valid){
      let i=r.error;if(r.suggestion)i+=`. ${r.suggestion}`;if(r.examples&&r.examples.length>0)i+=`. Examples: ${r.examples.join(", ")}`;s.addIssue({
        code:Q1.custom,message:i,params:{
          received:n
        }
      })
    }
  })
}var tft=["accept","hold","refuse"],oUe=["off","basic","full"],Jp=f(()=>fe(o(),Ljr()));
function ji(e){
  return u({
    allow:A(Ri()).optional().describe("List of permission rules for allowed operations"),deny:A(Lo()).optional().describe("List of permission rules for denied operations"),ask:A(Lo()).optional().describe("List of permission rules that should always prompt for confirmation"),defaultMode:Bi(Dm,G([...NL,...xo(e)])).optional().describe("Default permission mode when Claude Code needs access ('manual' is accepted as an alias for 'default')"),disableBypassPermissionsMode:G(["disable"]).optional().describe("Disable the ability to bypass permission prompts"),blockReadsOutsideWorkingDirectories:H().optional().describe('Refuse file-tool reads (Read, Grep, Glob, LSP) outside the working directories in every permission mode; true in any settings source wins. Also set when the user picks "block" on the one-time auto-mode prompt for a read outside the working directories.'),...Ei(e),additionalDirectories:A(o()).optional().describe("Additional directories to include in the permission scope")
  }).passthrough()
}var g$o=f(()=>ji(u8e())),qp=f(()=>Fe([o(),u({
}).passthrough().describe('{ id: stable id (letters, digits, ".", "_", "-"; max 64), text: the tip (max 500 characters, one line), cooldownSessions?: sessions to wait before showing it again (default 0), priority?: tie-break weight among never-shown tips (default 0) }')])),T1r=f(()=>Bi((e)=>Array.isArray(e)?e.filter((n)=>typeof n==="string"||!!n&&typeof n==="object"&&!Array.isArray(n)):[],A(qp()))),Ko=f(()=>u({
  source:gt().describe("Where to fetch the marketplace from"),installLocation:o().optional().describe("Local cache path where marketplace manifest is stored (auto-generated if not provided)"),autoUpdate:H().optional().describe("Whether to automatically update this marketplace and its installed plugins on startup")
})),Fo=f(()=>{
  let e=()=>k().min(0).max(1e4);return u({
    input:e(),output:e(),cacheRead:e(),cacheWrite:e()
  })
}),Go=f(()=>k().gt(0).lte(10).optional()),Vo=f(()=>u({
  model:o().describe('Model to select, taken verbatim: an alias ("opus"), an Anthropic model ID, or a provider-format ID (Vertex, Bedrock, gateway). Same values --model accepts.'),label:o().optional().describe("Row title. Defaults to the model name."),description:o().optional().describe("Row subtitle. Defaults to a generic description."),behavesAs:o().optional().describe("For a model this version of Claude Code does not know: the ID of a model it does know "+'(e.g. "claude-opus-4-8") whose client-side handling \u2014 prompt profile, capability and effort '+"defaults \u2014 applies to it. Changes neither the row's label nor the model ID sent. Without it, "+"a model-catalog row for a model this version does not know is not offered until Claude Code is updated.")
})),mn=f(()=>u({
  serverName:o().regex(/^[a-zA-Z0-9_-]+$/,"Server name can only contain letters, numbers, hyphens, and underscores").optional().describe("Name of the MCP server that users are allowed to configure"),serverCommand:A(o()).min(1,"Server command must have at least one element (the command)").optional().describe("Command array [command, ...args] to match exactly for allowed stdio servers"),serverUrl:o().optional().describe('URL pattern with wildcard support (e.g., "https://*.example.com/*") for allowed remote MCP servers')
}).refine((e)=>B([e.serverName!==void 0,e.serverCommand!==void 0,e.serverUrl!==void 0],Boolean)===1,{
  message:'Entry must have exactly one of "serverName", "serverCommand", or "serverUrl"'
})),fn=f(()=>u({
  serverName:o().min(1,"Server name must be non-empty").refine((e)=>e.trim().length>0,{
    message:"Server name must not be whitespace-only"
  }).refine((e)=>e===e.trim(),{
    message:"Server name has leading or trailing whitespace and will never match (names are compared verbatim)"
  }).optional().describe("Name of the MCP server that is explicitly blocked"),serverCommand:A(o()).min(1,"Server command must have at least one element (the command)").optional().describe("Command array [command, ...args] to match exactly for blocked stdio servers"),serverUrl:o().optional().describe('URL pattern with wildcard support (e.g., "https://*.example.com/*") for blocked remote MCP servers')
}).refine((e)=>B([e.serverName!==void 0,e.serverCommand!==void 0,e.serverUrl!==void 0],Boolean)===1,{
  message:'Entry must have exactly one of "serverName", "serverCommand", or "serverUrl"'
})),Ki=f(()=>u({
  marketplace:o(),plugin:o()
})),Zp=f(()=>Bi((e)=>{
  if(typeof e!=="string"||!VC().safeParse(e).success)return e;let n=e.indexOf("@");return{
    marketplace:e.slice(n+1),plugin:e.slice(0,n)
  }
},Ki())),Qp=/[\x00-\x1f\x7f-\x9f\u2028\u2029]|\p{DI}/u;
function A1r(e){
  let n=e.replaceAll("/","\\");
  if(nM(n))return!1;
  return/^\\{
    2
  }[^\\]/.test(n)
}function OUt(e){
  return Yi(e)||/^\/network\/servers(\/|$)/i.test(e)||N_(e)
}function C1r(e){
  return/^\/(proc|dev\/(fd|stdin|stdout|stderr))(\/|$)/i.test(e)
}function R1r(e,n,s={
}){
  if(n==="win32"){
    let r=e.replaceAll("/","\\");
    if(nM(r))return!1;
    let i=A1r(r);
    if(s.rejectUnc&&i)return!1;
    if(s.rejectDriveRelative){
      if(!/^[A-Za-z]:\\/.test(r)&&!i&&/^(\\|[A-Za-z]:)/.test(r))return!1
    }if(Hi.normalize(r)!==r)return!1;
    let d=r.split("\\");
    if(d.some((p)=>p==="."||p===".."))return!1;
    if(d.some((p,g)=>/[. ]$/.test(p)||p.includes(":")&&!(g===0&&/^[A-Za-z]:$/.test(p))))return!1;
    let c=r.startsWith("\\\\")?r.slice(2):r;
    if(/\\{2}/.test(c))return!1;
    return!r.endsWith("\\")||/^([A-Za-z]:)?\\$/.test(r)
  }if(s.rejectNetworkRoot&&OUt(e))return!1;
  if(s.rejectMagicLinkRoot&&C1r(e))return!1;
  if(zi.normalize(e)!==e)return!1;
  if(e.split("/").some((r)=>r==="."||r===".."))return!1;
  if(/\/{2}/.test(e))return!1;
  return!e.endsWith("/")||e==="/"
}var x1r=/\.(exe|ps1)$/i;
function I1r(e){
  return/\.ps1$/i.test(e)
}function P1r(e){
  return I1r(e)&&/[[\]`*?]/.test(e)
}var O1r='a .ps1 path must not contain "[", "]", "`", "*", or "?" on Windows (PowerShell resolves them as wildcard syntax)',eg=()=>o().describe("Absolute path to the helper executable"),nt=(e)=>Bi((n)=>n===null?void 0:n,e.optional()).optional(),C5n=Fg,Ci=(e)=>k().int().min(e).transform((n)=>Math.min(n,C5n)),Pi=["path","script","defaultSettings"];
function $i(e){
  if(!e||typeof e!=="object"||Array.isArray(e))return!1;
  let n=e;
  return Pi.some((s)=>n[s]===null)&&Pi.every((s)=>n[s]===null||n[s]===void 0)
}var Ti=64,pn=f(()=>u({
  path:eg(),timeoutMs:nt(Ci(1000)),refreshIntervalMs:nt(Fe([R(0),Ci(60000)]))
})),Fi=()=>G(["replace","merge"]).describe("How the helper's managedSettings compose with the settings of the source that delivered this entry: 'replace' (default) \u2014 the output is the policy; 'merge' \u2014 the output is deep-merged over that source's own settings the way merged managed sources compose (helper scalars win, arrays union, objects merge \u2014 except fallbackModel, forceLoginOrgUUID, gatewayInternalNetworks, sandbox.filesystem.allowRead, sandbox.credentials.awsPairs, sandbox.ripgrep and the restriction allowlists such as allowedMcpServers, availableModels and allowedHttpHookUrls, which are the helper's whole value when it emits one; tighten a permission with a deny), so a failed helper costs only the delta");
function Gi(e){
  return e==="continue"||e==="refuse"
}var tg=()=>Bi((e)=>e===void 0||Gi(e)?e:"refuse",G(["continue","refuse"]).describe(`What happens when this entry's helper fails at startup (bad path, missing file or interpreter, non-zero exit, timeout, oversize or invalid output) and no static settings payload (this entry's own, the linux entry's on WSL, or the map's "default") applies in its place: 'refuse' \u2014 Claude Code does not start, naming the failure; 'continue' \u2014 Claude Code starts without the helper's output, on the delivering source's own settings, with a /status notice. Default: 'refuse' when the entry comes from MDM or the managed settings file, 'continue' when it comes from remote managed settings. Any other value is treated as 'refuse', with a /status notice. The install and update commands start no session and are never refused over a remote entry: they report the refusal in /status. An entry whose other fields fail validation runs no helper; from MDM or the managed settings file, any value but 'continue' on it then refuses to start Claude Code until the entry is fixed, unless a static settings payload (the entry's own, kept when it validates, the linux entry's for a wsl one, or the map's "default") serves in its place. From remote, a non-interactive session runs the helper off settings verified this session without the interactive approval, so 'refuse' there too means the helper ran and failed; a launch whose remote settings could not be verified this session (offline, fetch failed) starts without the helper regardless; and a failure first reached after the session has started (settings verified or approved mid-session, which on a machine that only ever runs non-interactively is every launch) ends a session no person watches (non-interactive, a background session no client is attached to, or a teammate session) as the refused start would have, and leaves a watched interactive one (a terminal, with or without remote control, or an attached background session) running under a /status notice with its next start refused. Background refresh failures always keep the last good output whatever this says`)),H1r=5,ng=()=>k().int().min(0).transform((e)=>Math.min(e,H1r)).describe("How many more times to run this entry's helper when a run fails to execute \u2014 it could not be launched, exited non-zero, or was stopped at timeoutMs \u2014 before that counts as a failure (a non-negative integer; default 0, a single attempt; above 5 is treated as 5). Attempts are separated by a short randomized backoff (from 250 ms, doubling per attempt, at most 4 s each) and each attempt gets the full timeoutMs, so a start that waits on the helper can wait up to (retries + 1) \xD7 timeoutMs plus the backoff. Output the helper did produce and that was refused \u2014 oversized, not a JSON object, an invalid envelope, or settings that fail validation \u2014 is not retried, and neither is an invalid path. Applies alike at startup and on each background refresh; only once the attempts are used up do the entry's failure rules (a static settings payload in its place, onFailure, the refresh notice) apply, naming the last attempt's failure"),Vi=(e)=>(e==="windows"?R("pwsh",{
  message:"interpreter must be 'pwsh' on windows ('sh' is not supported there)"
}):R("sh",{
  message:"interpreter must be 'sh' on macos/linux/wsl"
})).describe("Fixed interpreter for `script`: 'sh' (/bin/sh) on macos/linux/wsl entries; 'pwsh' (PowerShell at its fixed install locations, never PATH) on the windows entry"),M1r="exactly one of path/script must be configured",og='"script" and "interpreter" must be configured together',sg="script must be ASCII-only on Windows (PowerShell decodes stdin with the console OEM code page); spell non-ASCII characters as escapes, e.g. [char]0x00E9",Xi=(e)=>o({
  message:"script must be a string"
}).min(1,{
  message:"script must not be empty"
}).max(65536,{
  message:"script must be at most 65536 characters"
}).refine((n)=>!n.includes("\x00"),{
  message:"script must not contain NUL bytes"
}).refine((n)=>Qd(n),{
  message:"script must be valid UTF-8 (no lone surrogates)"
}).refine((n)=>e!=="windows"||!/[\u0080-\uffff]/.test(n),{
  message:sg
}).describe("Inline helper script, delivered to the fixed interpreter over stdin (never written to disk)");
function h$o(e,n){
  let s=u({
    script:Xi(n),interpreter:Vi(n)
  }).safeParse(e);
  return s.success?null:s.error.issues[0]?.message||"invalid inline helper config"
}var FL=["macos","linux","windows","wsl"];
function Yo(e){
  return e==="wsl"?["wsl","linux"]:[e]
}function rg(e){
  return e==="windows"?"win32":"posix"
}function ig(e){
  return{
    rejectDriveRelative:e==="windows",rejectUnc:e==="windows",rejectNetworkRoot:e!=="windows",rejectMagicLinkRoot:e!=="windows",requireWin32ExecutableSuffix:e==="windows"
  }
}function ag(e){
  let n=rg(e),s=ig(e);
  return o().max(1024,{
    message:"path must be at most 1024 characters"
  }).refine((r)=>!Qp.test(r),{
    message:"path must not contain control, line/paragraph-separator, or invisible (default-ignorable) characters"
  }).refine((r)=>(n==="win32"?Hi:zi).isAbsolute(r),{
    message:"path must be absolute"
  }).refine((r)=>!(n==="win32"&&s.requireWin32ExecutableSuffix)||x1r.test(r),{
    message:"path must end in .exe or .ps1 on Windows"
  }).refine((r)=>n!=="win32"||!P1r(r),{
    message:O1r
  }).refine((r)=>R1r(r,n,s),{
    message:n==="win32"?'path must be in normalized form: no "." or ".." segments, no doubled or trailing separators, no component ending in "." or a space, no ":" outside the drive letter, no device-namespace (\\\\?\\) prefix, no drive-relative (\\dir or C:name) or UNC (\\\\server\\share) form':'path must be in normalized form: no "." or ".." segments, no doubled or trailing separators, and not under a network automount root (/net/<host>, /Network/Servers, or macOS /.vol /.file /.nofollow /.resolve) or a kernel magic-link root (/proc, /dev/fd)'
  }).describe("Absolute path to the helper executable")
}var qo=[...FL,"default"],Uo=["path","script","interpreter","outputBehavior","onFailure","retries","timeoutMs","refreshIntervalMs","defaultSettings"],un=["managedSettings","appendSystemPrompt"],sUe=f(()=>fe(o(),ae()).superRefine((e,n)=>{
  for(let s of["policyHelper","policyHelpers"])if(e[s]!==void 0&&e[s]!==null)n.addIssue({
    code:"custom",message:`must not contain "${s}" \u2014 the default payload is applied as managed settings and cannot configure further policy helpers`
  });for(let s of Uo)if(e[s]!==void 0&&e[s]!==null)n.addIssue({
    code:"custom",message:`must not contain "${s}" \u2014 a static payload is a managed-settings object, not a policyHelpers entry; entry fields (${Uo.join("/")}) belong on the per-OS entries (policyHelpers.${FL.join("/")})`
  });for(let s of un)if(e[s]!==void 0&&e[s]!==null)n.addIssue({
    code:"custom",message:`must not contain "${s}" \u2014 a static payload is the managedSettings SUBTREE, not the helper's stdout envelope; paste the object your helper emits UNDER "managedSettings", not the envelope around it`
  });for(let s of qo)if(e[s]!==void 0&&e[s]!==null)n.addIssue({
    code:"custom",message:`must not contain "${s}" \u2014 a static payload is the VALUE of a policyHelpers key (a managed-settings object), never another policyHelpers map; don't paste the map or its "${s}" line inside the slot`
  })
})),lg='Entry must carry "path" (a helper executable) or "script" + "interpreter" (an inline helper), and/or "defaultSettings" (a static settings payload)';
function dg(e){
  let{
    path:n,script:s,interpreter:r,defaultSettings:i
  }=e;
  if(n!==void 0&&s!==void 0)return M1r;
  if(s===void 0!==(r===void 0))return og;
  if(n===void 0&&s===void 0&&i===void 0)return lg;
  return null
}function Ji(e,n){
  return pn().omit({
    path:!0
  }).extend({
    path:nt(ag(e)),script:nt(Xi(e)),interpreter:nt(Vi(e)),outputBehavior:nt(Fi()),onFailure:nt(tg()),retries:nt(ng()),defaultSettings:Bi((s)=>s===null?void 0:s,n.optional()).optional()
  }).check((s)=>{
    if(s.issues.length>0)return;let r=dg(s.value);if(r!==null)s.issues.push({
      code:"custom",message:r,input:s.value
    })
  })
}var lE=f(()=>Ji("linux",sUe()));
function zo(e,n=sUe()){
  return e==="default"?sUe():Ji(e,n)
}var cg=f(()=>u(Object.fromEntries(qo.map((e)=>[e,Bi((n)=>{
  if(n===null)return;if(e!=="default"&&$i(n))return;return n
},zo(e).optional()).optional()])))),Jmn=["skills","agents","hooks","mcp"];
function qi(e){
  return Bi((n)=>{
    if(!Array.isArray(n))return n;let s=n.filter((r)=>Jmn.includes(r));if(s.length<n.length)e?.(n.length-s.length);return s
  },Fe([H(),A(G(Jmn))]))
}var xi=Object.freeze({
  type:"invalid-entry-stripped"
}),pg=f(()=>Fe([u({
  type:R("regex").describe('Config variant. This client understands "regex": matches turn output and builds a URL from named capture groups. Entries with other variants are preserved but skipped at runtime.'),pattern:o().describe("Regex matched against turn output (tool results and assistant text)"),url:o().describe("Link target. {name} placeholders are filled from named regex capture groups, e.g. (?<id>...) -> {id}. Values are URL-encoded; the origin must be literal in the template. The scheme must be https, http, or a recognized editor or workspace deep-link scheme: vscode, vscode-insiders, cursor, windsurf, zed, jetbrains, idea, slack, linear, notion, figma."),label:o().optional().describe("Badge text. {name} placeholders filled from named capture groups; defaults to the full match.")
}).passthrough(),u({
  type:o().describe("Config variant discriminator for entries this client does not understand; the entry is preserved as-is and skipped at runtime.")
}).passthrough()])),gg=()=>k().int().min(E8e).max(pft).optional().catch(void 0);
function nft(e,{
  strictPolicyHelperKeys:n=!1
}={
}){
  function s(d){
    return fe(o(),Ko()).check((c)=>{
      for(let[p,g]of Object.entries(c.value))if(g.source.source==="settings"&&g.source.name!==p)c.issues.push({
        code:"custom",input:g.source.name,path:[p,"source","name"],message:`Settings-sourced marketplace name must match its ${d} key (got key "${p}" but source.name "${g.source.name}")`
      })
    })
  }let r=(d,c)=>n?Bi((p)=>{
    if(p===null)return;return c?c(p):p
  },d):d.catch(void 0),i=u({
    commit:o().optional().describe("Attribution text for git commits, including any trailers. Empty string hides attribution."),pr:o().optional().describe("Attribution text for pull request descriptions. Empty string hides attribution."),sessionUrl:H().optional().describe("Whether to append the claude.ai session link to commits and PRs created from web or Remote Control sessions (default: true). Set to false to omit the Claude-Session trailer and PR-body link."),...!1
  }).passthrough();
  return u({
    $schema:o().optional().describe("JSON Schema reference for Claude Code settings"),apiKeyHelper:o().optional().describe("Path to a script that outputs authentication values"),proxyAuthHelper:o().optional().describe("Shell command that outputs a Proxy-Authorization header value (EAP)"),awsCredentialExport:o().optional().describe("Path to a script that exports AWS credentials"),awsAuthRefresh:o().optional().describe("Path to a script that refreshes AWS authentication"),gcpAuthRefresh:o().optional().describe("Command to refresh GCP authentication (e.g., gcloud auth application-default login)"),processWrapper:o().optional().describe("Corporate launcher argv prefix for the background-agent supervisor, the sessions and workers it hosts, and the other covered background processes listed in the Claude Code corporate-launcher documentation. Equivalent to the CLAUDE_CODE_PROCESS_WRAPPER environment variable, which takes precedence when set. Honored from managed settings, a --settings/SDK-supplied settings file, and user settings, in that precedence order; project and local settings are ignored."),policyHelper:r(pn().optional(),(d)=>d&&typeof d==="object"&&!Array.isArray(d)&&d.path===null?void 0:d).describe("Executable that computes managed settings at startup. Honored only from admin-controlled policy sources."),policyHelpers:r(cg().optional()).describe(`@internal Per-OS variant of policyHelper, keyed by platform: macos, linux, windows, wsl, plus an optional "default" entry that is a STATIC settings payload (a JSON object of managed settings, not a helper). Each per-OS entry carries a helper \u2014 a "path", or an inline "script" + "interpreter" delivered to a fixed interpreter over stdin, either with timeoutMs/refreshIntervalMs \u2014 its own static "defaultSettings" payload, or both; an entry may be payload-only. Selection for a platform walks its chain (the platform's own entry; on wsl the linux entry next): the first helper on the chain wins over policyHelper; if no helper is configured \u2014 or the selected helper fails at startup or refresh \u2014 the first payload applies (the chain's "defaultSettings" in platform-specific-first order, then the top-level "default", applied with no process spawned; unrecognized platforms reach only "default"); with no payload either, policyHelper. Honored from admin-controlled policy sources, and from remote managed settings \u2014 a payload of plain policy as delivered, like any other remote key; a helper, or a payload carrying anything the managed-settings approval dialog lists, only once the settings are verified this session and approved there (policyHelper itself is never honored from remote).`),...a.CLAUDE_CODE_ENABLE_XAA&&{
      xaaIdp:u({
        issuer:o().url().describe("IdP issuer URL for OIDC discovery"),clientId:o().describe("Claude Code's client_id registered at the IdP"),callbackPort:k().int().positive().optional().describe("Fixed loopback callback port for the IdP OIDC login. Only needed if the IdP does not honor RFC 8252 port-any matching.")
      }).optional().describe("XAA (SEP-990) IdP connection. Configure once; all XAA-enabled MCP servers reuse this.")
    },fileSuggestion:u({
      type:R("command"),command:o()
    }).optional().describe("Custom file suggestion configuration for @ mentions"),respectGitignore:H().optional().describe("Whether file picker should respect .gitignore files (default: true). Note: .ignore files are always respected."),breakReminder:u({
      enabled:H().optional().describe("Show a friendly nudge after sustained continuous use (default false). Must be true for the reminder to fire."),intervalMinutes:k().int().positive().optional().describe("Minutes of continuous use before the reminder fires (default 30). Re-fires every interval until you take a break."),breakThresholdMinutes:k().int().positive().optional().describe("Minutes of inactivity that count as a break and reset the timer (default 10)"),message:o().optional().describe("Custom reminder text. Leave unset for a rotating set of friendly nudges.")
    }).optional().describe("@internal Opt-in break reminder. When enabled, shows a dismissible nudge after sustained continuous use. Never blocks \u2014 just a friendly heads-up."),quietHours:u({
      enabled:H().optional().describe("Show a one-time nudge when you start or keep using the CLI inside your quiet-hours window (default false)."),start:o().regex(/^([01]?\d|2[0-3]):[0-5]\d$/,'Expected 24-hour local time "HH:MM" (e.g. "22:00")').optional().describe('Start of the quiet-hours window, 24-hour local time "HH:MM".'),end:o().regex(/^([01]?\d|2[0-3]):[0-5]\d$/,'Expected 24-hour local time "HH:MM" (e.g. "07:00")').optional().describe('End of the quiet-hours window, 24-hour local time "HH:MM". May be earlier than start for an overnight range.')
    }).optional().describe("@internal Opt-in quiet hours. When enabled, shows a single soft nudge per session while inside the configured local-time window. Never blocks."),cleanupPeriodDays:k().int().positive().optional().describe("Number of days to retain chat transcripts before automatic cleanup (default: 30). Minimum 1. Use a large value for long retention; use --no-session-persistence to disable transcript writes entirely."),desktopSessionCleanupPeriodDays:k().int().nonnegative().optional().describe("Retention ceiling in days for session transcripts created or last written by a desktop-host surface (Claude Desktop, Cowork), which are otherwise exempt from the cleanupPeriodDays sweep. 0 (the default) means no ceiling: such transcripts are kept until deleted another way. Unlike cleanupPeriodDays, 0 is allowed because this setting never disables writes \u2014 it only bounds an exemption from deletion. The ceiling is a hard cap: it also bounds an active archive grace, so the grace window of a release marker never keeps files past the ceiling. Ignored when cleanupPeriodDays is managed by org policy. A ceiling at or below cleanupPeriodDays effectively disables the exemption: those transcripts age out on the regular cleanupPeriodDays schedule, so the effective retention is whichever of the two periods is longer."),syncClaudeAiSkills:H().optional().describe("Set to false to turn off syncing of the skills you have enabled on claude.ai. In your user settings (or managed settings): nothing more is downloaded, previously synced skills (~/.claude/skills/synced) can no longer be run, are hidden from every session started afterwards, and are moved to ~/.claude/skills/.trash at the next launch (deleted after cleanupPeriodDays; re-downloaded, not restored, if you re-enable). In .claude/settings.local.json or --settings: downloads stop and synced skills are blocked and hidden for sessions in that workspace or invocation only (nothing is moved). Not read from project settings (.claude/settings.json). Only false is honored \u2014 the feature is enabled server-side for your account, so setting true does not turn it on early. While it is on, synced skills are available in every session, re-synced every 10 minutes, and removed when you disable them on claude.ai. Only applies when signed in with your Claude account."),syncClaudeAiPlugins:H().optional().describe("Set to false to turn off syncing of the plugins you have enabled on claude.ai. In your user settings (or managed settings): nothing more is downloaded, previously synced plugins (~/.claude/plugins/synced) are hidden from every session started afterwards and moved to ~/.claude/plugins/.trash at the next launch (deleted after cleanupPeriodDays; re-downloaded, not restored, if you re-enable). In .claude/settings.local.json or --settings: downloads stop and synced plugins are hidden for sessions in that workspace or invocation only (nothing is moved). Not read from project settings (.claude/settings.json). Only false is honored \u2014 the feature is enabled server-side for your account, so setting true does not turn it on early. While it is on, synced plugins load in every session like plugins you installed yourself (a plugin you installed with the same name takes precedence), are re-synced at each launch, and are removed when you disable them on claude.ai. Only applies when signed in with your Claude account."),skillListingMaxDescChars:k().int().positive().optional().describe("Per-skill description character cap in the skill listing sent to Claude (default: 1536). Descriptions longer than this are truncated. Raise to opt in to higher per-turn context cost."),skillListingBudgetFraction:k().gt(0).lte(1).optional().describe("Fraction of the context window (in characters) reserved for the skill listing sent to Claude (default: 0.01 = 1%). When the listing exceeds this, descriptions are shortened to fit. Raise to opt in to higher per-turn context cost."),wslInheritsWindowsSettings:H().optional().describe("When set to true in either admin-only Windows source \u2014 the HKLM SOFTWARE/Policies/ClaudeCode registry key or C:/Program Files/ClaudeCode/managed-settings.json \u2014 WSL reads managed settings from the full Windows policy chain (HKLM, C:/Program Files/ClaudeCode via DrvFs, HKCU) in addition to /etc/claude-code. Windows sources take priority. The flag is also required in HKCU itself for HKCU policy to apply on WSL (double opt-in: admin enables the chain, user confirms HKCU). On native Windows the flag has no effect."),env:Oe(()=>Jp()).describe("Environment variables to set for Claude Code sessions"),attribution:Fe([H(),i],{
      error:(d)=>{
        let c=(d.errors??[]).flat().filter((g)=>g.path.length>0);if(c.length>0)return c.map((g)=>`${g.path.join(".")}: ${g.message.replace(/^Invalid input: /,"")}`).join("; ");return`Expected false, true, or an object such as { "commit": "", "pr": "" }, but received ${Array.isArray(d.input)?"array":d.input===null?"null":typeof d.input}`
      }
    }).transform((d)=>{
      if(typeof d!=="boolean")return d;return d?{
      }:{
        commit:"",pr:"",sessionUrl:!1
      }
    }).pipe(i).optional().describe('Customize attribution text for commits and PRs. Each field defaults to the standard Claude Code attribution if not set. Set to false to hide all attribution, the same as { "commit": "", "pr": "", "sessionUrl": false }. Setting it to true is the same as leaving it out. Older Claude Code versions reject true or false here, so use the object form in settings files shared across versions.'),includeCoAuthoredBy:H().optional().describe("Deprecated: Use attribution instead. Whether to include Claude's co-authored by attribution in commits and PRs (defaults to true)"),...!1,...!1,includeGitInstructions:H().optional().describe("Include built-in commit and PR workflow instructions in Claude's system prompt (default: true)"),permissions:Oe(()=>ji(e)).describe("Tool usage permissions configuration"),model:o().optional().describe("Override the default model used by Claude Code"),fallbackModel:A(o()).optional().describe('Fallback model(s) tried in order when the primary model is overloaded or unavailable. Each element accepts a model name or alias; "default" expands to the default model. CLI --fallback-model takes precedence.'),availableModels:A(o()).optional().describe('Allowlist of models that users can select. Accepts family aliases ("opus" allows any opus version), version prefixes ("opus-4-5" allows that version and any model ID that extends it, so "claude-opus-5" also allows "claude-opus-5-5"), and full model IDs. If undefined, all models are available. If empty array, only the default model is available. Typically set in managed settings by enterprise administrators.'),enforceAvailableModels:H().optional().describe("When true and availableModels is a non-empty array, the Default model selection is also constrained: if the default model for the user tier is not in availableModels, Default resolves to the first allowed availableModels entry instead. Has no effect when availableModels is unset or an empty array. Typically set in managed settings by enterprise administrators."),availableModelsMatch:G(["prefix","exact"]).optional().describe('How availableModels entries match model IDs. "prefix" (the default) lets an entry also allow any model ID that extends it, so "claude-opus-5" allows "claude-opus-5-5". "exact" keeps that matching but stops a model ID entry from allowing other versions: "claude-opus-5" allows Opus 5 and its dated and -fast IDs, but not Opus 5.5 or a later release until it is listed, and a -latest ID needs a -latest entry. Family aliases ("opus") still allow the whole family; aliases whose model depends on the release or settings (best, opusplan, default) are ignored. With "exact" and a list that names at least one model, the Default option also uses only a listed model; if none can be used, Claude Code will not start. Haiku background models, and hooks and other helper requests that pick their own model, are not restricted (deniedModels covers them; allowManagedHooksOnly limits hooks). Read from managed settings only.'),deniedModels:A(o()).optional().describe('Models users cannot select, even when availableModels allows them. A family alias ("opus") blocks that family. A model ID blocks that version in every spelling: dates, -fast and provider prefixes are ignored, so "claude-opus-5-5" blocks every Opus 5.5 ID but not Opus 5. An ID with no minor version ("claude-opus-5") also blocks later minor versions, as it allows them in availableModels. Aliases whose model depends on the release or settings (best, opusplan, default) are ignored. The Default option steps down past a blocked model; if the Default has no allowed model to step down to, Claude Code will not start. Read from managed settings only.'),modelOverrides:fe(o(),o()).optional().describe('Override mapping from Anthropic model ID (e.g. "claude-opus-4-6") to provider-specific model ID (e.g. a Bedrock inference profile ARN). Typically set in managed settings by enterprise administrators.'),modelPicker:u({
      options:A(Vo()).describe("Rows to show in the /model picker, in order."),replaceBuiltInOptions:H().optional().describe("When true, the picker shows only the Default row and these options \u2014 the built-in "+"lineup, gateway-discovered models and ANTHROPIC_CUSTOM_MODEL_OPTION are hidden. When false or unset, these options are added after the built-in lineup.")
    }).optional().describe("Curate the /model picker: an ordered list of models with your own labels, independent of the built-in lineup and of Claude Code releases. availableModels still applies to these rows. Honored from managed, --settings/SDK, and user settings only (not from a project checkout); the highest-precedence of those that defines modelPicker wins outright (no merging across sources). Typically set in managed settings by enterprise administrators."),modelPricing:u({
      multiplier:Go(),overrides:fe(o(),Fo()).optional()
    }).optional().describe("Price usage at your organization's contracted rates instead of list price. "+"Affects every spend figure Claude Code reports \u2014 /cost, the status line, the SDK total_cost_usd, "+"--max-budget-usd, and the OpenTelemetry cost metric and events \u2014 which remain USD estimates, not an invoice "+'(the per-Mtok price labels in /model stay at list). "overrides" maps a model ID to its USD-per-million-token rates (input, output, cacheRead, '+"cacheWrite \u2014 all four required, each 0 to 10000; cacheWrite prices both 5-minute and 1-hour cache writes). "+"A matching row is charged exactly as written; fast-mode and US-data-residency surcharges are not added on top. "+'A key Claude Code itself uses for a built-in model \u2014 its ID such as "claude-sonnet-4-6", or its '+"first-party, Bedrock (any or no region prefix), Vertex or Foundry ID \u2014 covers every dated and provider form "+"of that model; any other key \u2014 a gateway model alias, or a spelling Claude Code does not itself use \u2014 "+'matches that model ID only (case-insensitive), and such an exact match wins over a built-in row. On Bedrock an application inference profile is matched by its backing model. An invalid row or multiplier is reported and skipped; the rest still apply. "multiplier" in (0, 10] scales every computed cost, overridden or not (0.85 = 85% of the price, 1.2 = 120%). Only honored from managed settings (server-managed, MDM / OS policy, or managed-settings.json), '+"or \u2014 when none of those sets it \u2014 when supplied by a host application that manages the model "+"provider; ignored in user, project, local and --settings sources."),...!1,enableAllProjectMcpServers:H().optional().describe("Whether to automatically approve all MCP servers in the project"),enabledMcpjsonServers:A(o()).optional().describe("List of approved MCP servers from .mcp.json"),disabledMcpjsonServers:A(o()).optional().describe("List of rejected MCP servers from .mcp.json"),disableClaudeAiConnectors:H().optional().describe("When true in any settings source, claude.ai MCP cloud connectors are not auto-fetched or connected. "+"Only gates auto-fetched connectors \u2014 a claudeai-proxy server passed explicitly "+"(e.g. via --mcp-config or the SDK mcpServers option) still follows the normal MCP config trust flow. Any-source-true wins: a project can opt out, but a project-level false cannot override a user-level true."),skillOverrides:fe(o(),G(["on","name-only","user-invocable-only","off"])).optional().describe('Per-skill listing overrides keyed by skill name. "name-only" lists the skill without its description; "user-invocable-only" hides it from the model but keeps /name; "off" hides it from both. Absent = on.'),disableBundledSkills:H().optional().describe("Disable the skills and workflows that ship with Claude Code: bundled skills and workflows are removed entirely; built-in slash commands stay typable but are hidden from the model. Plugins, .claude/skills/, and .claude/commands/ are unaffected. Equivalent to CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1."),managedMcpServers:Oe(()=>fe(o().refine(eo,{
      error:"server names may only contain letters, numbers, hyphens and underscores, and may not be __proto__, constructor or prototype"
    }),to(),{
      error:no
    })).describe(`MCP servers the organization provides to every user, keyed by server name, each with the .mcp.json entry shape; only "http" and "sse" servers are accepted (nothing that names a program to run, no \${VAR} references). Honored from managed settings only; users cannot remove them, deniedMcpServers still applies, and they need no allowedMcpServers entry. Not read in Claude Desktop's Code tab on a third-party deployment or in Cowork sessions, where Claude Desktop supplies and locks the session's MCP servers itself.`),allowedMcpServers:Oe(()=>A(mn())).describe("Enterprise allowlist of the MCP servers users may use. Governs servers users add (user, project and local config, --mcp-config, agent frontmatter, plugins, claude.ai connectors); servers the organization itself delivers (managedMcpServers, and managed-mcp.json entries that use no ${VAR} expansion) are allowed without being listed; a managed-mcp.json entry that uses ${VAR} expansion is still checked against this list. If undefined, all servers are allowed. If empty array, users can use no servers of their own. Denylist takes precedence - if a server is on both lists, it is denied."),deniedMcpServers:Oe(()=>A(fn())).describe("Enterprise denylist of MCP servers that are explicitly blocked. If a server is on the denylist, it will be blocked across all scopes including enterprise. Denylist takes precedence over allowlist - if a server is on both lists, it is denied."),hooks:Oe(()=>g6()).describe("Custom commands to run before/after tool executions"),worktree:u({
      symlinkDirectories:A(o()).optional().describe('Directories to symlink from main repository to worktrees to avoid disk bloat. Must be explicitly configured - no directories are symlinked by default. Common examples: "node_modules", ".cache", ".bin"'),sparsePaths:A(o()).optional().describe("Directories to include when creating worktrees, via git sparse-checkout (cone mode). "+"Dramatically faster in large monorepos \u2014 only the listed paths are written to disk."),baseRef:G(["fresh","head"]).optional().describe("Which ref new worktrees branch from. 'fresh' (default) branches from origin/<default-branch> for a clean tree. 'head' branches from your current local HEAD so unpushed commits and feature-branch state are present. Applies to --worktree, EnterWorktree, and agent isolation."),bgIsolation:G(["worktree","none"]).optional().catch(void 0).describe("Isolation mode for background sessions in this repo. 'worktree' (default) blocks Edit/Write in the main checkout until EnterWorktree is called. 'none' lets background jobs edit the working copy directly."),location:o().optional().catch(void 0).describe("Directory under which Claude Code Desktop creates the worktrees of SSH sessions that run on this machine (an absolute path or one starting with ~/), instead of <project>/.claude/worktrees. Read by the desktop app from the SSH host user settings; a location chosen in the desktop app's SSH connection settings takes precedence. The CLI (--worktree, EnterWorktree, agent isolation) does not read it yet.")
    }).optional().describe("Git worktree configuration: the CLI --worktree flag, EnterWorktree and agent isolation, plus the location Claude Code Desktop uses for SSH-session worktrees on this machine."),disableAllHooks:H().optional().describe("Disable all hooks and statusLine execution: the hooks defined in settings files and by installed plugins. Features built into Claude Code are not hooks in this sense and keep working; each has its own switch."),disableAgentView:H().optional().describe("Disable agent view (`claude agents`, `--bg`, /background, the on-demand daemon). Typically set in managed settings. Equivalent to CLAUDE_CODE_DISABLE_AGENT_VIEW=1."),disableRemoteControl:H().optional().describe("Disable Remote Control (claude.ai/code, `claude remote-control`, `--remote-control`/`--rc`, auto-start, and the in-session toggle). Typically set in managed settings."),disableWorkflows:H().optional().describe("Disable the Workflows feature (also via CLAUDE_CODE_DISABLE_WORKFLOWS)."),disableArtifact:H().optional().describe("Deprecated: use enableArtifact: false. Still honored \u2014 true disables the Artifact tool; false is ignored."),enableArtifact:H().optional().describe("Turn the Artifact tool on or off. Off in any of managed, --settings, or user settings wins; project and local settings can only turn it off. Unset defaults to on once the feature is available."),enableWorkflows:H().optional().describe("Enable or disable the Workflows feature for this user. Unset = default by plan once the feature is available."),workflowSizeGuideline:G(["unrestricted","small","medium","large"]).optional().describe('Advisory size guideline for the dynamic workflows Claude writes: "small" aims for fewer than 5 agents, "medium" fewer than 10, "large" fewer than 50, and "unrestricted" sends no guideline. Unset defaults to "medium", or "small" on Pro plans. A value here \u2014 including from managed settings \u2014 takes precedence over the "Dynamic workflow size" choice in /config, and that /config row is hidden while a settings file provides the key. This is a guideline, not an enforced limit.'),workflowKeywordTriggerEnabled:H().optional().describe('Enable the "ultracode" keyword trigger: including the keyword in a prompt opts that turn into the Workflow tool. Set to false to disable the trigger. Default: true.'),disableSkillShellExecution:H().optional().describe("Disable inline shell execution in skills and custom slash commands from user, project, or plugin sources. Commands are replaced with a placeholder instead of being run."),defaultShell:G(["bash","powershell"]).optional().describe("Default shell for input-box ! commands. Defaults to 'bash' on all platforms (no Windows auto-flip)."),bashEditDiffEnabled:H().optional().describe("Whether the Bash tool shows a diff of the files a Bash command changed (PostToolUse Bash hooks get the changed-file list in tool_response). Set to false to turn that off. Default: on when the Bash tool handles file edits. Only user, flag or policy settings can turn it on outside auto and bypassPermissions modes."),bashOutputMaxChars:k().int().positive().optional().catch(void 0).describe("How many characters of a successful Bash or PowerShell command's output Claude receives inline (default 30000; values clamp to 4000-128000). Output past this is saved to a file and Claude receives a short preview plus the path. When set, this also replaces BASH_MAX_OUTPUT_LENGTH, which on its own only sizes the read-back window."),taskOutputMaxChars:k().int().positive().optional().catch(void 0).describe("Deprecated: no longer has any effect (the TaskOutput tool was removed). Read a background task's output file with the Read tool instead."),respondToBashCommands:H().optional().describe("Whether Claude responds after an input-box ! bash command runs. Set to false to add the command output to context without a response. Default: true."),allowManagedHooksOnly:H().optional().describe("When true (and set in managed settings), only hooks from managed settings and from plugins that managed settings enable run. User, project, and local hooks and the hooks of plugins the user installed are ignored. Features built into Claude Code are not hooks in this sense and keep working."),allowedHttpHookUrls:A(o()).optional().describe('Allowlist of URL patterns that HTTP hooks may target. Supports * as a wildcard (e.g. "https://hooks.example.com/*"). When set, HTTP hooks with non-matching URLs are blocked. If undefined, all URLs are allowed. If empty array, no HTTP hooks are allowed. Arrays merge across settings sources (same semantics as allowedMcpServers).'),httpHookAllowedEnvVars:A(o()).optional().describe("Allowlist of environment variable names HTTP hooks may interpolate into headers. When set, each hook's effective allowedEnvVars is the intersection with this list. If undefined, no restriction is applied. Arrays merge across settings sources (same semantics as allowedMcpServers)."),allowManagedPermissionRulesOnly:H().optional().describe("When true (and set in managed settings), permission rules from user, project, local, and --settings files and allow rules from --allowedTools are ignored; only managed settings can add allow rules through settings. The allowed-tools frontmatter of skills and custom commands from user, project, and --add-dir sources, and of plugins Claude Code adopts from a .claude-plugin manifest inside those skills directories, is ignored too; other plugins and managed and bundled skills keep theirs. --disallowedTools, skill disallowed-tools, and other deny and ask rules from the command line or the current session still apply."),allowManagedMcpServersOnly:H().optional().describe("When true (and set in managed settings), allowedMcpServers is only read from managed settings. deniedMcpServers still merges from all sources, so users can deny servers for themselves. Users can still add their own MCP servers, but only the admin-defined allowlist applies."),allowAllClaudeAiMcps:H().optional().describe("When true (and set in managed settings), claude.ai cloud MCP connectors load alongside managed-mcp.json instead of being suppressed by its exclusive-control lockdown. Default off preserves the lockdown. Read from managed settings only."),allowClaudeInChromeWithManagedMcp:H().optional().describe("When true (and set in device managed settings: MDM, the managed-settings.json file, or a policy helper those configure), the built-in Claude in Chrome MCP server can run alongside managed-mcp.json instead of being blocked by its exclusive-control lockdown. deniedMcpServers and the organization's Claude in Chrome setting still block it. Default off preserves the lockdown."),strictPluginOnlyCustomization:qi().optional().catch(void 0).describe('When set in managed settings, blocks non-plugin customization sources for the listed surfaces. Array form locks specific surfaces (e.g. ["skills", "hooks"]); `true` locks all four; `false` is an explicit no-op. Blocked: ~/.claude/{surface}/, .claude/{surface}/ (project), settings.json hooks, .mcp.json. NOT blocked: managed (policySettings) sources, plugin-provided customizations. '+"Composes with strictKnownMarketplaces for end-to-end admin control \u2014 plugins gated by "+"marketplace allowlist, everything else blocked here."),statusLine:u({
      type:R("command"),command:o(),padding:k().optional(),refreshInterval:k().min(1).optional().catch(void 0).describe("Re-run the status line command every N seconds in addition to event-driven updates"),hideVimModeIndicator:H().optional().describe("Hide the built-in `-- INSERT --` / `-- VISUAL --` indicator below the prompt. Use this when your status line script renders `vim.mode` itself.")
    }).optional().describe("Custom status line display configuration"),prUrlTemplate:o().optional().describe('URL template for PR links in the footer link badges and inline messages. The detected git PR is rendered as the first footer-link badge. Placeholders: {host} {owner} {repo} {number} {url}. Example: "https://reviews.example.com/{owner}/{repo}/pull/{number}"'),footerLinksRegexes:A(pg().catch(xi)).transform((d)=>d.filter((c)=>c!==xi)).optional().catch(void 0).describe("Extra clickable footer badges that appear when a regex matches turn output (tool results and assistant responses). Read from user, flag, and managed settings only; ignored in project .claude/settings.json and local .claude/settings.local.json. At most 5 badges render; the oldest is displaced by newer matches and /clear removes them. Use to surface IDs printed by project CLIs as session links."),subagentStatusLine:u({
      type:R("command"),command:o()
    }).optional().describe("Custom per-subagent status line shown in the agent panel; receives row context as JSON on stdin"),enabledPlugins:fe(o(),Fe([A(o()),H(),$ne()])).optional().describe('Enabled plugins using plugin-id@marketplace-id format. Example: { "formatter@anthropic-tools": true }. Also supports extended format with version constraints. Settings precedence is user < project < local < flag < policy, so to disable a plugin that project settings enable, set it to false in .claude/settings.local.json \u2014 setting false in ~/.claude/settings.json is overridden by the project.'),prependPlugins:A(o()).optional().catch(void 0).describe("Managed plugins (plugin@marketplace ids that managed enabledPlugins sets true) whose hooks run first, outermost, in the listed order: the first id listed sees every event before any other plugin and every result after it. Managed plugins not listed here or in appendPlugins follow the listed ones; user, project and marketplace plugins come after those; then appendPlugins; then the built-in plugins. The bundled sec-default@builtin seats itself outermost (on a machine with managed settings and for Team and Enterprise organizations) unless this list is set, in which case list sec-default@builtin where it should sit or leave it out. Any other id that is not an enabled managed plugin is skipped; an id listed in both keys is prepended. Only honored from managed settings (or, on a machine with none, from user settings for your own plugins); ignored in project, local and --settings sources."),appendPlugins:A(o()).optional().catch(void 0).describe("Managed plugins (plugin@marketplace ids that managed enabledPlugins sets true) whose hooks run last among plugins, innermost, in the listed order: the last id listed sits just above the built-in plugins and sees each event as every other plugin left it. Only honored from managed settings (or, on a machine with none, from user settings for your own plugins); ignored in project, local and --settings sources."),extraKnownMarketplaces:Oe(()=>s("extraKnownMarketplaces")).describe("Additional marketplaces to make available for this repository. Typically used in repository .claude/settings.json to ensure team members have required plugin sources."),additionalMarketplaces:Oe(()=>s("additionalMarketplaces")).describe("Alias for extraKnownMarketplaces: this key is read exactly as if it were spelled "+"extraKnownMarketplaces. Do not set both in one file \u2014 if both appear, this key is ignored "+"with a warning. Claude Code may rewrite this key as extraKnownMarketplaces when it updates the file. Clients older than this alias ignore it, so prefer extraKnownMarketplaces while older Claude Code versions still share the same settings."),strictKnownMarketplaces:Oe(()=>A(Dt())).describe('Enterprise strict list of allowed marketplace sources. When set in managed settings, ONLY these sources can be added as marketplaces. Entries match exactly, except that a github entry may use the owner-wildcard form {"source":"github","repo":"owner/*"} to allow every repository under that owner. The check happens BEFORE downloading, so blocked sources never touch the filesystem. '+"Note: this is a policy gate only \u2014 it does NOT register marketplaces. "+"To pre-register allowed marketplaces for users, also set extraKnownMarketplaces."),allowedMarketplaces:Oe(()=>A(Dt())).describe("Alias for strictKnownMarketplaces (managed settings only): this key is read exactly as if it "+"were spelled strictKnownMarketplaces. Do not set both in one file \u2014 if both appear, this key "+"is ignored with a warning. Clients older than this alias ignore it, so keep using strictKnownMarketplaces when the allowlist must also bind older Claude Code versions."),blockedMarketplaces:Oe(()=>A(Dt())).describe('Enterprise blocklist of marketplace sources. When set in managed settings, these sources are blocked from being added as marketplaces. Entries match exactly, except that a github entry may use the owner-wildcard form {"source":"github","repo":"owner/*"} to block every repository under that owner. The check happens BEFORE downloading, so blocked sources never touch the filesystem.'),disableCommandPluginSources:H().optional().describe("Controls the `command` plugin source, whose plugin directory is produced by running a marketplace-declared command on this machine. true: command-sourced plugins are never installed, updated, or re-resolved (the command never runs). false: explicitly allowed. "+"Unset: follows allowManagedHooksOnly \u2014 an org that restricts hook execution to managed "+"settings gets command sources disabled too. Only honored from managed settings."),...!1,disableSideloadFlags:H().optional().describe("When true (and set in managed settings), rejects the --plugin-dir, --plugin-url, --agents, and non-sdk --mcp-config CLI flags at startup. Closes the CLI-flag bypass of strictKnownMarketplaces. Pair with allowedMcpServers for per-server MCP control; this setting does not gate other MCP entry points (SDK setMcpServers, claude mcp add, .mcp.json). Also blocks surfaces that spawn the CLI with these flags internally (see settings documentation). Only honored from managed settings; ignored in user/project/local settings."),pluginSuggestionMarketplaces:A(o()).optional().describe("Marketplace names whose plugins may surface as contextual install suggestions (relevance-based tips). No marketplace-declared suggestions surface without this allowlist; the built-in first-party frontend-design tip is unaffected. Only honored when set in managed settings (policy scope); the key is ignored in user, project, and local settings. A name only takes effect when the marketplace is registered on the machine AND its registered source is also declared in managed settings, either as the extraKnownMarketplaces entry for that name or as an entry of strictKnownMarketplaces. A marketplace registered from a different source under an allowlisted name is ignored. The official marketplace is exempt from the source requirement: allowlisting its name alone suffices, since that name can only register from the official Anthropic source."),forceLoginMethod:G(["claudeai","console","gateway"]).optional().catch(void 0).describe('Force a specific login method: "claudeai" for Claude Pro/Max, "console" for Console billing, "gateway" for the Cloud gateway OIDC device flow'),forceLoginGatewayUrl:o().min(1).optional().catch(void 0).describe('Cloud gateway URL to pre-fill and auto-connect to during login, alongside forceLoginMethod: "gateway". Honored only from admin-controlled managed settings (MDM / managed-settings.json / policy helper); ignored in user, project, and remote-delivered settings.'),gatewayInternalNetworks:A(o()).optional().catch([R5n]).meta({
      default:void 0
    }).describe("IPv4 CIDR blocks (at most 4, each /8 to /32, not overlapping) your Cloud gateway sits in: the public block your organization numbers its internal network from, which lets /login reach a gateway there. A block must lie entirely outside private space, where /login accepts a gateway without this key. /login accepts a gateway inside a listed block over a direct connection only, and only when this machine's own address on that connection is inside the same block, so /login must happen from a machine whose own address is inside the block (not through a proxy, VPN pool, container or NAT segment outside it). A bar against copied settings files, not proof of location. Honored only from admin-controlled managed settings (MDM / managed-settings.json / policy helper); ignored in user, project, and remote-delivered settings."),parentSettingsBehavior:G(["first-wins","merge"]).optional().describe(`Controls whether the SDK parent tier (Options.managedSettings / --managed-settings) layers under this admin tier. "first-wins" (the default, except in a gateway session Claude Desktop's Code `+'tab launched, where "merge" is): parent is dropped \u2014 admin tiers '+`are the only policy source. "merge": parent's restrictive-only-filtered settings union under the admin winner. Has no effect when no admin tier exists (parent applies as the sole policy tier, still filtered restrictive-only).`),managedSourcesBehavior:G(["first-wins","merge"]).optional().describe('Controls how the managed settings sources compose. "first-wins" (default): the highest-priority source present (server-managed > MDM (managed plist / HKLM) > managed-settings.json) is the managed tier alone. "merge": every present source deep-merges with fixed '+"precedence server-managed > MDM > managed-settings.json \u2014 scalars "+"take the highest source's value (a restrictive boolean or enum \u2014 "+"the allowManaged*Only locks, the disable* switches, the sandbox "+"lock family \u2014 takes the strictest value any source sets) and "+"arrays union, except fallbackModel, the restriction allowlists allowedMcpServers, availableModels, strictKnownMarketplaces and allowedChannelPlugins, and sandbox.credentials.awsPairs and sandbox.ripgrep (the highest source that sets one owns it whole), modelOverrides (the whole map of the highest source that sets it, dropped when that source sits below the one that sets availableModels), managedMcpServers (server names union; a name set by two sources takes the higher source's whole entry), and the keys taken from the highest source only: the auth pins forceLoginOrgUUID, forceLoginMethod, forceLoginGatewayUrl and gatewayInternalNetworks, the credential helpers apiKeyHelper, awsAuthRefresh, awsCredentialExport, gcpAuthRefresh, otelHeadersHelper and proxyAuthHelper, modelPicker, permissions.defaultMode, parentSettingsBehavior and the policyHelper configuration (env keeps its own per-key union). Honored only from the highest-priority source present; enable it only when every lower source is admin-controlled, since lower sources then contribute entries such as permissions.allow. HKCU and --managed-settings never take part in the merge."),forceLoginOrgUUID:Fe([o(),A(o())]).optional().describe("Organization UUID to require for OAuth login. Accepts a single UUID string or an array of UUIDs (any one is permitted). When set in managed settings, login fails if the authenticated account does not belong to a listed organization."),forceRemoteSettingsRefresh:H().optional().describe("When set in managed settings, the CLI blocks startup until remote managed settings are freshly fetched, and exits if the fetch fails"),otelHeadersHelper:o().optional().describe("Path to a script that outputs OpenTelemetry headers"),outputStyle:o().optional().describe("Controls the output style for assistant responses"),viewMode:G(["default","verbose","focus"]).optional().catch(void 0).describe("Default transcript view mode on startup"),language:o().optional().describe('Preferred language for Claude responses and voice dictation (e.g., "japanese", "spanish")'),skipWebFetchPreflight:H().optional().describe("Skip the WebFetch blocklist check for enterprise environments with restrictive security policies"),sandbox:Oe(()=>pmn()),...!1,feedbackSurveyRate:k().min(0).max(1).optional().describe("Probability (0\u20131) that the session quality survey appears when eligible. 0.05 is a reasonable starting point."),feedbackDrafts:G(["notify","quiet","off"]).optional().describe('Model-drafted feedback (the SendFeedback tool). "notify" (default) shows a one-line notice when a draft is queued; "quiet" shows only the footer counter; "off" disables the tool entirely so drafts are never queued.'),spinnerTipsEnabled:H().optional().describe("Whether to show tips in the spinner"),spinnerVerbs:u({
      mode:G(["append","replace"]),verbs:A(o())
    }).optional().describe('Customize spinner verbs. mode: "append" adds verbs to defaults, "replace" uses only your verbs.'),spinnerTipsOverride:u({
      excludeDefault:H().optional().catch(void 0),tips:T1r().optional(),tipsFile:o().optional().catch(void 0).describe("Absolute or ~/ local path to a JSON file holding an array of tips (same shapes as `tips`); honored from user, --settings and on-disk managed settings only. Read once per CLI process (restart to pick up edits)."),label:o().optional().catch(void 0).describe('Prefix shown before your tips in the spinner (default "Tip")')
    }).passthrough().optional().catch(void 0).describe("Add your organization's own tips to the spinner tip rotation. tips: strings or {id, text, cooldownSessions?, priority?} objects; tipsFile: a JSON file of the same; label: prefix shown before your tips; excludeDefault: if true, only show your tips (default: false)."),syntaxHighlightingDisabled:H().optional().describe("Whether to disable syntax highlighting in diffs"),maxProseWidth:k().int().min(40).optional().catch(void 0).describe("Maximum width, in terminal columns, of the prose in Claude's responses (paragraphs, headings, lists, blockquotes). In a wider terminal the prose wraps at this width while tables and code blocks keep the full width; only the display wraps, the response text itself gains no line breaks. Minimum 40. Unset (the default) uses the full terminal width."),spellcheck:u({
      enabled:H().optional().catch(void 0).describe("Turn on spell checking of the prompt input (default: false)"),checker:o().optional().catch(void 0).describe(`Which spell checker to run: ${IRe.map((d)=>`"${d}"`).join(", ")}, or "auto" (default) for the first of those found on PATH`),language:o().optional().catch(void 0).describe(`Dictionary to use, passed to the checker as-is (aspell --lang, hunspell -d, ispell -d), e.g. "en_GB"; names are checker-specific (letters, digits and _ - . , only). Default: the checker's own default`),color:o().optional().catch(void 0).describe(`Color of misspelled words (they are also underlined): a terminal color name such as "red" or "magenta", "#rrggbb", "rgb(r,g,b)", "ansi256(n)" or "ansi:<name>". Default: the theme's error color`)
    }).passthrough().optional().catch(void 0).describe(`Underline misspelled words in the prompt input as you type, using an installed ${IRe.slice(0,-1).join(", ")} or ${IRe.at(-1)} (off unless "enabled" is true; does nothing if none is installed). Read from user, flag and managed settings only (the whole block from the highest-precedence of those applies); ignored in project .claude/settings.json and .claude/settings.local.json.`),terminalTitleFromRename:H().optional().describe("Whether /rename updates the terminal tab title (defaults to true). Set to false to keep auto-generated topic titles."),promptCacheTtl:G(sBe).optional().catch(void 0).describe('Prompt cache TTL for the main conversation (interactive, -p and SDK turns, plus the helpers that run inline with it): "5m" or "1h". Unset = automatic: 1 hour on a Claude subscription within its usage limits, 5 minutes on an API key, Bedrock, Vertex or Foundry. 1-hour cache writes are billed at a higher rate; the cache stays warm across longer breaks. The CLAUDE_CODE_PROMPT_CACHE_TTL environment variable takes precedence.'),subagentPromptCacheTtl:G(sBe).optional().catch(void 0).describe("Prompt cache TTL for everything outside the main conversation \u2014 subagents, workflows, background and helper requests: "+'"5m" or "1h". Unset = automatic (5 minutes unless ENABLE_PROMPT_CACHING_1H=1). The CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL environment variable takes precedence.'),alwaysThinkingEnabled:H().optional().describe("When false, thinking is disabled. When absent or true, thinking is enabled automatically for supported models."),effortLevel:G(["low","medium","high","xhigh"]).optional().catch(void 0).describe("Persisted effort level for supported models."),maxEffortLevel:G(wd).optional().catch(void 0).describe("Maximum effort level. Anything above it (an /effort or /model pick, --effort, CLAUDE_CODE_EFFORT_LEVEL, a model default) is clamped to it, on every provider including Bedrock, Vertex and Foundry. Combines with an organization's per-model effort cap by taking the lower of the two; across settings files the lowest value wins, and modelSettings.<model>.maxEffortLevel replaces it per model. Enforced client-side: an effort supplied through CLAUDE_CODE_EXTRA_BODY is not clamped."),modelSettings:Bi((d)=>typeof d==="object"&&d!==null&&!Array.isArray(d)?pa(d,(c,p)=>Object.hasOwn(Object.prototype,p)):d,fe(o(),u({
      effortLevel:G(["low","medium","high","xhigh"]).optional().catch(void 0).describe("Persisted effort level for this model."),maxEffortLevel:G(wd).optional().catch(void 0).describe('Maximum effort level for this model. Within one settings file it replaces the top-level maxEffortLevel for the model ("max" exempts it); across settings files the lowest applicable value wins. Keyed like effortLevel: the canonical model name also matches its dated, [1m], Bedrock and Vertex spellings.')
    }).passthrough().optional().catch(void 0))).optional().catch(void 0).describe("Per-model settings keyed by canonical model name."),ultracode:H().optional().catch(void 0).describe("Enable ultracode for the session: xhigh effort plus standing dynamic-workflow orchestration. "+"Session-scoped \u2014 typically provided via --settings or the apply_flag_settings control request; "+"interactive toggles never persist it. Requires workflows to be enabled and an xhigh-capable model."),autoCompactWindow:gg().describe("Auto-compact window size"),...!1,advisorModel:o().optional().describe("Advisor model for the server-side advisor tool."),fastMode:H().optional().describe("When true, fast mode is enabled. When absent or false, fast mode is off."),fastModePerSessionOptIn:H().optional().describe("When true, fast mode does not persist across sessions. Each session starts with fast mode off."),promptSuggestionEnabled:H().optional().describe("When false, prompt suggestions are disabled. When absent or true, prompt suggestions are enabled."),emojiCompletionEnabled:H().optional().describe("When false, the :emoji: shortcode typeahead (the suggestion popup and the :name: inline replacement) is disabled. When absent or true, it is enabled."),awaySummaryEnabled:H().optional().describe("@internal When false, the session recap (shown when you return after being away for 5+ minutes) is disabled. When absent or true, recap is enabled. Hidden from public SDK types until external launch."),showClearContextOnPlanAccept:H().optional().describe('When true, the plan-approval dialog offers a "clear context" option. Defaults to false.'),askUserQuestionTimeout:G(["60s","5m","10m","never"]).optional().catch(void 0).describe("Idle time before Claude's questions auto-continue with any answers "+"selected so far. Defaults to never \u2014 auto-continue only runs "+"when explicitly set to 60s/5m/10m."),dialogExpiry:G(["60s","5m","10m","never"]).optional().catch(void 0).describe('Max time a permission/user dialog forwarded to a remote client stays parked awaiting an answer, and how long a HELD cross-session message awaits approval, before either resolves to its safe no-action default (cancelled / dropped-with-denial). Defaults to 5m to match the long-standing remote-dialog deadline; "never" disables the deadline. Local-only permission prompts (no remote client) are unaffected. The CLAUDE_CODE_USER_DIALOG_TIMEOUT_MS env var, when set, overrides this. Read from trusted sources only (never a checked-in repo settings file).'),agent:o().optional().describe("Name of an agent (built-in or custom) to use for the main thread. Applies the agent's system prompt, tool restrictions, and model."),modelProposedGoals:G(GUt).optional().catch(void 0).describe("@internal Controls the ProposeGoal tool (model-proposed session goals). 'auto' (the default when absent) lets the model choose per proposal whether to ask for approval via its ask_user parameter; 'alwaysAsk' routes every model-proposed goal through the approval dialog; 'disabled' turns the tool off. A typed /goal is unaffected. Consent-affecting, so it is read "+"from trusted sources only (user/policy/flag) \u2014 "+"workspace-resident project and local settings are ignored."),companyAnnouncements:A(o()).optional().describe("Company announcements to display at startup (one will be randomly selected if multiple are provided)"),pluginConfigs:fe(o(),u({
      mcpServers:fe(o(),fe(o(),Fe([o(),k(),H(),A(o())]))).optional().describe("User configuration values for MCP servers keyed by server name"),options:fe(o(),Fe([o(),k(),H(),A(o())])).optional().describe("Non-sensitive option values from plugin manifest userConfig, keyed by option name. Sensitive values go to secure storage instead.")
    }).or($ne())).optional().describe("Per-plugin configuration including MCP server user configs, keyed by plugin ID (plugin@marketplace format)"),remote:u({
      defaultEnvironmentId:o().optional().describe("Default environment ID to use for cloud sessions")
    }).optional().describe("Cloud session configuration"),autoUpdatesChannel:G(["latest","stable","rc"]).optional().describe("Release channel for auto-updates (latest or stable)"),minimumVersion:o().optional().describe("Minimum version to stay on - prevents downgrades when switching to stable channel"),requiredMinimumVersion:o().optional().describe("Minimum Claude Code version required to start. If the running version is older, Claude Code exits at startup with instructions to update. Only enforced from managed (policy) settings."),requiredMaximumVersion:o().optional().describe("Maximum Claude Code version allowed to start. If the running version is newer, Claude Code exits at startup with instructions to install an approved version. Only enforced from managed (policy) settings."),plansDirectory:o().optional().describe("Custom directory for plan files, relative to project root. If not set, defaults to ~/.claude/plans/"),tui:G(["default","fullscreen"]).optional().describe('Terminal UI renderer. "fullscreen" uses the flicker-free alt-screen renderer with virtualized scrollback (equivalent to CLAUDE_CODE_NO_FLICKER=1). "default" uses the classic main-screen renderer.'),...!1,voice:u({
      enabled:H().optional(),mode:G(["hold","tap"]).optional().describe("'hold' (default): hold to talk. 'tap': tap to start, tap to stop+submit."),autoSubmit:H().optional().describe("Submit the prompt when hold-to-talk is released (hold mode only)")
    }).optional().describe("Voice mode settings (hold-to-talk / tap-to-toggle dictation)"),channelsEnabled:H().optional().describe("Managed-org opt-in for channel notifications (MCP servers with the claude/channel capability pushing inbound messages). claude.ai Teams/Enterprise: default off. Console: default on unless managed settings exist. Set true to allow; users then select servers via --channels."),allowedChannelPlugins:A(Ki()).optional().describe("Managed-org allowlist of channel plugins. When set, "+"replaces the default Anthropic allowlist \u2014 admins decide which "+"plugins may push inbound messages. Undefined falls back to the default. Requires channelsEnabled: true."),prefersReducedMotion:H().optional().describe("Reduce or disable animations for accessibility (spinner shimmer, flash effects, etc.)"),timeFormat:Fe([G(hUe),o()]).optional().describe('Clock format for times shown in the UI: "auto" (default, follows the locale), "12-hour", "24-hour", "24-hour-utc" ("18:05Z"), or a strftime pattern such as "%H:%M" (any value containing "%"; other values read as "auto"). A pattern replaces the time everywhere; message timestamps show only the pattern, so include %Y-%m-%d for the date. /config offers the presets; a pattern is set here.'),timeZone:o().optional().describe('IANA time zone for times shown in the UI, e.g. "UTC" or "Europe/Dublin". Default: the system time zone. An unknown name falls back to the system time zone.'),doneMeansMerged:H().optional().describe("@internal When true, Claude keeps working until the PR is ready for you to merge, a cron/Monitor is armed to resume later, or it hands you a self-contained next step."),totalTokensReminder:G(["off","infinite","fixed","countdown","padded-countdown"]).optional().describe("@internal Emit a <total_tokens>N tokens left</total_tokens> block in the system prompt, after each tool result, and (when totalTokensReminderAfterUserTurn is on) after each regular user prompt. 'infinite' uses the literal value Infinite, 'fixed' uses 5000000, 'countdown' uses the live remaining context-window tokens, 'padded-countdown' counts down from totalTokensReminderBudget (re-anchoring to the full budget on each regular user prompt when totalTokensReminderAfterUserTurn "+"is on \u2014 task-budget semantics). Defaults to padded-countdown. "+"Env var CLAUDE_CODE_TOTAL_TOKENS_REMINDER overrides."),totalTokensReminderBudget:k().int().positive().optional().describe("@internal Starting budget (tokens) for totalTokensReminder 'padded-countdown' mode. Defaults to 15000000. Server-controlled via GrowthBook; env var CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET overrides."),totalTokensReminderAfterUserTurn:H().optional().describe("@internal When true, emit the totalTokensReminder block after each regular user prompt and (for 'padded-countdown') re-anchor the task budget to the full configured value at the start of each user turn. When false, the reminder appears only in the system prompt and after each tool-result batch, and 'padded-countdown' counts down over the whole session. Defaults to on. Env var CLAUDE_CODE_TOTAL_TOKENS_REMINDER_AFTER_USER_TURN overrides; server-controlled via GrowthBook tengu_lapis_anchor_user_turn."),autoMemoryEnabled:H().optional().describe("Enable auto-memory for this project. When false, Claude will not read from or write to the auto-memory directory."),autoMemoryDirectory:o().optional().describe("Custom directory path for auto-memory storage. Supports ~/ prefix for home directory expansion. Ignored if set in projectSettings (checked-in .claude/settings.json) for security. When unset, defaults to ~/.claude/projects/<sanitized-cwd>/memory/."),autoDreamEnabled:H().optional().describe("Enable background memory consolidation (auto-dream). When set, overrides the server-side default."),showThinkingSummaries:H().optional().describe("Request API-side thinking summaries and show them in the conversation and in the transcript view (ctrl+o). Set explicitly to override the default for your install."),skipDangerousModePermissionPrompt:H().optional().describe("Whether the user has accepted the bypass permissions mode dialog"),skipWorkflowUsageWarning:H().optional().describe("@internal Whether the user has accepted the multi-agent workflow usage warning. Until set, auto permission mode prompts before running a workflow."),disableAutoMode:G(["disable"]).optional().describe("Disable auto mode"),remoteTools:u({
      allowUnattendedServing:H().optional().describe("@internal When false in managed or user settings, a cloud session in auto mode may not run commands on this computer without a person approving each one, whatever consent the computer has given; a project, local or --settings value is ignored. Default: true.")
    }).optional().describe("@internal How this computer serves tool calls to cloud sessions"),sshConfigs:A(u({
      id:o().describe("Unique identifier for this SSH config. Used to match configs across settings sources."),name:o().describe("Display name for the SSH connection"),sshHost:o().describe('SSH host in format "user@hostname" or "hostname", or a host alias from ~/.ssh/config'),sshPort:k().int().optional().describe("SSH port (default: 22)"),sshIdentityFile:o().optional().describe("Path to SSH identity file (private key)"),startDirectory:o().optional().describe("Default working directory on the remote host. Supports tilde expansion (e.g. ~/projects). If not specified, defaults to the remote user home directory. Can be overridden by the [dir] positional argument in `claude ssh <config> [dir]`.")
    })).optional().describe("SSH connection configurations for remote environments. Typically set in managed settings by enterprise administrators to pre-configure SSH connections for team members."),claudeMd:o().optional().describe("CLAUDE.md-style instructions injected as organization-managed memory. Only honored from managed/policy settings."),claudeMdExcludes:A(o()).optional().describe('Glob patterns or absolute paths of CLAUDE.md files to exclude from loading. Patterns are matched against absolute file paths using picomatch. Only applies to User, Project, and Local memory types (Managed/policy files cannot be excluded). Examples: "/home/user/monorepo/CLAUDE.md", "**/code/CLAUDE.md", "**/some-dir/.claude/rules/**"'),pluginTrustMessage:o().optional().describe('Custom message to append to the plugin trust warning shown before installation. Only read from policy settings (managed-settings.json / MDM). Useful for enterprise administrators to add organization-specific context (e.g., "All plugins from our internal marketplace are vetted and approved.").'),theme:Fe([G(v8e),o().startsWith("custom:").transform((d)=>d)]).optional().catch(void 0).describe("Color theme for the UI"),editorMode:G(Tjr).optional().catch(void 0).describe("Key binding mode for the prompt input"),keybindingFlavor:G(["classic","readline"]).optional().catch(void 0).describe("Deprecated: no longer has any effect. The prompt's word-editing keys always follow Bash (readline) conventions."),vimInsertModeRemaps:fe(o(),ae()).optional().catch(void 0).describe('Vim INSERT-mode key-sequence remaps, e.g. {"jj": "<Esc>"}. Each key is exactly two printable characters typed in sequence; "<Esc>" (return to NORMAL mode) is the only supported target. Applies when editorMode is "vim".'),verbose:H().optional().describe("Show full tool output instead of truncated summaries"),preferredNotifChannel:G(xJ).optional().catch(void 0).describe("Preferred OS notification channel"),autoCompactEnabled:H().optional().describe("Automatically compact conversation when context fills"),precomputeCompactionEnabled:H().optional().describe("Precompute the compaction summary in the background before it is needed. Only applies when auto-compact is on."),switchModelsOnFlag:H().optional().describe("When safeguards flag a message, automatically switch to a different model to keep chatting. When off, your session will pause instead."),autoContinueAtUsageLimit:H().optional().describe("When a claude.ai usage limit stops your session, wait for the limit to reset and continue the task automatically. When off, the limit dialog offers the wait as a choice instead."),autoScrollEnabled:H().optional().describe("Auto-scroll the conversation view to bottom (fullscreen mode only)"),wheelScrollAccelerationEnabled:H().optional().describe("Ramp mouse-wheel scroll speed during fast scrolls (fullscreen mode only)"),fileCheckpointingEnabled:H().optional().describe("Snapshot files before edits so /rewind can restore them"),showTurnDuration:H().optional().describe('Show "Cooked for Nm Ns" after each assistant turn'),showMessageTimestamps:H().optional().describe("Stamp each message with its arrival time"),terminalProgressBarEnabled:H().optional().describe("Emit OSC 9;4 progress sequences during long operations"),todoFeatureEnabled:H().optional().describe("Enable the todo / task tracking panel"),teammateMode:G(O$o).optional().catch(void 0).describe("How spawned teammates execute (tmux, iterm2, in-process, auto)"),remoteControlAtStartup:H().optional().describe("Start Remote Control bridge automatically each session"),remoteControl:u({
      shareHostProfile:G(oUe).optional().catch(void 0).describe("@internal What a Remote Control environment reports about this machine when it registers: 'off' reports nothing, 'basic' the OS, architecture and detected developer tools, 'full' also the names of MCP servers configured on this machine (never a repository's .mcp.json). When unset, the level comes from the feature rollout, which may be any of the three. Managed, --settings and user settings choose the level (the most restrictive wins); project and local settings can only lower it, never raise it. Read when Remote Control starts; lowering it later applies from the next registration, raising it from the next start.")
    }).optional().describe("@internal Remote Control (`claude remote-control`) options"),isolatePeerMachines:H().optional().describe("Require explicit approval before SendMessage can reach a peer session on another machine via Remote Control"),daemonColdStart:G(["transient","ask"]).optional().describe("When no background service is running: 'transient' spawns one for this login session; 'ask' offers to install it persistently"),crossSessionInbound:G(tft).optional().catch(void 0).describe("Inbound cross-session peer messages (SendMessage from your other sessions): 'accept' delivers them, 'hold' parks them for your review without letting Claude act, 'refuse' opts this session out. An explicit value always wins. Unset (mode parity): a message auto-delivers only when the sending session's permission-mode class matches yours (bypass\u2194bypass or prompting\u2194prompting); a mismatched sender's message is held for your approval; a sender that asserts no class is held only while this session bypasses permission prompts."),autoUploadSessions:H().optional().describe("Mirror local sessions to claude.ai as view-only (no remote control)"),inputNeededNotifEnabled:H().optional().describe("Push to mobile when a permission prompt or question is waiting"),agentPushNotifEnabled:H().optional().describe("Allow Claude to push proactive mobile notifications"),...bi(e)
  }).passthrough()
}var Xb=f(()=>nft(u8e())),Di=Object.freeze({
  serverName:"invalid-entry-stripped"
});
function Zi(e){
  for(let n of e){
    let s=n.path.length>0?`${n.path.map(String).join(".")}: `:"";
    if(n.code==="invalid_union"){
      for(let r of n.errors){
        let i=Zi(r);
        if(i!==null)return`${s}${i}`
      }if("note"in n&&typeof n.note==="string"&&n.note!=="")return`${s}${n.note}`
    }if(n.message!=="")return`${s}${n.message}`
  }return null
}var Zo=f(()=>{
  let e=Xb().shape;return Qe().flatMap(({
    path:n,restrictive:s
  })=>{
    if(n.length!==1||n[0]==="strictPluginOnlyCustomization"||n[0]==="disableAllHooks"||typeof s!=="boolean"&&typeof s!=="string")return[];let r=n[0],i=e[r];if(i===void 0||i instanceof d6n)return[];return[{
      key:r,restrictive:s,field:i
    }]
  })
}),hn=f(()=>["strictKnownMarketplaces","blockedMarketplaces","strictPluginOnlyCustomization",...Zo().map((e)=>e.key)]),lt=["managedSourcesBehavior","wslInheritsWindowsSettings"];
function Lt(e){
  return z(e)&&Object.values(e).every(Lt)
}function D1r(e){
  let n=e.wslInheritsWindowsSettings;
  if(n===void 0||n===null)return"disarmed";
  let s=Bx(n);
  return s===!0?"armed":s===!1?"disarmed":"unreadable"
}function yn(e){
  let n=e.source==="hostPattern"?e.hostPattern:e.source==="pathPattern"?e.pathPattern:null;
  if(n!==null&&!Bmn(n))return`${e.source}: regex does not compile; the entry cannot be enforced`;
  if(e.source==="github"&&e.repo.includes("*")&&Wmn(e.repo)===null)return'github: an owner wildcard must be exactly "<owner>/*"; the entry cannot be enforced';
  if(e.source==="git"&&fi(e.url))return'git: wildcards are only supported in github-form entries, as "<owner>/*"; the entry cannot be enforced';
  if((e.source==="github"||e.source==="git")&&e.ref!==void 0&&e.ref.includes("*"))return`${e.source}: ref contains "*", which git does not allow in ref names; the entry cannot be enforced`;
  return null
}function Mi(e,n){
  return Fe([df().transform(()=>{
    return
  }),A(ae()).transform((s)=>{
    let r=[];for(let[i,d]of s.entries()){
      let c=Dt().safeParse(d);if(c.success){
        let p=yn(c.data);if(p!==null){
          if(e==="blockedMarketplaces")n({
            path:`${e}[${i}]`,message:`Unenforceable entry was kept: ${p}; it can never match a marketplace source, but marketplace restrictions stay active`
          }),r.push(c.data);else n({
            path:`${e}[${i}]`,message:`Invalid entry was ignored: ${p}`
          });continue
        }r.push(c.data)
      }else n({
        path:`${e}[${i}]`,message:`Invalid entry was ignored: ${Zi(c.error.issues)??"failed validation"}`
      })
    }if(e==="blockedMarketplaces"&&s.length>0&&r.length===0)n({
      path:e,message:'Every entry of "blockedMarketplaces" was invalid; none of them can be enforced until it is fixed.'
    });return r
  })]).optional()
}function Ii(e,n,s){
  return A(n.catch((r)=>(s({
    path:`${e}[]`,message:`Invalid entry was ignored: ${r.issues[0]?.message??"failed validation"}`
  }),Di))).transform((r)=>r.filter((i)=>i!==Di)).optional()
}var R5n="(unreadable)";
function No(e,n,s,r,i){
  return A(ae()).transform((d)=>{
    let c=[];for(let[p,g]of d.entries()){
      let h=n.safeParse(g);if(h.success){
        c.push(h.data);let m=i?.(g,h.data);if(m!==void 0)s({
          path:`${e}[${p}]`,message:m,statusOnly:!0
        })
      }else{
        let m=h.error.issues[0],S=m===void 0?"failed validation":m.path.length?`${m.path.join(".")}: ${m.message}`:m.message;s({
          path:`${e}[${p}]`,message:`Invalid entry was ignored: ${S}`
        })
      }
    }if(d.length>0&&c.length===0)s({
      path:e,message:`Every entry of "${e}" was invalid; enforcing an empty allowlist (${r}) until it is fixed.`
    });return c
  }).optional().catch(()=>(s({
    path:e,message:`"${e}" was present but invalid; enforcing an empty allowlist (${r}) until it is fixed.`
  }),[]))
}var ft=f(()=>new Map(Qe().flatMap(({
  path:e,restrictive:n
})=>e.length>1?[[e.join("."),st(n)[0]]]:[]))),mg=new Map([["permissions",{
  restrictions:["deny","ask"],grants:["allow","additionalDirectories","defaultMode"]
}],["autoMode",{
  restrictions:["soft_deny","hard_deny","deny"],grants:["allow","environment"],withholdOnEntryDrop:!0
}],["sandbox.network",{
  restrictions:["deniedDomains"],grants:["allowedDomains"],withholdOnEntryDrop:!0
}],["sandbox.filesystem",{
  restrictions:["denyWrite","denyRead"],grants:["allowWrite","allowRead"],withholdOnEntryDrop:!0
}]]),_n=new Map([["permissions.defaultMode",{
  read:(e)=>{
    let n=Dm(e);return[...NL,...xo(u8e())].find((s)=>s===n)
  },inert:new Set(["default","dontAsk","plan"]),floor:"default"
}]]);
function Qo(e,n,s,r){
  let i=[],d=mg.get(e);
  if(d===void 0)return i;
  let c=d.restrictions.flatMap((g)=>{
    switch(s(g)){
      case"unreadable":return[`"${g}"`];case"trimmed":return d.withholdOnEntryDrop?[`an entry of "${g}"`]:[];case void 0:return[]
    }
  });
  if(c.length===0)return i;
  let p=c.join(" and ");
  for(let g of d.grants){
    let h=_n.get(`${e}.${g}`),m=h===void 0?n[g]:h.read(n[g]);
    if(m===void 0||h?.inert.has(m)===!0)continue;
    if(h===void 0)delete n[g];
    else n[g]=h.floor,i.push(g);
    r({
      path:`${e}.${g}`,message:h===void 0?`"${g}" was withheld because ${p} in the same block could not be read; it takes effect again once that is fixed.`:`"${g}" was withheld because ${p} in the same block could not be read; treating it as ${It(h.floor)} until that is fixed.`,...h!==void 0&&{
        substituted:!0
      }
    })
  }return i
}function gn(e){
  for(let n of ft().keys())if(n.startsWith(`${e}.`))return!0;
  return!1
}function Sn(e){
  return e!=="sandbox.credentials"&&!e.startsWith("sandbox.credentials.")&&gn(e)
}function es(e){
  let n=e;
  while(n instanceof c6n||n instanceof Do||n instanceof xgn)n=n instanceof xgn?n.out:n.unwrap();
  return n instanceof o_e?n:void 0
}var Li=new Set(["remoteTools","remoteControl"]);
function Qi(e,n){
  return typeof n==="object"&&n!==null&&e.has(n)
}function ea(e,n,s){
  let r={
  };
  for(let[i,d]of Object.entries(n.shape)){
    let c=`${e}.${i}`;
    if(s?.has(c))continue;
    let p=ft().get(c),g=es(d);
    if(p!==void 0)r[i]=p;
    else if(g!==void 0&&gn(c))r[i]=ea(c,g,s)
  }return r
}function Ni(e,n){
  return{
    path:e,message:`"${n}" was null, which is read as key removal; this source does not set it.`,statusOnly:!0,removal:!0
  }
}function It(e){
  return typeof e==="string"?`"${e}"`:String(e)
}function Mt(e,n=0){
  let s=e===void 0||e.input===void 0?"failed validation":e.code==="custom"&&e.message!==void 0?e.message:("expected"in e)&&typeof e.expected==="string"?`expected ${e.expected}`:("values"in e)&&Array.isArray(e.values)?`expected ${e.values.map(It).join(" or ")}`:"failed validation",r=(e?.path??[]).slice(n);
  if(r.length===0)return s;
  return r.every((i)=>typeof i==="number")?`${r.join(".")}: ${s}`:`nested value: ${s}`
}function ta(e){
  return e===!1||e==="false"
}function ts(e,n){
  if(n===null)return!0;
  return(e.includes(".")?ft().get(e):Zo().find((r)=>r.key===e)?.restrictive)==="disable"&&ta(n)
}function Ho(e,n,s,r){
  let i=e.slice(e.lastIndexOf(".")+1);
  if(typeof n==="boolean")return Bi((d)=>{
    let c=Bx(d);if(c!==d)r({
      path:e,message:`"${i}" holds the string "${String(c)}" where a boolean belongs; reading it as ${String(c)}. Write it without quotes.`,statusOnly:!0
    });return c
  },s);
  if(n==="disable")return Bi((d)=>{
    if(ta(d)){
      r({
        path:e,message:`"${i}" was set to false; reading it as absent (the key's only value is "disable"). Remove the key instead.`,statusOnly:!0,removal:!0
      });return
    }return d
  },s);
  return s
}function fg(e,n,s,r,i,d,c){
  let p=e.slice(e.lastIndexOf(".")+1),g=ft().get(e),h=c?void 0:g,m=_n.get(e),S=n instanceof d6n?n.unwrap():void 0,y=S instanceof Qb?S:n;
  return Ho(e,g,y,s).catch((C)=>{
    if(h!==void 0)return s({
      path:e,message:`"${p}" was present but invalid (${Mt(C.issues[0])}); treating it as ${It(h)}, its restrictive value, until it is fixed.`,substituted:!0
    }),r.add(p),h;if(m!==void 0)return s({
      path:e,message:`"${p}" was present but invalid (${Mt(C.issues[0])}); treating it as ${It(m.floor)} until it is fixed.`,substituted:!0
    }),r.add(p),m.floor;if(y.safeParse([]).success){
      let I=C.value;if(Array.isArray(I)){
        let x=new Map;for(let F of C.issues){
          let W=F.path?.[0];if(typeof W==="number"&&!x.has(W))x.set(W,Mt(F,1))
        }let L=y.safeParse(I.filter((F,W)=>!x.has(W)));if(x.size>0&&x.size<I.length&&L.success){
          for(let[F,W]of x)s({
            path:`${e}[${F}]`,message:`Invalid entry was ignored (${W}); it cannot take effect until it is fixed.`
          });return d.add(p),L.data
        }
      }
    }s({
      path:e,message:g===void 0?`"${p}" was present but invalid (${Mt(C.issues[0])}) and was ignored; it cannot take effect until it is fixed.`:`"${p}" was present but invalid (${Mt(C.issues[0])}) and was ignored, not treated as ${It(g)}; it cannot take effect until it is fixed.`
    }),i.add(p);return
  })
}function jo(e,n,s,r={
}){
  let i=e.slice(e.lastIndexOf(".")+1),d=new Set,c=new Set,p=new Set,g={
  };
  for(let[S,y]of Object.entries(n.shape)){
    let E=`${e}.${S}`,C=es(y);
    g[S]=r.override?.[E]??(C!==void 0&&gn(E)?jo(E,C,s,{
      ...r,strictField:y
    }):fg(E,y,s,d,c,p,r.neverSubstitute?.has(E)===!0))
  }let h=new Set([...r.skeletonExclude??[],...r.neverSubstitute??[]]),m=n.safeExtend(g);
  return ae().transform((S)=>{
    if(S===null){
      s(Ni(e,i));return
    }d.clear(),c.clear(),p.clear();let y=z(S)||r.strictField===void 0?void 0:r.strictField.safeParse(S),E=y?.success===!0&&z(y.data)?y.data:S,C=z(E)?m.safeParse(pa(E,(F)=>F===null||F===void 0)):void 0;if(!z(E)||C?.success!==!0){
      let F=ea(e,n,h),W=Object.keys(F);if(s({
        path:e,message:W.length>0?`"${i}" was present but not an object; treating its locks as their restrictive values (${W.join(", ")}) until it is fixed.`:`"${i}" was present but not an object and was ignored; it cannot take effect until it is fixed.`,...W.length>0&&{
          substituted:!0
        }
      }),W.length===0)return;if(!Li.has(e))r.synthesized?.add(F);return F
    }for(let[F,W]of Object.entries(E)){
      let ne=`${e}.${F}`;if(W===null&&(ft().has(ne)||gn(ne)))s(Ni(ne,F))
    }let I={
      ...C.data
    };for(let F of Qo(e,I,(W)=>c.has(W)?"unreadable":p.has(W)?"trimmed":void 0,s))d.add(F);let x=pa(I,(F)=>F===void 0);if(Object.keys(x).length===0)return Object.entries(E).some(([F,W])=>W!==void 0&&Object.hasOwn(n.shape,F))?void 0:x;let L=r.synthesized;if(L!==void 0&&!Li.has(e)&&Object.entries(x).every(([F,W])=>d.has(F)||Qi(L,W)||Lt(W)))L.add(x);return x
  }).optional()
}function os(e,n){
  let s=Xb(),r={
  };
  for(let[_,w]of Object.entries(s.shape))r[_]=w.catch((T)=>{
    e({
      path:_,message:`${T.issues[0]?.message??"Failed schema validation"}. This field was ignored.`
    });return
  });
  for(let _ of["prependPlugins","appendPlugins"])if(_ in s.shape)r[_]=A(o()).optional().catch((w)=>{
    e({
      path:_,message:`${w.issues[0]?.message??"Failed schema validation"}. This field was ignored; read as unset.`
    });return
  });
  r.wslInheritsWindowsSettings=Fe([df().transform(()=>{
    return
  }),Bi((_)=>{
    let w=Bx(_);if(w!==_)e({
      path:"wslInheritsWindowsSettings",message:`"wslInheritsWindowsSettings" holds the string "${String(w)}" where a boolean belongs; reading it as ${String(w)}. Write it without quotes.`,statusOnly:!0
    });return w
  },s.shape.wslInheritsWindowsSettings)]).optional().catch(()=>{
    e({
      path:"wslInheritsWindowsSettings",message:`"wslInheritsWindowsSettings" was present but invalid (it takes true or false), so this source's WSL opt-in cannot be read until it is fixed. WSL fails it closed: in an administrator source it arms the Windows policy chain with no user-writable source (/etc/claude-code, HKCU) read beneath it; in HKCU it leaves HKCU unapplied.`
    });return
  }),r.strictKnownMarketplaces=Mi("strictKnownMarketplaces",e).catch(()=>(e({
    path:"strictKnownMarketplaces",message:'"strictKnownMarketplaces" was present but invalid; enforcing an empty allowlist (no marketplaces admitted) until it is fixed.'
  }),[])),r.blockedMarketplaces=Mi("blockedMarketplaces",e).catch(()=>{
    e({
      path:"blockedMarketplaces",message:'"blockedMarketplaces" was present but invalid and was dropped; its entries cannot be enforced until it is fixed.'
    });return
  }),r.allowedMcpServers=Ii("allowedMcpServers",mn(),e).catch(()=>(e({
    path:"allowedMcpServers",message:'"allowedMcpServers" was present but invalid; enforcing an empty allowlist (no MCP servers admitted) until it is fixed.'
  }),[])),r.deniedMcpServers=Ii("deniedMcpServers",fn(),e).catch(()=>{
    e({
      path:"deniedMcpServers",message:'"deniedMcpServers" was present but invalid and was dropped; its entries cannot be enforced until it is fixed.'
    });return
  }),r.managedMcpServers=ae().transform((_)=>Zt(_,(w,T)=>e({
    path:w?`managedMcpServers.${w}`:"managedMcpServers",message:w?`Managed MCP server was ignored: ${T}`:T,statusOnly:!0
  }))).optional();
  let i=new Set;
  for(let{
    key:_,restrictive:w,field:T
  }of Zo()){
    let M=typeof w==="string"?`"${w}"`:String(w);
    r[_]=Fe([df().transform(()=>{
      return
    }),Ho(_,w,T,e)]).optional().catch(()=>(e({
      path:_,message:`"${_}" was present but invalid; treating it as ${M} (its restrictive value) until it is fixed.`,substituted:!0
    }),i.add(_),w))
  }r.strictPluginOnlyCustomization=Fe([df().transform(()=>{
    return
  }),qi((_)=>e({
    path:"strictPluginOnlyCustomization",message:`"strictPluginOnlyCustomization" lists ${_} ${P(_,"entry","entries")} this version does not recognize as a surface (known: ${Jmn.join(", ")}); an unrecognized entry locks nothing, so check it for a typo.`,statusOnly:!0
  }))]).optional().catch(()=>(e({
    path:"strictPluginOnlyCustomization",message:'"strictPluginOnlyCustomization" was present but invalid; treating it as true (skills, agents, hooks and MCP servers load from managed settings and plugins only) until it is fixed.',substituted:!0
  }),i.add("strictPluginOnlyCustomization"),!0));
  let d=s.shape.enabledPlugins.unwrap().valueType;
  r.enabledPlugins=fe(o(),ae()).transform((_)=>{
    let w=[],T=0;for(let[M,V]of Object.entries(_)){
      let Z=d.safeParse(V);if(Z.success){
        w.push([M,Z.data]);continue
      }T++,e({
        path:VC().safeParse(M).success?`enabledPlugins.${M}`:"enabledPlugins.<invalid id>",message:"Invalid entry was ignored: the value must be true, false, or a list of version constraints. This plugin is neither force-enabled nor blocked until it is fixed."
      })
    }if(T>0&&w.length===0){
      e({
        path:"enabledPlugins",message:'Every entry of "enabledPlugins" was invalid; no plugin is force-enabled or blocked by it until it is fixed.'
      });return
    }return Object.fromEntries(w)
  }).optional().catch(()=>{
    e({
      path:"enabledPlugins",message:'"enabledPlugins" was present but invalid (not a map of plugin ids) and was ignored; no plugin is force-enabled or blocked by it until it is fixed.'
    });return
  }),r.availableModels=A(ae()).transform((_,w)=>{
    let T=[];for(let M of _)if(typeof M==="string")T.push(M);else e({
      path:"availableModels",message:`"availableModels" contained a non-string entry (${JSON.stringify(M)}); the entry was ignored.`
    });return T
  }).optional().catch(()=>(e({
    path:"availableModels",message:'"availableModels" was present but invalid; enforcing an empty allowlist (only the default model is available) until it is fixed.'
  }),[])),r.deniedModels=A(ae()).transform((_)=>{
    let w=[];for(let T of _)if(typeof T==="string")w.push(T);else e({
      path:"deniedModels",message:`"deniedModels" contained a non-string entry (${T===null?"null":typeof T}); the entry was ignored.`
    });return w
  }).optional().catch(()=>{
    e({
      path:"deniedModels",message:'"deniedModels" was present but is not a list of model names, so it was ignored and blocks no models until it is fixed.'
    });return
  }),r.allowedHttpHookUrls=No("allowedHttpHookUrls",o(),e,"no HTTP hooks may run"),r.httpHookAllowedEnvVars=No("httpHookAllowedEnvVars",o(),e,"no environment variables may be interpolated into HTTP hook headers"),r.allowedChannelPlugins=No("allowedChannelPlugins",Zp(),e,"no channel plugins admitted",(_,w)=>typeof _==="string"?`"allowedChannelPlugins" entry "${_}" was accepted; prefer the documented object form {"plugin": "${w.plugin}", "marketplace": "${w.marketplace}"}.`:void 0),r.gatewayInternalNetworks=A(o()).optional().catch(()=>(e({
    path:"gatewayInternalNetworks",message:'"gatewayInternalNetworks" was present but invalid; gateway sign-in governed by this source is refused until it is fixed.'
  }),[R5n])),r.forceLoginOrgUUID=s.shape.forceLoginOrgUUID.catch(()=>(e({
    path:"forceLoginOrgUUID",message:'"forceLoginOrgUUID" was present but invalid; no organization is permitted to log in until it is fixed.'
  }),[]));
  let c=!1,p=(_,w)=>{
    let T=_.safeParse(w);
    if(T.success)return;
    return T.error.issues.slice(0,3).map((M)=>M.path.length?`${M.path.join(".")}: ${M.message}`:M.message).join("; ")
  },g;
  r.policyHelper=Bi((_)=>{
    if(c=!1,g=_,_&&typeof _==="object"&&!Array.isArray(_)){
      let w=_;for(let T of["defaultSettings","default",...un])if(w[T]!==void 0&&w[T]!==null)e({
        path:"policyHelper",message:`"${T}" on the singular policyHelper is ignored \u2014 static fallback payloads belong on the policyHelpers per-OS entries ("defaultSettings") or the map's "default" key. The intended fallback will NOT apply from here.`,statusOnly:!0
      });for(let T of["policyHelper","policyHelpers"])if(w[T]!==void 0&&w[T]!==null)e({
        path:"policyHelper",message:`"${T}" inside the singular policyHelper is ignored \u2014 "policyHelper" and "policyHelpers" are TOP-LEVEL settings keys; nothing nests inside the singular entry. The nested config will NOT apply from here.`,statusOnly:!0
      });for(let T of FL)if(w[T]!==void 0&&w[T]!==null)e({
        path:"policyHelper",message:`"${T}" on the singular policyHelper is ignored \u2014 per-OS entries live on the policyHelpers MAP ("policyHelpers": {"${T}": ...}), not inside the singular key. The intended per-OS config will NOT apply from here.`,statusOnly:!0
      });if(w.claudeMd!==void 0&&w.claudeMd!==null)e({
        path:"policyHelper",message:`"claudeMd" on the singular policyHelper is ignored \u2014 "claudeMd" is a managed-settings key: put it at the settings top level or inside a static payload, or emit it from the helper's stdout envelope. The intended instructions will NOT apply from here.`,statusOnly:!0
      });if(w.outputBehavior!==void 0&&w.outputBehavior!==null)e({
        path:"policyHelper",message:`"outputBehavior" on the singular policyHelper is ignored \u2014 it is only honored on the policyHelpers per-OS entries (policyHelpers.${FL.join("/")}); this helper's output REPLACES the policy tier whatever the value says.`,statusOnly:!0
      });if(w.onFailure!==void 0&&w.onFailure!==null)e({
        path:"policyHelper",message:`"onFailure" on the singular policyHelper is ignored \u2014 it is only honored on the policyHelpers per-OS entries (policyHelpers.${FL.join("/")}); a failure of this helper REFUSES to start Claude Code whatever the value says.`,statusOnly:!0
      });if(w.retries!==void 0&&w.retries!==null)e({
        path:"policyHelper",message:`"retries" on the singular policyHelper is ignored \u2014 it is only honored on the policyHelpers per-OS entries (policyHelpers.${FL.join("/")}); this helper is run ONCE per start or refresh, never re-run, whatever the value says.`,statusOnly:!0
      });if(w.path===null||w.path===void 0)c=!0
    }return _===null?void 0:_
  },pn().optional()).catch((_)=>{
    e({
      path:"policyHelper",message:`${_.issues[0]?.message??p(pn(),g)??"Failed schema validation"}. This field was ignored.`,...c&&{
        statusOnly:!0
      }
    });return
  });
  let h=(_,w)=>{
    e({
      path:_,message:`"${_}" is not a valid static settings payload: ${w??"failed validation"}. When delivered from an OS-admin policy source (MDM or the managed settings file), Claude Code will not start until this is fixed.`,startupFatal:!0
    })
  },m=[],S=(_)=>{
    let w=!1,T,M=zo(_,sUe().optional().catch((V)=>{
      w=!0,h(`policyHelpers.${_}.defaultSettings`,V.issues[0]?.message??p(sUe(),T&&typeof T==="object"&&!Array.isArray(T)?T.defaultSettings:void 0));return
    }));
    return Bi((V)=>{
      if(w=!1,T=V,_!=="default"&&V&&typeof V==="object"&&!Array.isArray(V)){
        let Z=V;for(let ee of[...un,"claudeMd"])if(Z[ee]!==void 0&&Z[ee]!==null)e({
          path:`policyHelpers.${_}`,message:`"${ee}" on the policyHelpers.${_} entry is ignored \u2014 helper output cannot be pre-seeded on an entry; a static fallback payload goes under this entry's "defaultSettings" (a managed-settings object). The intended content will NOT apply from here.`,statusOnly:!0
        });for(let ee of["policyHelper","policyHelpers"])if(Z[ee]!==void 0&&Z[ee]!==null)e({
          path:`policyHelpers.${_}`,message:`"${ee}" on the policyHelpers.${_} entry is ignored \u2014 "policyHelper" and "policyHelpers" are TOP-LEVEL settings keys; nothing nests inside an entry. The nested config will NOT apply from here.`,statusOnly:!0
        });for(let ee of FL)if(Z[ee]!==void 0&&Z[ee]!==null)e({
          path:`policyHelpers.${_}`,message:`"${ee}" on the policyHelpers.${_} entry is ignored \u2014 per-OS entries are SIBLINGS on the policyHelpers map, not nested inside each other. The intended ${ee} config will NOT apply from here.`,statusOnly:!0
        });if(Z.default!==void 0&&Z.default!==null)e({
          path:`policyHelpers.${_}`,message:`"default" on the policyHelpers.${_} entry is ignored \u2014 the per-entry static payload field is spelled "defaultSettings"; "default" is the MAP's any-platform catch-all key (a sibling of the OS entries). The intended fallback will NOT apply from here.`,statusOnly:!0
        });let Y=Z.onFailure;if(Y!==void 0&&Y!==null&&!Gi(Y)){
          let ee;if(typeof Y==="string"){
            let ie=Y.replace(/[^\x20-\x7e]/gu,"?");ee=JSON.stringify(ie.length>Ti?`${ie.slice(0,Ti-1)}\u2026`:ie)
          }else if(typeof Y==="number"||typeof Y==="boolean")ee=String(Y);else ee=`a non-string value (${Array.isArray(Y)?"array":typeof Y})`;e({
            path:`policyHelpers.${_}.onFailure`,message:`"onFailure": ${ee} on the policyHelpers.${_} entry is not a recognized value ("continue" or "refuse"); it is treated as "refuse" \u2014 a startup failure of this entry's helper with no static payload in its place will not start Claude Code.`,statusOnly:!0
          })
        }if($i(V))return
      }return V===null?void 0:V
    },M.optional()).catch((V)=>{
      if(_==="default"){
        h("policyHelpers.default",V.issues[0]?.message??p(sUe(),T));return
      }if(w)return;let Z=p(zo(_),T)??"failed validation",Y=T,ee=Y&&typeof Y==="object"&&!Array.isArray(Y)?Y:null,ie=ee?.onFailure,ve=ie!==void 0&&ie!==null&&ie!=="continue",se=(ue)=>{
        let he=`policyHelpers.${_}`;if(ve)m.push({
          entryKey:_,message:ue
        });else e({
          path:he,message:ue,statusOnly:!0
        })
      };if(ee){
        let ue=ee.defaultSettings;if(ue!==void 0&&ue!==null){
          let he=sUe().safeParse(ue);if(he.success){
            let Ne=ee.outputBehavior,Ue=Ne===void 0||Ne===null?null:Fi().safeParse(Ne);if(Ue&&!Ue.success){
              se(`Invalid entry was ignored: ${Z}. Its "defaultSettings" static payload was NOT kept: "outputBehavior" is unrecognized, so whether the payload replaces or merges over this source's settings is unknown. No policy helper runs on ${_} from this entry.`);return
            }return e({
              path:`policyHelpers.${_}`,message:`Invalid entry: its helper fields were ignored (${Z}), but its "defaultSettings" static payload was kept. No policy helper runs on ${_} from this entry.`,statusOnly:!0
            }),{
              defaultSettings:he.data,...Ue&&{
                outputBehavior:Ue.data
              }
            }
          }
        }
      }se(`Invalid entry was ignored: ${Z}. No policy helper runs on ${_} from this entry.`);return
    })
  };
  r.policyHelpers=Bi((_)=>{
    if(m=[],_&&typeof _==="object"&&!Array.isArray(_)){
      let w=_;for(let T of["defaultSettings",...un,"claudeMd"])if(w[T]!==void 0&&w[T]!==null)e({
        path:"policyHelpers",message:`"${T}" directly on the policyHelpers map is ignored \u2014 static fallback payloads go on a per-OS entry's "defaultSettings" or the map's "default" key (a managed-settings object), and helper-output keys come from the helper's stdout. The intended content will NOT apply from here.`,statusOnly:!0
      });for(let T of["policyHelper","policyHelpers"])if(w[T]!==void 0&&w[T]!==null)e({
        path:"policyHelpers",message:`"${T}" inside the policyHelpers map is ignored \u2014 "policyHelper" and "policyHelpers" are TOP-LEVEL settings keys; the map's keys are the per-OS entries and "default". The nested config will NOT apply from here.`,statusOnly:!0
      });for(let T of Uo.filter((M)=>M!=="defaultSettings"))if(w[T]!==void 0&&w[T]!==null){
        let M=T==="script"||T==="interpreter"?"; inline scripts are per-OS only (the singular policyHelper key takes a path)":T==="outputBehavior"||T==="onFailure"||T==="retries"?"":", or on the singular policyHelper key";e({
          path:"policyHelpers",message:`"${T}" directly on the policyHelpers map is ignored \u2014 helper configs go on a per-OS entry (policyHelpers.${FL.join("/")})${M}. No helper runs from this field here.`,statusOnly:!0
        })
      }
    }return _===null?void 0:_
  },u(Object.fromEntries(qo.map((_)=>[_,S(_)]))).transform((_)=>{
    for(let w of Object.keys(_))if(_[w]===void 0)delete _[w];for(let{
      entryKey:w,message:T
    }of m){
      let M=`policyHelpers.${w}`,V=Yo(w).find((Y)=>_[Y]?.defaultSettings!==void 0&&_[Y]?.defaultSettings!==null),Z=V!==void 0?`${V}.defaultSettings`:_.default!==void 0?"default":null;e(Z!==null?{
        path:M,message:`${T} Its "onFailure" requires the helper; the "policyHelpers.${Z}" static payload serves in its place.`,statusOnly:!0
      }:{
        path:M,message:`${T} Its "onFailure" requires the helper, so when delivered from an OS-admin policy source (MDM or the managed settings file), Claude Code will not start until this is fixed.`,startupFatal:!0
      })
    }return m=[],_
  }).optional().catch((_)=>(e({
    path:"policyHelpers",message:`"policyHelpers" could not be parsed: expected an object mapping OS keys (${FL.join(", ")}) to helper entries, plus an optional "default" settings payload (${_.issues[0]?.message??"failed schema validation"}). When delivered from an OS-admin policy source (MDM or the managed settings file), Claude Code will not start until this is fixed.`,startupFatal:!0
  }),{
  })));
  let y=new WeakSet;
  for(let[_,w]of Object.entries(s.shape)){
    if(_==="sandbox"||!Sn(_))continue;
    let T=es(w);
    if(T!==void 0)r[_]=jo(_,T,e,{
      synthesized:y,strictField:w
    })
  }let E=Object.freeze({
    mode:"deny"
  }),C=Object.freeze({
    accessKeyIdVar:"_STRIPPED_",secretAccessKeyVar:"_STRIPPED_2_"
  }),I=0,x=[],L=new Set,F=new Set,W=n===void 0?"":`${[...n].reduce((_,w)=>Math.imul(_^w.charCodeAt(0),16777619)>>>0,2166136261).toString(16).toUpperCase().padStart(8,"0")}_`,ne=(_,w)=>{
    if(typeof _!=="object"||_===null)return;
    let T=(pe)=>w.some((_e)=>_e.path?.includes(pe)),M=(pe)=>{
      let _e=_[pe];
      if(typeof _e==="string")return _e;
      return T(pe)?"":void 0
    },V=M("accessKeyIdVar"),Z=M("secretAccessKeyVar"),Y=M("sessionTokenVar"),ee=SRe;
    if(![V,Z,Y].some((pe)=>pe!==void 0&&ee.includes(pe)))return;
    let ie=(pe)=>pe!==void 0&&ut().safeParse(pe).success;
    I+=1;
    let ve=(pe)=>`${oUt}${pe}_${W}${I}_`,se=ie(V)?V:ve("ACCESS_KEY_ID"),ue=ie(Z)&&Z!==se?Z:ve("SECRET_ACCESS_KEY"),he=Y===void 0?void 0:ie(Y)&&Y!==se&&Y!==ue?Y:ve("SESSION_TOKEN"),Ne=(pe)=>pe.startsWith(oUt);
    if(!Ne(se)&&!Ne(ue)){
      let pe=ee.includes(ue)?ue:void 0;
      if(ue=ve("SECRET_ACCESS_KEY"),pe!==void 0){
        let _e=ne({
          accessKeyIdVar:pe
        },[]);
        if(_e!==void 0)x.push(_e)
      }
    }let Ue=Xt().safeParse({
      accessKeyIdVar:se,secretAccessKeyVar:ue,...he!==void 0&&{
        sessionTokenVar:he
      }
    });
    return Ue.success?Ue.data:void 0
  },me=(_,w,T)=>A(w.catch((M)=>{
    let V=T(M.value);if(V!==void 0)return e({
      path:`sandbox.credentials.${_}[]`,message:`Invalid entry was degraded to mode "deny": ${M.issues[0]?.message??"failed validation"}. The credential stays blocked (not masked) until the entry is fixed.${_==="files"?" Under sandbox.filesystem.disabled, file read-denies are not enforced.":""}`,substituted:!0
    }),V;return e({
      path:`sandbox.credentials.${_}[]`,message:`Invalid entry was ignored: ${M.issues[0]?.message??"failed validation"}. This credential is NOT protected until the entry is fixed.`
    }),E
  })).transform((M)=>{
    let V=M.filter((Z)=>Z!==E);if(M.length>0&&V.length===0)L.add(_);return V
  }).optional().catch((M)=>{
    if(typeof M.value==="object"&&M.value!==null&&!Array.isArray(M.value)){
      let V=w.safeParse(M.value);if(V.success)return e({
        path:`sandbox.credentials.${_}`,message:`"${_}" must be an array; a lone entry object was accepted as a one-element list. Wrap it in [ ] to silence this warning.`
      }),[V.data];let Z=T(M.value);if(Z!==void 0)return e({
        path:`sandbox.credentials.${_}`,message:`"${_}" must be an array; its lone entry object was invalid and was degraded to mode "deny". The credential stays blocked (not masked) until it is fixed.`,substituted:!0
      }),[Z]
    }return e({
      path:`sandbox.credentials.${_}`,message:`${M.issues[0]?.message??"Invalid value"}. "${_}" was ignored; these credential entries are NOT protected until it is fixed.`
    }),L.add(_),[]
  }),te=u({
    files:me("files",Vt(),(_)=>{
      if(typeof _!=="object"||_===null||!("mode"in _)||_.mode!=="mask"&&_.mode!=="deny"||!("path"in _)||typeof _.path!=="string")return;let w=Vt().safeParse({
        path:_.path,mode:"deny"
      });return w.success?w.data:void 0
    }),envVars:me("envVars",Yt(),(_)=>{
      if(typeof _!=="object"||_===null||!("mode"in _)||_.mode!=="mask"&&_.mode!=="deny"||!("name"in _)||typeof _.name!=="string")return;let w=Yt().safeParse({
        name:_.name,mode:"deny"
      });return w.success?w.data:void 0
    }),allowPlaintextInject:Ho("sandbox.credentials.allowPlaintextInject",ft().get("sandbox.credentials.allowPlaintextInject"),H().optional(),e).catch((_)=>(e({
      path:"sandbox.credentials.allowPlaintextInject",message:`${_.issues[0]?.message??"Invalid value"}. "allowPlaintextInject" was degraded to an explicit false; plaintext credential injection stays disabled (lower-precedence values cannot enable it) until it is fixed.`,substituted:!0
    }),L.add("allowPlaintextInject"),!1)),awsPairs:A(Xt().catch((_)=>{
      let w=ne(_.value,_.issues);if(w!==void 0)return e({
        path:"sandbox.credentials.awsPairs[]",message:`Invalid pair was degraded to a non-functional suppressor: ${_.issues[0]?.message??"failed validation"}. It keeps implicit AWS auto-pairing suppressed but re-signs nothing until it is fixed.`,substituted:!0
      }),w;return e({
        path:"sandbox.credentials.awsPairs[]",message:`Invalid pair was ignored: ${_.issues[0]?.message??"failed validation"}. SigV4 re-signing stays unconfigured for this pair until it is fixed.`
      }),C
    })).transform((_)=>{
      let w=_.filter((T)=>T!==C);if(x.length>0)w.push(...x),x.length=0;if(_.length>0&&w.length===0)L.add("awsPairs");return w
    }).optional().catch((_)=>{
      let w=typeof _.value==="object"&&_.value!==null?ne(_.value,[]):void 0,T=typeof _.value==="object"&&_.value!==null&&(("accessKeyIdVar"in _.value)||("secretAccessKeyVar"in _.value)||("sessionTokenVar"in _.value));if(w===void 0&&T)return x.length=0,e({
        path:"sandbox.credentials.awsPairs",message:`${_.issues[0]?.message??"Invalid value"}. "awsPairs" must be an array; its lone pair-shaped entry claimed no conventional AWS name and was ignored. SigV4 re-signing stays unconfigured until it is fixed.`
      }),L.add("awsPairs"),[];let M=w!==void 0?[w]:SRe.flatMap((V)=>{
        let Z=ne({
          accessKeyIdVar:V
        },[]);return Z!==void 0?[Z]:[]
      });if(x.length>0)M.push(...x),x.length=0;if(w===void 0)L.add("awsPairs");return e({
        path:"sandbox.credentials.awsPairs",message:`${_.issues[0]?.message??"Invalid value"}. "awsPairs" was degraded to non-functional suppressor pair(s); implicit AWS auto-pairing stays suppressed but nothing re-signs until it is fixed.`,substituted:!0
      }),M
    }),sigv4:u(Object.fromEntries(["streaming","presigned","sigv4a"].map((_)=>[_,G(["deny","passthrough"]).optional().catch((w)=>(e({
      path:`sandbox.credentials.sigv4.${_}`,message:`${w.issues[0]?.message??"Invalid value"}. "${_}" was degraded to an explicit deny; this SigV4 request shape stays denied until it is fixed.`,substituted:!0
    }),F.add(_),"deny"))]))).transform((_)=>{
      let w=Object.entries(_).filter(([,T])=>T!==void 0);if(w.length>0&&w.every(([T])=>F.has(T)))L.add("sigv4");return F.clear(),_
    }).optional().catch((_)=>(e({
      path:"sandbox.credentials.sigv4",message:`${_.issues[0]?.message??"Invalid value"}. "sigv4" was degraded to an all-deny block (all shapes stay denied, and lower-precedence sigv4 values cannot take effect) until it is fixed.`,substituted:!0
    }),F.clear(),L.add("sigv4"),{
      streaming:"deny",presigned:"deny",sigv4a:"deny"
    }))
  }).transform((_)=>{
    let w=Object.entries(_).filter(([,T])=>T!==void 0);if(w.length>0&&w.every(([T])=>L.has(T)))y.add(_);return L.clear(),_
  }).optional().catch((_)=>{
    e({
      path:"sandbox.credentials",message:`${_.issues[0]?.message??"Failed schema validation"}. The credentials block was degraded to a fail-closed skeleton (all-deny sigv4, implicit AWS auto-pairing suppressed, no masking) until it is fixed.`,substituted:!0
    });let w=SRe.flatMap((M)=>{
      let V=ne({
        accessKeyIdVar:M
      },[]);return V!==void 0?[V]:[]
    });x.length=0,L.clear(),F.clear();let T={
      allowPlaintextInject:!1,awsPairs:w,sigv4:{
        streaming:"deny",presigned:"deny",sigv4a:"deny"
      }
    };return y.add(T),T
  });
  return r.sandbox=jo("sandbox",pmn(),e,{
    override:{
      "sandbox.credentials":te
    },skeletonExclude:new Set(["sandbox.enabled"]),neverSubstitute:new Set(["sandbox.failIfUnavailable"]),synthesized:y
  }),u(r).passthrough().transform((_)=>{
    for(let M of Object.keys(_))if(_[M]===void 0)delete _[M];let w=Object.keys(_).filter((M)=>!lt.some((V)=>V===M)&&!Lt(_[M])),T=w.length>0&&w.every((M)=>i.has(M)||Qi(y,_[M]));if(i.clear(),T)for(let M of w)e({
      path:M,message:`"${M}" holds nothing that could be applied as written and is this source's only policy content; its fail-closed reading binds (beside a lower managed settings source's policy, when one supplies it) until it is fixed.`,statusOnly:!0,onlySubstitutes:!0
    });return _
  })
}function HUt(e){
  return"serverName"in e&&e.serverName!==void 0
}function Qmn(e){
  return"serverCommand"in e&&e.serverCommand!==void 0
}function Zmn(e){
  return"serverUrl"in e&&e.serverUrl!==void 0
}function hg(){
  let e=MYn();
  return e!==void 0&&DYn(e)
}function Cne(){
  let e=O(),n=e==="wsl"&&!hg()?"linux":e;
  switch(n){
    case"unknown":return{
      platform:n,chain:[]
    };
    default:return{
      platform:n,chain:Yo(n)
    }
  }
}var dt=[{
  alias:"additionalMarketplaces",canonical:"extraKnownMarketplaces"
},{
  alias:"allowedMarketplaces",canonical:"strictKnownMarketplaces"
}];
function Rne(e,n,s){
  if(!z(e))return[];
  let r=[];
  for(let{
    alias:i,canonical:d
  }of dt){
    if(!(i in e))continue;
    if(e[i]===null){
      if(!(d in e)&&s?.loneNullAlias==="rename")e[d]=null;
      delete e[i];
      continue
    }if(d in e&&e[d]!==null)r.push({
      file:n,path:i,message:`"${i}" is an alias for "${d}" and this file sets both; the "${i}" value was ignored. Use only "${d}".`,severity:"warning",alias:i,canonical:d
    });
    else e[d]=e[i];
    delete e[i]
  }return r
}function rs(e){
  return`"${e.alias}" and "${e.canonical}" are the same setting; keep only "${e.canonical}"`
}function sr(e){
  return YH(e," ",{
    keepEmojiJoiners:!0
  })
}var egn=/^[\s\p{M}\p{Cf}\u0000-\u001a\u001c-\u001f\u007f]+/u;
function Ld(e){
  return YH(e," ",{
    keepNewlines:!0
  })
}function na(e){
  return YH(e,"",{
    keepEmojiJoiners:!0
  })
}function xne(e,n=sr){
  if(e===void 0)return;
  let s=n(e);
  return s.trim()===""?void 0:s
}function iUe(e){
  if(e===void 0)return;
  let n=YH(e,"");
  try{
    let{
      protocol:s,username:r,password:i
    }=new URL(n);
    return(s==="https:"||s==="http:")&&r===""&&i===""?n:void 0
  }catch{
    return
  }
}function y$o(e){
  return{
    ...e,displayName:xne(e.displayName),version:xne(e.version),description:xne(e.description,Ld),author:e.author===void 0?void 0:{
      ...e.author,name:sr(e.author.name),email:xne(e.author.email),url:iUe(e.author.url)
    },homepage:iUe(e.homepage),repository:iUe(e.repository),license:xne(e.license),keywords:e.keywords?.map(sr)
  }
}function Nm(e){
  return na(e)
}function Zf(e){
  let n=oa(e)?e.manifest.displayName:e.displayName;
  return aUe(typeof n==="string"?sr(n).trim():n)??aUe(Nm(e.name))??aUe(Nm(oa(e)?e.source:""))??"(unprintable plugin name)"
}function aUe(e){
  if(typeof e!=="string")return;
  return e.trim()?e:void 0
}function oa(e){
  return"manifest"in e&&typeof e.manifest==="object"&&e.manifest!==null
}var yg="The command contains non-ASCII, hidden or control characters (shown as \\u{\u2026} escapes). Do not proceed unless you expected them.";
function lUe(e){
  let{
    text:n,escaped:s
  }=ht(e.command);
  return{
    destination:BYn(e.archiveUrl)??rk,hiddenCharactersWarning:s?yg:null,command:n
  }
}function ht(e){
  let n=!1;
  return{
    text:e.replace(/[^\x20-\x5b\x5d-\x7e]/gu,(r)=>{
      if(r==="\\")return"\\\\";return n=!0,`\\u{${r.codePointAt(0).toString(16)}}`
    }),escaped:n
  }
}function tgn(e){
  return e.replace(/[-_]/g,"").toLowerCase()
}function ngn(e){
  return new Map(e.map((n)=>[tgn(n),n]))
}function Ia(e){
  if(typeof e!=="object"||e===null)return!1;
  let n=Object.getPrototypeOf(e);
  return n===Object.prototype||n===null
}import{
  createHash as _g
}from"crypto";
function $P(e){
  if(Array.isArray(e))return e.map($P);
  if(e!==null&&typeof e==="object"){
    let n={
    };
    for(let s of Object.keys(e).sort())n[s]=$P(e[s]);
    return n
  }return e
}function Bye(e){
  let n=$P(e),s=b(n);
  return`sha256:${_g("sha256").update(s).digest("hex")}`
}var Sg=["enabled","enabledPlatforms"],Nt="network.allowedDomains",bg=new Set(["OTEL_LOG_MANAGED_SETTINGS"]);
function P0(e){
  if(!e)return{
    shellSettings:{
    },envVars:{
    },sandboxSettings:{
    },isolationSettings:{
    },hasHooks:!1,payloadSlots:{
    }
  };
  let n=ma(e),s=Eg(e);
  kg([n,...s.map(([,c])=>c)]);
  let r={
  };
  for(let[c,p]of s){
    let g={
      shellSettings:p.hasHooks?{
        ...p.shellSettings,hooks:Ke(p.hooks)
      }:p.shellSettings,envVars:p.envVars,sandboxSettings:p.sandboxSettings,isolationSettings:p.isolationSettings
    };
    if(Ut(g))r[c]=g
  }let{
    sandboxSwitches:i,...d
  }=n;
  return{
    ...d,payloadSlots:r
  }
}function ma(e){
  let n={
  },s;
  for(let S of Ws){
    let y=e[S];
    if(S==="policyHelpers"){
      if(y!==null&&typeof y==="object")for(let C of FL){
        let I=ka(y[C]);
        if(I){
          if(n[`policyHelpers.${C}`]=I.command,I.scriptSize)s??={
          },s[`policyHelpers.${C}`]=I.scriptSize
        }
      }continue
    }let E;
    if(typeof y==="string")E=y;
    else if(y!==null&&typeof y==="object"&&"command"in y&&typeof y.command==="string")E=y.command;
    if(E!==void 0&&E.length>0)n[S]=E
  }let r=Qg(e);
  if(r&&typeof r==="object")for(let[S,y]of Object.entries(r)){
    let E=y?.source;
    if(!E||typeof E!=="object")continue;
    if(E.source==="url"&&typeof E.headersHelper==="string"&&E.headersHelper.length>0)n[`extraKnownMarketplaces[${b(S)}].source.headersHelper`]=ra(E.headersHelper,"url",E.url);
    if(E.source==="settings"&&Array.isArray(E.plugins)){
      let C=new Map;
      for(let I of E.plugins){
        let x=b(I?.name),L=C.get(x)??0;
        C.set(x,L+1);
        let F=I?.source;
        if(F!==null&&typeof F==="object"&&"source"in F&&F.source==="command"&&"command"in F&&typeof F.command==="string"&&F.command.length>0)n[`extraKnownMarketplaces[${b(S)}].plugins[${b(I.name)}][${L}].source.command`]=F.command;
        if(typeof I?.headersHelper==="string"&&I.headersHelper.length>0){
          let W=I.source,ne=W!==null&&typeof W==="object";
          n[`extraKnownMarketplaces[${b(S)}].plugins[${b(I.name)}][${L}].headersHelper`]=ra(I.headersHelper,ne&&"source"in W?W.source:void 0,ne&&"url"in W?W.url:void 0)
        }
      }
    }
  }let i=e.sandbox,d={
  },c={
    enabled:yt(i,"enabled"),enabledPlatforms:yt(i,"enabledPlatforms"),[Nt]:yt(i,Nt)
  };
  if(i!==null&&typeof i==="object"){
    let S={
      enabled:c.enabled,enabledPlatforms:c.enabledPlatforms
    };
    for(let y of Qn){
      let E=Tg(i[y]);
      if(E)n[`sandbox.${y}`]=Ke({
        value:E,...S
      })
    }for(let y of Gs){
      let E=yt(i,y);
      if(Ag(y,E))d[`sandbox.${y}`]=Ke({
        value:E,...S,...ya.has(y)&&{
          allowedDomains:_a(c[Nt])
        }
      })
    }
  }let p=e.isolation,g={
  };
  for(let S of Vs){
    let y=yt(p,S);
    if(Og(S,y))g[`isolation.${S}`]=Ke({
      value:y
    })
  }let h={
  };
  if(e.env&&typeof e.env==="object")for(let[S,y]of Object.entries(e.env)){
    if(y===void 0)continue;
    let E=String(y);
    if(E.length>0&&!bg.has(S.toUpperCase())&&!Fpt(S,E))h[S]=E
  }let m=e.hooks!==void 0&&e.hooks!==null&&typeof e.hooks==="object"&&Object.keys(e.hooks).length>0;
  return{
    shellSettings:n,inlineHelperScriptSizes:s,envVars:h,sandboxSettings:d,isolationSettings:g,hasHooks:m,hooks:m?e.hooks:void 0,sandboxSwitches:c
  }
}function Eg(e){
  return ls(e).map(([n,s])=>[n,ma(s)])
}function ls(e){
  let n=[];
  for(let s of ha){
    let r=`policyHelpers.${s}`,i=yt(e,r);
    if(!Ia(i))continue;
    let{
      policyHelper:d,policyHelpers:c,...p
    }=i;
    n.push([r,p])
  }return n
}function fa(e){
  return FL.find((n)=>e===`policyHelpers.${n}.defaultSettings`)
}function kg(e){
  let n=e.map((r)=>Object.keys(r.sandboxSettings).length>0||Qn.some((i)=>r.shellSettings[`sandbox.${i}`]!==void 0)),s=e.map((r)=>[...ya].some((i)=>r.sandboxSettings[`sandbox.${i}`]!==void 0));
  e.forEach((r,i)=>{
    if(n.some((d,c)=>d&&c!==i))for(let d of Sg){
      let c=r.sandboxSwitches[d];if(c!==void 0)r.sandboxSettings[`sandbox.${d}`]=Ke({
        value:c
      })
    }if(s.some((d,c)=>d&&c!==i)){
      let d=r.sandboxSwitches[Nt];if(d!==void 0)r.sandboxSettings[`sandbox.${Nt}`]=Ke({
        value:_a(d)??d
      })
    }
  })
}var ha=[...FL.map((e)=>`${e}.defaultSettings`),"default"];
function Ce(e){
  let n=[];
  for(let s of ha){
    let r=`policyHelpers.${s}`,i=e.payloadSlots[r];
    if(i!==void 0&&Ut(i))n.push([r,i])
  }return n
}function _$o(e,n){
  let s=e.payloadSlots[n];
  return s!==void 0&&Ut(s)
}function Ut(e){
  return Object.keys(e.shellSettings).length>0||Object.keys(e.envVars).length>0||Object.keys(e.sandboxSettings).length>0||Object.keys(e.isolationSettings).length>0
}var ya=new Set(["credentials","network.tlsTerminate"]);
function _a(e){
  return Array.isArray(e)?D(e.filter((n)=>typeof n==="string")).sort():void 0
}function yt(e,n){
  let s=e;
  for(let r of n.split(".")){
    if(s===null||typeof s!=="object")return;
    s=s[r]
  }return s
}function Ag(e,n){
  if(n===void 0||n===null||n===!1)return!1;
  if(Array.isArray(n)&&n.length===0)return!1;
  return!(e==="credentials"&&Rg(n))
}function Og(e,n){
  if(n===void 0||n===null)return!1;
  switch(e){
    case"required":return n!==!1;
    case"egress":return!Ia(n)||Object.entries(n).some(([s,r])=>wg.has(s)?r!==void 0&&r!==null&&!(Array.isArray(r)&&r.length===0):r!==void 0)
  }
}var wg=new Set(["allowedHosts","deniedHosts"]);
function Rg(e){
  if(typeof e!=="object"||e===null)return!1;
  return Object.entries(e).every(([n,s])=>{
    if(s===void 0)return!0;if(n==="files"||n==="envVars")return Array.isArray(s)&&s.every((r)=>typeof r==="object"&&r!==null&&r.mode==="deny");if(n==="sigv4")return typeof s==="object"&&s!==null&&Object.values(s).every((r)=>r===void 0||r==="deny");return n==="allowPlaintextInject"&&s===!1
  })
}function vg(e){
  return Object.keys(e.shellSettings).some(Sa)
}function Sa(e){
  return FL.some((n)=>e===`policyHelpers.${n}`)
}function ba(e){
  return vg(e)||Object.keys(e.shellSettings).some((n)=>n.startsWith("extraKnownMarketplaces["))||Ce(e).length>0
}function Ea(e){
  return e==="sh"||e==="pwsh"
}function Cg(e){
  return e!==null&&typeof e==="object"&&"interpreter"in e&&Ea(e.interpreter)&&"script"in e&&typeof e.script==="string"
}function rft(e){
  return ka(e)?.command
}function ka(e){
  if(e===null||typeof e!=="object")return;
  let{
    path:n,script:s,interpreter:r,timeoutMs:i,refreshIntervalMs:d
  }=e,c,p;
  if(typeof n==="string"&&n)c=n;
  else if(typeof s==="string"&&s&&Ea(r))c={
    interpreter:r,script:Aa(s)
  },p=Pg(s);
  else return;
  return{
    command:b([c,i??null,d??null]),scriptSize:p
  }
}function Pg(e){
  return{
    bytes:Buffer.byteLength(e,"utf8"),lines:zt(e,`
`)+(e.endsWith(`
`)?0:1)
  }
}function Aa(e){
  return Kt(b(e))
}function Tg(e){
  if(typeof e==="string")return e||void 0;
  if(e===null||typeof e!=="object"||!("command"in e)||typeof e.command!=="string"||!e.command)return;
  let n="args"in e&&Array.isArray(e.args)?e.args.map(String):[];
  return b([e.command,...n])
}function y6(e){
  return Ut(e)||e.hasHooks||Ce(e).length>0
}function as(e){
  return Ke(Oa(e))
}function Oa(e){
  return{
    shellSettings:e.shellSettings,envVars:e.envVars,sandboxSettings:Object.keys(e.sandboxSettings).length>0?e.sandboxSettings:void 0,...sa(e),hooks:e.hooks,payloadSlots:Ce(e).length>0?Object.fromEntries(Ce(e).map(([n,s])=>{
      let{
        isolationSettings:r,...i
      }=s;return[n,{
        ...i,...sa(s)
      }]
    })):void 0
  }
}function sa(e){
  return Object.keys(e.isolationSettings).length>0?{
    isolationSettings:e.isolationSettings
  }:{
  }
}function Ke(e){
  return b($P(e))
}function rgn(e){
  return Kt(as(e))
}function ds(e,n,s){
  if(rgn(n)===e)return!0;
  return typeof s==="string"&&s.length>0&&Kt(Ke({
    ...Oa(n),claudeMd:s
  }))===e
}function xg(e){
  let n=ct(e,!1);
  if(!Array.isArray(n)||n.length!==3||typeof n[0]!=="string")return;
  return{
    command:n[0],url:typeof n[2]==="string"?n[2]:void 0
  }
}function ra(e,n,s){
  return b([e,typeof n==="string"?n:null,typeof s==="string"?s:null])
}function ia(e,n){
  let s=P0(e),r=P0(n);
  if(!y6(r))return!1;
  if(!y6(s))return!0;
  return as(s)!==as(r)
}function b$o(e,n){
  switch(e.source){
    case"consented_payload":return ia(e.settings,n);
    case"org_record":{
      let s=P0(n);
      if(!y6(s))return!1;
      if(ds(e.dangerousSettingsHash,s,n?.claudeMd))return!1;
      return ia(e.consentedPayload,n)
    }
  }
}function L1r(e,n){
  let s=P0(e),r={
  },i=ot(s.shellSettings,n.shellSettings,r),d={
  },c=ot(s.envVars,n.envVars,d),p={
  },g=ot(s.sandboxSettings,n.sandboxSettings,p),h={
  },m=ot(s.isolationSettings,n.isolationSettings,h),S=i.unchanged+c.unchanged+g.unchanged+m.unchanged,y=i.removed+c.removed+g.removed+m.removed;
  if(s.hasHooks&&!n.hasHooks)y++;
  let E=n.hasHooks&&!(s.hasHooks&&Ke(s.hooks)===Ke(n.hooks));
  if(n.hasHooks&&!E)S++;
  let C={
  };
  for(let[I,x]of Ce(n)){
    let L=s.payloadSlots[I],F={
      shellSettings:{
      },envVars:{
      },sandboxSettings:{
      },isolationSettings:{
      }
    };
    for(let{
      unchanged:W,removed:ne
    }of[ot(L?.shellSettings??{
    },x.shellSettings,F.shellSettings),ot(L?.envVars??{
    },x.envVars,F.envVars),ot(L?.sandboxSettings??{
    },x.sandboxSettings,F.sandboxSettings),ot(L?.isolationSettings??{
    },x.isolationSettings,F.isolationSettings)])S+=W,y+=ne;
    if(Ut(F))C[I]=F
  }for(let[I,x]of Ce(s))if(n.payloadSlots[I]===void 0)y+=Object.keys(x.shellSettings).length+Object.keys(x.envVars).length+Object.keys(x.sandboxSettings).length+Object.keys(x.isolationSettings).length;
  return{
    changed:{
      shellSettings:r,inlineHelperScriptSizes:n.inlineHelperScriptSizes,envVars:d,sandboxSettings:p,isolationSettings:h,hasHooks:E,hooks:E?n.hooks:void 0,payloadSlots:C
    },unchangedCount:S,removedCount:y
  }
}function ot(e,n,s){
  let r=0;
  for(let[d,c]of Object.entries(n)){
    if(c===void 0)continue;
    if(Object.hasOwn(e,d)&&e[d]===c)r++;
    else s[d]=c
  }let i=0;
  for(let d of Object.keys(e))if(!Object.hasOwn(n,d))i++;
  return{
    unchanged:r,removed:i
  }
}var Dg=/^OTEL_EXPORTER_OTLP_(?:LOGS_|METRICS_|TRACES_)?ENDPOINT$/,Mg=/^OTEL_EXPORTER_OTLP_(?:TRACES_)?ENDPOINT$/,Ig=/^(?:ANT_OTEL_EXPORTER_OTLP_ENDPOINT|OTEL_EXPORTER_OTLP_(?:LOGS_|METRICS_|TRACES_)?ENDPOINT)$/,Lg=new Set(["CLAUDE_CODE_ENHANCED_TELEMETRY_BETA","ENABLE_ENHANCED_TELEMETRY_BETA"]);
function N1r(e,n){
  let s=n?P0(n):e,r=[s,...Ce(s).map(([,i])=>i)];
  return aa(e)&&aa(s)&&!s.hasHooks&&r.every((i)=>Object.keys(i.shellSettings).length===0&&Object.keys(i.sandboxSettings).length===0&&Object.keys(i.isolationSettings).length===0)
}function $1r(e,n){
  let s=n?P0(n):e,r=[s,...Ce(s).map(([,i])=>i)];
  return!s.hasHooks&&r.some((i)=>Object.keys(i.isolationSettings).length>0)&&r.every((i)=>Object.keys(i.shellSettings).length===0&&Object.keys(i.envVars).length===0&&Object.keys(i.sandboxSettings).length===0)
}function aa(e){
  let n=Ca(e),s=(i)=>i.url!==void 0&&Dg.test(i.key.toUpperCase()),r=!n.some((i)=>i.tracesSwitch===!0)||n.some((i)=>s(i)&&Mg.test(i.key.toUpperCase()));
  return n.some(s)&&r&&n.every((i)=>s(i)||i.tracesSwitch===!0)
}var Ug=120;
function bn(e){
  if(/[\\\s\x00-\x1f\x7f]/.test(e))return;
  let n;
  try{
    n=new URL(e)
  }catch{
    return
  }if(n.protocol!=="http:"&&n.protocol!=="https:"||!n.host)return;
  if(nzr.test(n.pathname))return;
  let s=y1t(e);
  return s!==null&&s.length<=Ug?s:void 0
}var zg=/^\w{1,8}:\/\//,wa=new Set(["dns","unix","ipv4","ipv6"]),Hg=new Set([...wa,"http","https","ws","wss","ftp","file","grpc","grpcs","otlp","xds","tcp","udp","tls","h2","h2c","http2"]);
function jg(e){
  let n=En(`https://${e}`);
  if(zg.test(e)){
    let s=En(e);
    return s&&s.port!==""&&wa.has(s.hostname)?void 0:bn(e)
  }if(En(e)?.host)return n===null?bn(e):void 0;
  return n&&!Hg.has(Kg(n.hostname))&&bn(`https://${e}`)!==void 0?n.host:void 0
}function Kg(e){
  let n=e.length;
  while(n>0&&e[n-1]===".")n--;
  return e.slice(0,n)
}function En(e){
  try{
    return new URL(e)
  }catch{
    return null
  }
}var Wg=/^[A-Za-z_][A-Za-z0-9_]{0,63}$/,la=64,Gg=160,Vg=400;
function Yg(e){
  return Ra(e,Gg)
}function is(e){
  return Ra(e,Vg)
}function Ra(e,n){
  return e.length<=n?e:`${e.slice(0,n)}\u2026 (+${e.length-n} chars NOT SHOWN)`
}function Xg(e){
  let n=e.replace(/[^A-Za-z0-9_]+/g,"?");
  return n.length<=la?n:`${n.slice(0,la)}\u2026`
}var Jg=256,da=180,ca=60,va=32;
function p8e(e){
  return e.replace(/[^\x20-\x7e]/gu,"?")
}function x5n(e,n){
  let s=ct(e,!1);
  if(!Array.isArray(s))return;
  let[r,i,d]=s,c;
  if(typeof r==="string"&&r)c=qg(r);
  else if(Cg(r)){
    let g=n?` (${n.bytes} ${P(n.bytes,"byte")}, ${n.lines} ${P(n.lines,"line")})`:"";
    c=`script for ${r.interpreter}${g} sha256:${r.script.slice(0,va)}`
  }else return;
  let p=[];
  for(let[g,h]of[["timeout",i],["refresh",d]])if(h!=null)p.push(`${g} ${typeof h==="number"?`${h}ms`:"?"}`);
  return p.length?`${c} (${p.join(", ")})`:c
}function qg(e){
  let n=p8e(e),s=n.length>Jg,r;
  if(!s)r=b(n);
  else{
    let i=n.length-da-ca;
    r=b(`${n.slice(0,da)}\u2026(${i} chars omitted)\u2026${n.slice(-ca)}`)
  }if(s||n!==e)r=`${r} sha256:${Aa(e).slice(0,va)}`;
  return r
}function Ca(e){
  let n=Object.entries(e.envVars).map(([s,r])=>ua(s,r,""));
  for(let[s,r]of Ce(e))for(let[i,d]of Object.entries(r.envVars))n.push(ua(i,d,`${s}.env.`));
  return n
}function ua(e,n,s){
  if(!Wg.test(e))return{
    key:e,text:`${s}${Xg(e)}`
  };
  if(Lg.has(e)&&Le(n))return{
    key:e,text:`${s}${e} (adds traces to the telemetry export)`,tracesSwitch:!0
  };
  let r=Ig.test(e.toUpperCase())?jg(n):bn(n);
  return r?{
    key:e,text:`${s}${e}=${r}`,url:r
  }:{
    key:e,text:`${s}${e}`
  }
}function F1r(e){
  let{
    commandRows:n,sandboxRows:s,isolationRows:r,envRows:i,categoryRows:d
  }=Zg(e);
  return{
    commandRows:n,sandboxRows:s,isolationRows:r,envRows:i,categoryRows:d
  }
}function Zg(e){
  let n=[];
  for(let[c,p]of Object.entries(e.shellSettings)){
    if(p===void 0)continue;
    if(Sa(c)){
      let g=x5n(p,e.inlineHelperScriptSizes?.[c]);
      n.push(g?`${c}=${g}`:c);
      continue
    }n.push(ga(c,p,""))
  }for(let[c,p]of Ce(e))for(let[g,h]of Object.entries(p.shellSettings)){
    if(h===void 0)continue;
    n.push(ga(g,h,`${c}.`))
  }let s=Object.keys(e.sandboxSettings);
  for(let[c,p]of Ce(e))for(let g of Object.keys(p.sandboxSettings))s.push(`${c}.${g}`);
  let r=Object.keys(e.isolationSettings);
  for(let[c,p]of Ce(e))for(let g of Object.keys(p.isolationSettings))r.push(`${c}.${g}`);
  let i=[];
  for(let c of Ca(e))i.push(c.text);
  let d=e.hasHooks?["hooks"]:[];
  return{
    commandRows:n,sandboxRows:s,isolationRows:r,envRows:i,categoryRows:d
  }
}function ga(e,n,s){
  let r=Yg(ht(`${s}${e}`).text);
  if(e.startsWith("extraKnownMarketplaces[")){
    if(e.endsWith(".headersHelper")){
      let i=xg(n);
      if(i!==void 0){
        let d=i.url===void 0?null:BYn(i.url)??(En(i.url)?.host?rk:null);
        return`${r}: ${is(ht(i.command).text)}${d===null?"":` \u2192 ${is(ht(d).text)}`}`
      }
    }else if(e.endsWith(".source.command"))return`${r}: ${is(ht(n).text)}`
  }return r
}function Qg(e){
  let n=e.extraKnownMarketplaces;
  if(n!==void 0&&n!==null)return n;
  let s=e;
  for(let{
    alias:r,canonical:i
  }of dt){
    if(i!=="extraKnownMarketplaces")continue;
    let d=s[r];
    if(d!==void 0&&d!==null&&typeof d==="object")return d
  }return
}var oft="remote-settings.json",kn=2097152,ide="remote-settings-helper-consent";
function ogn(){
  return xa(Se(),ide)
}function Da(e){
  let n=P0(e);
  return ba(n)?n:void 0
}function U1r(e){
  let n=Da(e);
  return n&&rgn(n)
}function I5n(e){
  return pa(e,(n,s)=>s.startsWith("$")&&s!=="$schema")
}class Ma{
  sessionCache=null;
  eligible=void 0;
  eligibilityMemo=void 0;
  ineligibleReason=void 0;
  evalPolicySnapshotOnly=!1;
  lastLoadStatus=void 0;
  lastLoadStatusChanged=He();
  policySettingsNotified=!1;
  verifiedPayload=null;
  unverifiedView=null;
  projectedView=null;
  consentedPayload=null;
  deferredPayload=null;
  resetEpoch=0;
  backendView=void 0;
  replaceSessionCache(e,n){
    if(this.sessionCache=e,n?.verified){
      if(this.verifiedPayload=e,n.consentDeferred)this.deferredPayload=e
    }
  }seedFromDisk(e){
    this.sessionCache=e;
    let n=Da(e);
    if(n!==void 0){
      let s=im();
      if(s===void 0||!ds(s,n,e.claudeMd))return
    }this.consentedPayload??=e
  }markConsented(e){
    this.consentedPayload=e
  }dropConsentDeferral(){
    this.deferredPayload=null
  }markPolicySettingsNotified(){
    this.policySettingsNotified=!0
  }recordEligibility(e,n){
    if(this.eligible=e,n.memoize)this.eligibilityMemo=e,this.ineligibleReason=e?void 0:n.ineligibleReason
  }resetListener=null;
  registerResetListener(e){
    if(this.resetListener!==null)throw Error("registerSyncCacheResetListener: a listener is already registered; a second one would unhook the first");
    this.resetListener=e
  }reset(){
    this.sessionCache=null,this.eligible=void 0,this.eligibilityMemo=void 0,this.ineligibleReason=void 0,this.evalPolicySnapshotOnly=!1,this.lastLoadStatus=void 0,this.policySettingsNotified=!1,this.verifiedPayload=null,this.unverifiedView=null,this.projectedView=null,this.consentedPayload=null,this.deferredPayload=null,this.resetEpoch++,this.emitLoadStatusChanged(void 0)
  }emitLoadStatusChanged(e){
    try{
      this.lastLoadStatusChanged.emit(e)
    }catch(n){
      t(`Remote settings: load-status listener threw: ${l(n)}`,{
        level:"error"
      })
    }
  }
}var em=new q(()=>new Ma);
function le(){
  return em.of(j().host)
}function jye(){
  return le().resetEpoch
}function sgn(){
  return le().consentedPayload
}function P5n(e){
  le().markConsented(e)
}function B1r(){
  le().dropConsentDeferral()
}function f8e(e,n,s){
  le().replaceSessionCache(e,n),Ss(s)
}function $v(){
  let{
    sessionCache:e,verifiedPayload:n
  }=le();
  return e!==null&&e===n
}function sft(){
  let{
    sessionCache:e,verifiedPayload:n,consentedPayload:s,deferredPayload:r
  }=le();
  return e!==null&&e===n&&(e===s||e===r)
}function j1r(e){
  le().registerResetListener(e)
}function W1r(){
  let e=le();
  e.reset(),e.resetListener?.()
}function G1r(){
  le().markPolicySettingsNotified()
}function z1r(){
  return le().policySettingsNotified
}function V1r(e,n){
  return le().recordEligibility(e,{
    memoize:!0,ineligibleReason:n
  }),e
}function Ine(){
  return le().eligibilityMemo
}function MUt(){
  return le().ineligibleReason
}function ign(e){
  let n=le();
  n.lastLoadStatus=e,n.emitLoadStatusChanged(e)
}function jx(){
  return le().lastLoadStatus
}function DUt(e){
  return le().lastLoadStatusChanged.subscribe(e)
}function JE(){
  return
}function cUe(){
  return le().evalPolicySnapshotOnly
}function q1r(e){
  le().evalPolicySnapshotOnly=e
}function S$o(e){
  return e!==null&&le().projectedView?.view===e
}function om(e){
  return e&&cUe()?{
    ...X3n(e),managedSourcesBehavior:"merge"
  }:e
}function LUt(){
  return JE()===void 0&&Rz()
}function TJ(){
  return JE()??xa(Se(),oft)
}function O5n(){
  return
}function NUt(){
  let e=O5n();
  return e!==void 0&&e.startsWith("@")&&e.length>1?e.slice(1):void 0
}var La=8388608;
function sm(){
  if(LUt())return null;
  try{
    let e=am();
    if(e===null)return null;
    let n=J(Xo(e));
    if(!n||typeof n!=="object"||Array.isArray(n))return null;
    return I5n(n)
  }catch(e){
    if(gz(e))t(`Remote settings: Disk cache exceeds ${La} bytes; ignoring it as if absent`);
    return null
  }
}var rm=4096;
function im(){
  let e=cs();
  if(e!==void 0)return e.attestation;
  try{
    return Z1(ogn(),rm).trim()||void 0
  }catch{
    return
  }
}function am(){
  let e=cs();
  if(e!==void 0)return e.content;
  return Z1(TJ(),La)
}function cs(){
  let e=le().backendView;
  if(!N()||e===void 0||!e.ready||e.stoodDown||JE()!==void 0)return;
  if(!jde(e.configHome)){
    e.standDown("config home changed");
    return
  }return e
}var us=Re.state("remote-settings"),ps=Re.state(ide),lm=2000;
function dUe(e,n){
  le().backendView?.written(e==="cache"?us:ps,n)
}async function $Ut(e){
  if(!N()||e===void 0)return;
  let n=le();
  if(n.backendView!==void 0)return n.backendView.priming;
  if(JE()!==void 0){
    t("Remote settings: storage prime skipped (CLAUDE_CODE_REMOTE_SETTINGS_PATH override); disk probe stays");
    return
  }if(LUt())return;
  let s=new Na(e);
  return n.backendView=s,s.priming=dm(s,e,n),s.priming
}async function dm(e,n,s){
  try{
    for(let r of[ps,us]){
      let i=await n.subscribe({
        target:"key",key:r
      },(d)=>e.onEvent(d),{
        maxObservationLagMs:lm
      });
      if(!i.ok){
        e.standDown(`watch refused: ${rt(i.error)}`,"warn");
        return
      }if(e.stoodDown){
        Ua(i.value);
        return
      }e.subscriptions.push(i.value)
    }if(!await e.settled()||!await e.readUnobserved())return;
    if(e.stoodDown)return;
    e.ready=!0,t(`Remote settings: primed from storage (${za(e.content)}; helper consent ${e.attestation===void 0?"not attested":"attested"}${s.sessionCache!==null?"; cache already loaded, serving later loads":""})`)
  }catch(r){
    e.standDown(`prime failed: ${l(r)}`)
  }
}class Na{
  storageV5;
  content=null;
  attestation=void 0;
  ready=!1;
  priming=Promise.resolve();
  stoodDown=!1;
  configHome=Se();
  subscriptions=[];
  cache=Pa(us,"cache file");
  sidecar=Pa(ps,"helper consent sidecar");
  work=Promise.resolve(!0);
  steps=0;
  lastCacheStep=0;
  constructor(e){
    this.storageV5=e
  }onEvent(e){
    if(this.stoodDown)return;
    if(!e.ok){
      this.standDown(`watch ended: ${rt(e.error)}`);
      return
    }let n=this.heldOf(e.value.key);
    if(n===void 0)return;
    if(e.value.kind==="snapshot"&&n.begun)return;
    this.take(n,cm(e.value))
  }settled(){
    return this.work.then((e)=>e&&!this.stoodDown)
  }readUnobserved(){
    for(let e of[this.cache,this.sidecar])if(!e.observed)this.take(e);
    return this.settled()
  }written(e,n){
    let s=this.stoodDown?void 0:this.heldOf(e);
    if(s===void 0)return;
    if(s.begun=!0,s.generation++,s===this.cache)this.sidecar.generation++;
    if(this.advance(s),n!==null&&Buffer.byteLength(n,"utf8")>kn){
      this.standDown(`oversize ${s.label}`);
      return
    }this.install(s,n),this.follow(s,n===null)
  }heldOf(e){
    let n=mhn(e);
    return n===this.cache.id?this.cache:n===this.sidecar.id?this.sidecar:void 0
  }take(e,n){
    if(e.begun=!0,n!==void 0){
      e.pendingRead=void 0;
      let s=e.generation;
      this.queue(e,()=>e.generation===s?this.fill(e,n):!this.stoodDown)
    }return this.follow(e,n===void 0)
  }follow(e,n){
    if(n&&e.pendingRead===void 0){
      let s=this.queue(e,()=>{
        if(e.pendingRead===s)e.pendingRead=void 0;return this.read(e)
      });
      e.pendingRead=s
    }if(e===this.cache&&(this.sidecar.pendingRead??0)<this.lastCacheStep)return this.sidecar.pendingRead=void 0,this.take(this.sidecar);
    return this.work
  }queue(e,n){
    let s=this.advance(e);
    return this.work=this.work.then(n).catch((r)=>(this.standDown(`refresh failed: ${l(r)}`),!1)),s
  }advance(e){
    let n=++this.steps;
    if(e===this.cache)this.lastCacheStep=n;
    return n
  }async read(e){
    if(this.stoodDown)return!1;
    let n=e.generation;
    try{
      let s=await this.storageV5.read([{
        key:e.key,offset:0,length:kn+1
      }]);
      if(e.generation!==n){
        if(!s.ok)t(`Remote settings: a superseded read of the ${e.label} failed (${rt(s.error)}); ignored`);
        return!this.stoodDown
      }if(!s.ok){
        if(mf(s.error)==="ELOOP")return t(`Remote settings: the ${e.label} is a symlink; not read with the storage flag on (strict rule for files only Claude Code writes)`,{
          level:"warn"
        }),this.fill(e,null);
        return this.standDown(`read failed: ${rt(s.error)}`),!1
      }let r=s.value.items[0];
      if(r.found&&r.totalBytes>kn)return this.standDown(`oversize ${e.label}`),!1;
      return this.fill(e,r.found?r.value:null)
    }catch(s){
      return this.standDown(`read failed: ${l(s)}`),!1
    }
  }fill(e,n){
    if(this.stoodDown)return!1;
    if(n!==null&&n.byteLength>kn)return this.standDown(`oversize ${e.label}`),!1;
    return this.install(e,n===null?null:n_e(n)),!0
  }install(e,n){
    if(e===this.cache){
      if(e.observed&&this.ready)t(`Remote settings: storage view refreshed (${za(n)})`);
      this.content=n,this.attestation=void 0
    }else this.attestation=n?.trim()||void 0;
    e.observed=!0
  }standDown(e,n="debug"){
    let s=le();
    if(s.backendView===this)s.backendView=void 0;
    if(this.stoodDown)return;
    this.stoodDown=!0,this.content=null,this.attestation=void 0;
    for(let r of this.subscriptions.splice(0))Ua(r);
    t(`Remote settings: storage view stood down (${e}); disk probe serves`,{
      level:n
    })
  }
}function Pa(e,n){
  return{
    key:e,id:mhn(e),label:n,observed:!1,begun:!1,pendingRead:void 0,generation:0
  }
}function Ua(e){
  try{
    e.unsubscribe()
  }catch(n){
    t(`Remote settings: storage unsubscribe failed: ${l(n)}`,{
      level:"warn"
    })
  }
}function cm(e){
  switch(e.kind){
    case"snapshot":return"absent"in e?void 0:e.value;
    case"updated":return e.value;
    default:return
  }
}function za(e){
  return e===null?"absent":`${e.length} chars`
}var Ha=new Set(["HTTPS_PROXY","HTTP_PROXY","NO_PROXY","CLAUDE_CODE_PROXY_RESOLVES_HOSTS","CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER","CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS","API_FORCE_IDLE_TIMEOUT","ANTHROPIC_UNIX_SOCKET","NODE_EXTRA_CA_CERTS","CLAUDE_CODE_CERT_STORE","CLAUDE_CODE_CLIENT_CERT","CLAUDE_CODE_CLIENT_KEY","CLAUDE_CODE_CLIENT_KEY_PASSPHRASE","ALL_PROXY","NODE_OPTIONS","NODE_TLS_REJECT_UNAUTHORIZED",...G1,...LL,"AWS_ENDPOINT_URL_STS","AWS_ENDPOINT_URL","AWS_ENDPOINT_URL_SSO","AWS_ENDPOINT_URL_SSO_OIDC","AWS_ENDPOINT_URL_BEDROCK","AWS_ENDPOINT_URL_BEDROCK_RUNTIME",...Lpt,...Zn,...ymn,"CLOUDSDK_CONFIG","GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES","GCLOUD_PROJECT","CLAUDE_CODE_CUSTOM_OAUTH_URL",...I0,"CLAUDE_CODE_API_BASE_URL","CLAUDE_CODE_OAUTH_REFRESH_TOKEN","CLAUDE_CODE_OAUTH_SCOPES","CLAUDE_CODE_OAUTH_CLIENT_ID","CLAUDE_CODE_SESSION_ACCESS_TOKEN","CLAUDE_SESSION_INGRESS_TOKEN_FILE","CLAUDE_CODE_ENVIRONMENT_KIND","CLAUDE_CODE_REMOTE_SESSION_ID","ANTHROPIC_FEDERATION_RULE_ID","ANTHROPIC_ORGANIZATION_ID","ANTHROPIC_WORKSPACE_ID","ANTHROPIC_SERVICE_ACCOUNT_ID","ANTHROPIC_IDENTITY_TOKEN","ANTHROPIC_IDENTITY_TOKEN_FILE","ANTHROPIC_SCOPE","ANTHROPIC_PROFILE","ANTHROPIC_CONFIG_DIR","CLAUDE_CODE_FEDERATION_CACHE_DIR","HOME","XDG_CONFIG_HOME","APPDATA","USERPROFILE","HOMEDRIVE","HOMEPATH","PROGRAMDATA","ANTHROPIC_CUSTOM_HEADERS","CLAUDE_CODE_HOST_CREDS_FILE","CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST","CLAUDE_CODE_HOST_AUTH_ENV_VAR","CLAUDE_CONFIG_DIR","CLAUDE_SECURESTORAGE_CONFIG_DIR","CLAUDE_CODE_REMOTE_SETTINGS_PATH","CLAUDE_CODE_MANAGED_SETTINGS_PATH","CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION","CLAUDE_CODE_MOCK_REMOTE_SETTINGS","USE_LOCAL_OAUTH","USE_STAGING_OAUTH","CLAUDE_LOCAL_OAUTH_API_BASE","CLAUDE_LOCAL_OAUTH_APPS_BASE","CLAUDE_LOCAL_OAUTH_CONSOLE_BASE","CLAUDE_BRIDGE_BASE_URL","CLAUDE_BRIDGE_OAUTH_TOKEN","CLAUDE_BRIDGE_SESSION_INGRESS_URL","CLAUDE_REMOTE_TOOLS_BRIDGE_URL","CLAUDE_CODE_GB_BASE_URL"].map((e)=>e.toUpperCase()));
function ja(e){
  if(!e||!e.env&&!("managedMcpServers"in e))return e;
  let{
    managedMcpServers:n,...s
  }=e;
  return e.env?{
    ...s,env:pa(e.env,(r,i)=>Ha.has(i.toUpperCase()))
  }:s
}function K1r(e){
  return"managedMcpServers"in e||!!e.env&&Object.keys(e.env).some((s)=>Ha.has(s.toUpperCase()))?ja(e)??e:e
}function agn(){
  let e=lgn();
  if(e===null||Ka(le(),e))return!1;
  if(Ta(e))return!0;
  let n=ls(e);
  if(n.length===0)return!1;
  let{
    chain:s
  }=Cne();
  return n.some(([r,i])=>{
    let d=fa(r);return(d===void 0||s.includes(d))&&Ta(i)
  })
}function Ta(e){
  let n=e.managedMcpServers;
  return z(n)&&Object.keys(n).length>0
}function Ka(e,n){
  return n===e.verifiedPayload||Boolean(JE())
}function lgn(){
  let e=le();
  if(!JE()&&e.eligible!==!0)return null;
  if(e.sessionCache)return e.sessionCache;
  let n=cs()!==void 0,s=sm();
  if(s){
    if(e.seedFromDisk(s),n)dl().invalidatePolicyLayer();
    else Ss();
    return s
  }return null
}function Xk(){
  let e=lgn(),n=le(),s=Ka(n,e)?e:um(n,e);
  if(s===null||!cUe())return s;
  if(n.projectedView?.raw!==s)n.projectedView={
    raw:s,view:om(s)
  };
  return n.projectedView.view
}function um(e,n){
  if(n===null)return null;
  if(e.unverifiedView?.raw!==n)e.unverifiedView={
    raw:n,view:ja(n)
  };
  return e.unverifiedView.view
}function pm(e,n,s){
  if(s!==void 0&&!zde(e[n],s)||s===void 0&&!(n in e))Ode(e,n,s)
}var Ht=pm;
var On={
};
vo(On,{
  default:()=>jt
});
var Wa=typeof On=="object"&&On&&!On.nodeType&&On,$a=Wa&&typeof An=="object"&&An&&!An.nodeType&&An,gm=$a&&$a.exports===Wa,Fa=gm?j0.Buffer:void 0,Ba=Fa?Fa.allocUnsafe:void 0;
function mm(e,n){
  if(n)return e.slice();
  var s=e.length,r=Ba?Ba(s):new e.constructor(s);
  return e.copy(r),r
}var jt=mm;
function fm(e){
  var n=new e.constructor(e.byteLength);
  return new R1t(n).set(new R1t(e)),n
}var _t=fm;
function hm(e,n){
  var s=n?_t(e.buffer):e.buffer;
  return new e.constructor(s,e.byteOffset,e.length)
}var wn=hm;
function ym(e,n){
  var s=-1,r=e.length;
  n||(n=Array(r));
  while(++s<r)n[s]=e[s];
  return n
}var Rn=ym;
var Ga=Object.create,_m=function(){
  function e(){
  }return function(n){
    if(!zw(n))return{
    };
    if(Ga)return Ga(n);
    e.prototype=n;
    var s=new e;
    return e.prototype=void 0,s
  }
}(),Va=_m;
function Sm(e){
  return typeof e.constructor=="function"&&!bmt(e)?Va(XBt(e)):{
  }
}var Cn=Sm;
function bm(e){
  return OF(e)&&Pde(e)
}var Ya=bm;
var Em="[object Object]",km=Function.prototype,Am=Object.prototype,Xa=km.toString,Om=Am.hasOwnProperty,wm=Xa.call(Object);
function Rm(e){
  if(!OF(e)||c7(e)!=Em)return!1;
  var n=XBt(e);
  if(n===null)return!0;
  var s=Om.call(n,"constructor")&&n.constructor;
  return typeof s=="function"&&s instanceof s&&Xa.call(s)==wm
}var hne=Rm;
function vm(e,n){
  if(n==="constructor"&&typeof e[n]==="function")return;
  if(n=="__proto__")return;
  return e[n]
}var $t=vm;
function Cm(e,n,s,r){
  var i=!s;
  s||(s={
  });
  var d=-1,c=n.length;
  while(++d<c){
    var p=n[d],g=r?r(s[p],e[p],p,s,e):void 0;
    if(g===void 0)g=e[p];
    if(i)Ode(s,p,g);
    else QUe(s,p,g)
  }return s
}var Pe=Cm;
function Pm(e){
  return Pe(e,sxe(e))
}var Ja=Pm;
function Tm(e,n,s,r,i,d,c){
  var p=$t(e,s),g=$t(n,s),h=c.get(g);
  if(h){
    Ht(e,s,h);
    return
  }var m=d?d(p,g,s+"",e,n,c):void 0,S=m===void 0;
  if(S){
    var y=vb(g),E=!y&&wxe(g),C=!y&&!E&&P1t(g);
    if(m=g,y||E||C)if(vb(p))m=p;
    else if(Ya(p))m=Rn(p);
    else if(E)S=!1,m=jt(g,!0);
    else if(C)S=!1,m=wn(g,!0);
    else m=[];
    else if(hne(g)||mBe(g)){
      if(m=p,mBe(p))m=Ja(p);
      else if(!zw(p)||Xmt(p))m=Cn(g)
    }else S=!1
  }if(S)c.set(g,m),i(m,g,r,d,c),c.delete(g);
  Ht(e,s,m)
}var qa=Tm;
function Za(e,n,s,r,i){
  if(e===n)return;
  n8n(n,function(d,c){
    if(i||(i=new Sxe),zw(d))qa(e,n,c,s,Za,r,i);else{
      var p=r?r($t(e,c),d,c+"",e,n,i):void 0;if(p===void 0)p=d;Ht(e,c,p)
    }
  },sxe)
}var Qa=Za;
function xm(e,n,s){
  switch(s.length){
    case 0:return e.call(n);
    case 1:return e.call(n,s[0]);
    case 2:return e.call(n,s[0],s[1]);
    case 3:return e.call(n,s[0],s[1],s[2])
  }return e.apply(n,s)
}var el=xm;
var tl=Math.max;
function Im(e,n,s){
  return n=tl(n===void 0?e.length-1:n,0),function(){
    var r=arguments,i=-1,d=tl(r.length-n,0),c=Array(d);
    while(++i<d)c[i]=r[n+i];
    i=-1;
    var p=Array(n+1);
    while(++i<n)p[i]=r[i];
    return p[n]=s(c),el(e,this,p)
  }
}var Pn=Im;
function Um(e){
  return function(){
    return e
  }
}var nl=Um;
var Hm=!H1t?M1t:function(e,n){
  return H1t(e,"toString",{
    configurable:!0,enumerable:!1,value:nl(n),writable:!0
  })
},ol=Hm;
var jm=800,Km=16,$m=Date.now;
function Fm(e){
  var n=0,s=0;
  return function(){
    var r=$m(),i=Km-(r-s);
    if(s=r,i>0){
      if(++n>=jm)return arguments[0]
    }else n=0;
    return e.apply(void 0,arguments)
  }
}var sl=Fm;
var Bm=sl(ol),Tn=Bm;
function Wm(e,n){
  return Tn(Pn(e,n,M1t),e+"")
}var rl=Wm;
function Gm(e,n,s){
  if(!zw(s))return!1;
  var r=typeof n;
  if(r=="number"?Pde(s)&&gBe(n,s.length):r=="string"&&(n in s))return zde(s[n],e);
  return!1
}var z3n=Gm;
function Vm(e){
  return rl(function(n,s){
    var r=-1,i=s.length,d=i>1?s[i-1]:void 0,c=i>2?s[2]:void 0;if(d=e.length>3&&typeof d=="function"?(i--,d):void 0,c&&z3n(s[0],s[1],c))d=i<3?void 0:d,i=1;n=Object(n);while(++r<i){
      var p=s[r];if(p)e(n,p,r,d)
    }return n
  })
}var il=Vm;
var Ym=il(function(e,n,s,r){
  Qa(e,n,s,r)
}),W1=Ym;
function Xm(e,n){
  var s=-1,r=e==null?0:e.length;
  while(++s<r)if(n(e[s],s,e)===!1)break;
  return e
}var al=Xm;
function Jm(e,n){
  return e&&Pe(n,ire(n),e)
}var ll=Jm;
function qm(e,n){
  return e&&Pe(n,sxe(n),e)
}var cl=qm;
function Zm(e,n){
  return Pe(e,_mt(e),n)
}var ul=Zm;
function Qm(e,n){
  return Pe(e,pYn(e),n)
}var pl=Qm;
var ef=Object.prototype,tf=ef.hasOwnProperty;
function nf(e){
  var n=e.length,s=new e.constructor(n);
  if(n&&typeof e[0]=="string"&&tf.call(e,"index"))s.index=e.index,s.input=e.input;
  return s
}var gl=nf;
function of(e,n){
  var s=n?_t(e.buffer):e.buffer;
  return new e.constructor(s,e.byteOffset,e.byteLength)
}var ml=of;
var sf=/\w*$/;
function rf(e){
  var n=new e.constructor(e.source,sf.exec(e));
  return n.lastIndex=e.lastIndex,n
}var fl=rf;
var hl=BF?BF.prototype:void 0,yl=hl?hl.valueOf:void 0;
function af(e){
  return yl?Object(yl.call(e)):{
  }
}var _l=af;
var lf="[object Boolean]",cf="[object Date]",uf="[object Map]",gf="[object Number]",ff="[object RegExp]",hf="[object Set]",yf="[object String]",_f="[object Symbol]",Sf="[object ArrayBuffer]",bf="[object DataView]",Ef="[object Float32Array]",kf="[object Float64Array]",Af="[object Int8Array]",Of="[object Int16Array]",wf="[object Int32Array]",Rf="[object Uint8Array]",vf="[object Uint8ClampedArray]",Cf="[object Uint16Array]",Pf="[object Uint32Array]";
function xf(e,n,s){
  var r=e.constructor;
  switch(n){
    case Sf:return _t(e);
    case lf:case cf:return new r(+e);
    case bf:return ml(e,s);
    case Ef:case kf:case Af:case Of:case wf:case Rf:case vf:case Cf:case Pf:return wn(e,s);
    case uf:return new r;
    case gf:case yf:return new r(e);
    case ff:return fl(e);
    case hf:return new r;
    case _f:return _l(e)
  }
}var Sl=xf;
var Df="[object Map]";
function Mf(e){
  return OF(e)&&hBe(e)==Df
}var bl=Mf;
var El=vxe&&vxe.isMap,If=El?I1t(El):bl,kl=If;
var Lf="[object Set]";
function Nf(e){
  return OF(e)&&hBe(e)==Lf
}var Al=Nf;
var Ol=vxe&&vxe.isSet,Uf=Ol?I1t(Ol):Al,wl=Uf;
var zf=1,Hf=2,jf=4,Rl="[object Arguments]",Kf="[object Array]",$f="[object Boolean]",Ff="[object Date]",Bf="[object Error]",vl="[object Function]",Wf="[object GeneratorFunction]",Gf="[object Map]",Vf="[object Number]",Cl="[object Object]",Yf="[object RegExp]",Xf="[object Set]",Jf="[object String]",qf="[object Symbol]",Qf="[object WeakMap]",eh="[object ArrayBuffer]",th="[object DataView]",nh="[object Float32Array]",oh="[object Float64Array]",sh="[object Int8Array]",rh="[object Int16Array]",ih="[object Int32Array]",ah="[object Uint8Array]",lh="[object Uint8ClampedArray]",dh="[object Uint16Array]",uh="[object Uint32Array]",de={
};
de[Rl]=de[Kf]=de[eh]=de[th]=de[$f]=de[Ff]=de[nh]=de[oh]=de[sh]=de[rh]=de[ih]=de[Gf]=de[Vf]=de[Cl]=de[Yf]=de[Xf]=de[Jf]=de[qf]=de[ah]=de[lh]=de[dh]=de[uh]=!0;
de[Bf]=de[vl]=de[Qf]=!1;
function Dn(e,n,s,r,i,d){
  var c,p=n&zf,g=n&Hf,h=n&jf;
  if(s)c=i?s(e,r,i,d):s(e);
  if(c!==void 0)return c;
  if(!zw(e))return e;
  var m=vb(e);
  if(m){
    if(c=gl(e),!p)return Rn(e,c)
  }else{
    var S=hBe(e),y=S==vl||S==Wf;
    if(wxe(e))return jt(e,p);
    if(S==Cl||S==Rl||y&&!i){
      if(c=g||y?{
      }:Cn(e),!p)return g?pl(e,cl(c,e)):ul(e,ll(c,e))
    }else{
      if(!de[S])return i?e:{
      };
      c=Sl(e,S,p)
    }
  }d||(d=new Sxe);
  var E=d.get(e);
  if(E)return E;
  if(d.set(e,c),wl(e))e.forEach(function(x){
    c.add(Dn(x,n,s,x,e,d))
  });
  else if(kl(e))e.forEach(function(x,L){
    c.set(L,Dn(x,n,s,L,e,d))
  });
  var C=h?g?JBt:Xhn:g?sxe:ire,I=m?void 0:C(e);
  return al(I||e,function(x,L){
    if(I)L=x,x=e[L];QUe(c,L,Dn(x,n,s,L,e,d))
  }),c
}var Pl=Dn;
function ph(e){
  var n=e==null?0:e.length;
  return n?e[n-1]:void 0
}var UL=ph;
function gh(e,n,s){
  var r=-1,i=e.length;
  if(n<0)n=-n>i?0:i+n;
  if(s=s>i?i:s,s<0)s+=i;
  i=n>s?0:s-n>>>0,n>>>=0;
  var d=Array(i);
  while(++r<i)d[r]=e[r+n];
  return d
}var ift=gh;
function mh(e,n){
  return n.length<2?e:yBe(e,ift(n,0,-1))
}var Tl=mh;
var fh=Object.prototype,hh=fh.hasOwnProperty;
function yh(e,n){
  n=lre(n,e);
  var s=-1,r=n.length;
  if(!r)return!0;
  while(++s<r){
    var i=e7(n[s]);
    if(i==="__proto__"&&!hh.call(e,"__proto__"))return!1;
    if((i==="constructor"||i==="prototype")&&s<r-1)return!1
  }var d=Tl(e,n);
  return d==null||delete d[e7(UL(n))]
}var In=yh;
function _h(e){
  return hne(e)?void 0:e
}var xl=_h;
var Dl=BF?BF.isConcatSpreadable:void 0;
function Sh(e){
  return vb(e)||mBe(e)||!!(Dl&&e&&e[Dl])
}var Ml=Sh;
function Ll(e,n,s,r,i){
  var d=-1,c=e.length;
  s||(s=Ml),i||(i=[]);
  while(++d<c){
    var p=e[d];
    if(n>0&&s(p))if(n>1)Ll(p,n-1,s,r,i);
    else ymt(i,p);
    else if(!r)i[i.length]=p
  }return i
}var Nl=Ll;
function bh(e){
  var n=e==null?0:e.length;
  return n?Nl(e,1):[]
}var Ul=bh;
function Eh(e){
  return Tn(Pn(e,void 0,Ul),e+"")
}var Nn=Eh;
var kh=1,Ah=2,Oh=4,wh=Nn(function(e,n){
  var s={
  };if(e==null)return s;var r=!1;if(n=Exe(n,function(d){
    return d=lre(d,e),r||(r=d.length>1),d
  }),Pe(e,JBt(e),s),r)s=Pl(s,kh|Ah|Oh,xl);var i=n.length;while(i--)In(s,n[i]);return s
}),ss=wh;
function Rh(e,n){
  return uYn(e,n,function(s,r){
    return r8n(e,r)
  })
}var zl=Rh;
var vh=Nn(function(e,n){
  return e==null?{
  }:zl(e,n)
}),AJ=vh;
function Ch(e,n){
  return e==null?!0:In(e,n)
}var Hl=Ch;
import{
  homedir as vy
}from"os";
import{
  dirname as Cy,join as Ie,resolve as be
}from"path";
import{
  closeSync as Ft,constants as Me,fstatSync as fs,lstatSync as bt,openSync as ms,readlinkSync as Kl,readSync as Ph,statSync as Th
}from"fs";
import{
  open as xh
}from"fs/promises";
import{
  dirname as jn,resolve as Dh
}from"path";
var vd=524288,Y1r=0,w$o=2097152;
var m8e=536870912,xe=Ct({
  noFollowAny:"untried",localVolumes:void 0
},(e)=>{
  e.noFollowAny="untried",e.localVolumes=void 0
}),Mh=["/","/System/Volumes/Data"];
function $l(){
  if(xe.localVolumes!==void 0)return xe.localVolumes;
  let e=!0,n=Mh.flatMap((r)=>{
    try{
      return[Th(r).dev]
    }catch(i){
      if(v(i)!=="ENOENT")e=!1;return[]
    }
  }),s=new Set(n);
  if(e)xe.localVolumes=s;
  return s
}function Fl(e){
  if(Ih()==="rejected")return"unsupported";
  let n;
  try{
    n=hs(jn(e))
  }catch(s){
    let r=v(s);
    if(r==="ELOOP")return"link";
    if(r==="EINVAL")return"elsewhere";
    if(r==="EACCES"||r==="EPERM")return Bl(jn(e));
    throw s
  }try{
    return $l().has(fs(n).dev)?"local":"elsewhere"
  }finally{
    Ft(n)
  }
}function Bl(e){
  let n=$l(),s=jn(e);
  if(s===e)return"elsewhere";
  let r;
  try{
    r=hs(s)
  }catch(i){
    let d=v(i);
    if(d==="ELOOP")return"link";
    if(d==="EACCES"||d==="EPERM"){
      let c=Bl(s);
      return c==="local"&&!n.has(jl(e))?"elsewhere":c
    }if(d==="EINVAL")return"elsewhere";
    throw i
  }try{
    let i=fs(r).dev;
    return n.has(i)&&n.has(jl(e))?"local":"elsewhere"
  }finally{
    Ft(r)
  }
}function jl(e){
  try{
    return bt(e).dev
  }catch{
    return Number.NaN
  }
}function hs(e){
  return ms(e,Me.O_RDONLY|Me.O_DIRECTORY|Me.O_NONBLOCK|m8e|vd)
}async function v$o(){
  if(xe.noFollowAny==="untried")try{
    await(await xh("/",Me.O_RDONLY|Me.O_DIRECTORY|Me.O_NONBLOCK|m8e|vd)).close(),xe.noFollowAny="works"
  }catch(e){
    xe.noFollowAny=v(e)==="EINVAL"?"rejected":"works"
  }return xe.noFollowAny==="rejected"
}function Ih(){
  if(xe.noFollowAny==="untried")try{
    Ft(hs("/")),xe.noFollowAny="works"
  }catch(e){
    xe.noFollowAny=v(e)==="EINVAL"?"rejected":"works"
  }return xe.noFollowAny==="rejected"?"rejected":"works"
}function g8e(e,n){
  return n==="windows"&&Ln(e)&&!Il(e)||Wi(e)
}function Wl(e){
  return nI(e)||Wi(e)
}function Kn(e){
  let n=ce();
  return!ns(e)&&!Wi(e)&&pf(n,e,{
    unreadableAncestry:"unverified",surfaceNetworkRaw:!0,launchAncestry:hxe(n)
  })===void 0
}function Lh(){
  return"linux"
}var Nh=65536;
function Gl(e,n,s,r){
  let i=Lh(),d=vd|(i==="windows"?Me.O_RDONLY:Me.O_RDONLY|Me.O_NONBLOCK|Me.O_NOCTTY),c=!n&&g8e(e,i)?Hh(e,d,i,s):jh(e,n,r,d,i,s);
  if(c===null)return null;
  try{
    let p=fs(c);
    return mft(p,e,s),n_e(Uh(c,e,s))
  }finally{
    Ft(c)
  }
}function Uh(e,n,s){
  let r=[],i=0;
  while(i<=s){
    let d=Buffer.allocUnsafe(Math.min(Nh,s+1-i)),c=Ph(e,d,0,d.length,i);
    if(c===0)break;
    r.push(d.subarray(0,c)),i+=c
  }return n6n(i,n,s),Buffer.concat(r,i)
}function Vl(e,n,s){
  if(s==="macos"&&xe.noFollowAny!=="rejected")return{
    fd:ms(e,n|m8e),everyComponent:!0
  };
  return{
    fd:ms(e,s==="windows"?n:n|Me.O_NOFOLLOW),everyComponent:!1
  }
}var $n=Symbol("no procfs"),zh=Symbol("descriptor path unreadable");
function Yl(e,n){
  if(n!=="linux")return $n;
  try{
    return Kl(`/proc/self/fd/${e}`)
  }catch{
    try{
      bt("/proc/self/fd")
    }catch{
      return $n
    }return zh
  }
}function Hh(e,n,s,r){
  if(s==="macos"&&Fl(e)==="link")return St(e,"a link stands above the spelled name");
  let i=bt(e);
  if(i.isSymbolicLink())return Xl(e),St(e,"a link stands at the spelled name");
  mft(i,e,r);
  let d;
  try{
    d=Vl(e,n,s).fd
  }catch(p){
    if(v(p)!=="ELOOP")throw p;
    return St(e,"a link stands on the spelled route")
  }let c=Yl(d,s);
  return c===$n||c===e?d:Un(d,e,`the descriptor is on ${String(c)}`)
}function jh(e,n,s,r,i,d){
  if(!n&&!Kn(e))return St(e,"its route could not be examined");
  let c=!1;
  if(i==="macos"){
    let m=Fl(e);
    if(m==="link")return gs(e,n);
    c=m==="local"&&!s
  }if(!c){
    let m=bt(e);
    if(!m.isSymbolicLink())mft(m,e,d);
    else if(i==="windows")return gs(e,n)
  }let p;
  try{
    p=Vl(e,r,i)
  }catch(m){
    if(v(m)!=="ELOOP")throw m;
    return gs(e,n)
  }let{
    fd:g,everyComponent:h
  }=p;
  try{
    if(h)return g;
    let m=Yl(g,i);
    if(m!==$n)return m===e?g:Un(g,e,`the descriptor is on ${String(m)}`);
    let S=Bo(ce(),e);
    return!S.isSymlink&&S.resolvedPath===e&&(S.isCanonical||!n&&Kn(e))?g:Un(g,e,"the route no longer resolves to it")
  }catch(m){
    throw Un(g,e,"the binding check threw"),m
  }
}function gs(e,n){
  if(!n&&Kn(e))Xl(e);
  return St(e,"a link appeared on the route")
}function Xl(e){
  if(!bt(e).isSymbolicLink())return;
  let n=Dh(jn(e),Kl(e));
  if(!Kn(n))return;
  bt(n)
}function Un(e,n,s){
  return Ft(e),St(n,s)
}function St(e,n){
  return t(`boundRead: not reading ${e}: ${n}`,{
    level:"warn"
  }),null
}function Wye(e,n,s){
  let i=new Set,d=[];
  for(let c of n){
    if(i.has(c))continue;
    if(i.add(c),Math.abs(c.length-e.length)>2)continue;
    let p=_6(e,c);
    if(p<=2)d.push({
      name:c,distance:p
    })
  }return d.sort((c,p)=>c.distance-p.distance).slice(0,s).map((c)=>c.name)
}function CJ(e,n,{
  maxEditDistance:s=1
}={
}){
  let r=n.flatMap((c)=>[c.name,...c.aliases??[]]),i,d=s+1;
  for(let c of r){
    if(Math.abs(c.length-e.length)>s)continue;
    let p=_6(e,c);
    if(p<d)d=p,i=c
  }return i
}function _6(e,n){
  if(e===n)return 0;
  let s=e.length,r=n.length,i=Array.from({
    length:s+1
  },(d,c)=>Array.from({
    length:r+1
  },(p,g)=>c===0?g:g===0?c:0));
  for(let d=1;d<=s;d++)for(let c=1;c<=r;c++){
    let p=e[d-1]===n[c-1]?0:1;
    if(i[d][c]=Math.min(i[d-1][c]+1,i[d][c-1]+1,i[d-1][c-1]+p),d>1&&c>1&&e[d-1]===n[c-2]&&e[d-2]===n[c-1])i[d][c]=Math.min(i[d][c],i[d-2][c-2]+1)
  }return i[s][r]
}function we(e){
  let n=e.replace(/[\u0000-\u001f\u007f-\u009f]/g,"?");
  return n.length>128?`${n.slice(0,128)}\u2026`:n
}function Kh(){
  let e=[...c6],n=e.pop();
  return e.length===0?n??"":`${e.join(", ")} or ${n}`
}function Fn(e){
  return e.charAt(0).toUpperCase()+e.slice(1)
}function H5n(e){
  let n=e.trim().toLowerCase(),s=Mn(n).trim(),r=s!==n?" Context-size tags such as [1m] are ignored: the entry blocks the model at every context size.":"";
  if(s==="")return{
    entry:null,warning:"An empty deniedModels entry was ignored."
  };
  if(O_(s))return{
    entry:{
      kind:"family",family:s
    },...r!==""&&{
      warning:`"${we(e)}" blocks every ${Fn(s)} model.${r}`
    }
  };
  if(ug(s)||s==="default")return{
    entry:null,warning:`"${we(e)}" was ignored: it names a different model depending on the release and settings. Name the model instead, for example "claude-opus-5-5".`
  };
  let i=Tf(s),d=i!==null||s.startsWith("claude-")?s:`claude-${s}`,c=i??(d!==s?Tf(d):null);
  if(c){
    let p=d.lastIndexOf(c.base),g=p===-1?"":d.slice(p+c.base.length),h=c.trailer===void 0&&g!==""?` "${we(g)}" is ignored.`:"";
    return{
      entry:{
        kind:"model",id:c
      },...(r!==""||h!=="")&&{
        warning:`"${we(e)}" blocks ${$h(c)}.${h}${r}`
      }
    }
  }return{
    entry:{
      kind:"literal",value:s
    },warning:Bh(e,s)
  }
}function $h(e){
  let n=Fn(e.family);
  return e.minor===void 0?`every ${n} ${e.major}.x model`:`${n} ${e.major}.${e.minor} in every spelling and snapshot`
}function Bh(e,n){
  let s=`"${we(e)}" blocks only the exact model name "${we(n)}"; other spellings of the same model are not blocked.`,r=n.replace(/(\d)\.(\d)/g,"$1-$2");
  if(r!==n){
    let d=r.startsWith("claude-")?r:`claude-${r}`;
    if(Tf(d)!==null)return`${s} To block a version, write it with a hyphen: "${we(d)}".`
  }let i=new RegExp(`^(${c6.join("|")})\\s+(\\d+)(?:\\.(\\d+))?$`).exec(n);
  if(i){
    let[,d,c,p]=i;
    return p!==void 0?`${s} To block a version, write its model ID, for example "claude-${d}-${c}-${p}".`:`${s} To block only version ${c}, write "claude-${d}-${c}-0"; "claude-${d}-${c}" blocks every ${Fn(d)} ${c}.x model.`
  }if(/^[a-z]+$/.test(n)){
    let d=c6.find((c)=>_6(n,c)===1);
    return d!==void 0?`${s} If you meant the ${Fn(d)} family, write "${d}".`:`${s} To block a model family other than ${Kh()}, list its versioned IDs.`
  }return s
}function E$o(e,n){
  if(e.family!==n.family||e.major!==n.major)return!1;
  if(e.minor!==void 0&&(n.minor??0)!==e.minor)return!1;
  if(e.trailer===void 0)return!0;
  let s=n.trailer??"";
  return s===e.trailer||s.startsWith(`${e.trailer}-`)
}function FUt(e){
  let n=Jt(e.trim().toLowerCase());
  if(n==="")return{
    kind:"ignored"
  };
  if(O_(n))return{
    kind:"family",family:n
  };
  let s=n.startsWith("claude-")?n.slice(7):"";
  if(O_(s))return{
    kind:"family",family:s
  };
  if(ug(n)||n==="default")return{
    kind:"ignored"
  };
  let r=Tf(n)!==null||n.startsWith("claude-")?n:`claude-${n}`,i=Tf(r);
  return i!==null?{
    kind:"model",id:i,latest:X1r(r,i),spelling:r
  }:{
    kind:"literal",value:n
  }
}function Wh(e,n){
  let s=e.toLowerCase(),r=s.lastIndexOf(n.base);
  return r===-1?"":s.slice(r+n.base.length)
}var Gh=/^(?:arn:aws(?:-[a-z]+)*:bedrock:[a-z0-9-]*:\d*:(?:foundation-model|inference-profile)\/|(?:projects\/[^/]+\/locations\/[^/]+\/)?publishers\/anthropic\/models\/)$/;
function k$o(e,n){
  let s=e.toLowerCase(),r=s.lastIndexOf(n.base);
  if(r===-1)return!1;
  let i=s.slice(0,s.lastIndexOf("/",r)+1);
  return i===""||Gh.test(i)
}function X1r(e,n){
  return n.trailer===void 0&&Wh(e,n).startsWith("-latest")
}function T$o(e,n,s){
  return GYe(e.id,n)&&(e.id.trailer??"")===(n.trailer??"")&&(!s||e.latest)
}function M5n(e,n){
  for(let s of n){
    if(O_(s))continue;
    let r=s.indexOf(e);
    if(r===-1)continue;
    let i=r+e.length;
    if(i===s.length||s[i]==="-")return!0
  }return!1
}function Vh(e){
  return e.charAt(0).toUpperCase()+e.slice(1)
}function Jl(e){
  let n;
  for(let s of mne){
    let r=Tf(s);
    if(r!==null&&r.family===e&&!r.legacyVersionFirst&&(n===void 0||N3n(r,n)>0))n=r
  }return n?.base
}function ql(e,n){
  let s=FUt(e);
  switch(s.kind){
    case"ignored":{
      if(e.trim()==="")return"An empty availableModels entry was ignored.";
      let r=Jl("opus");
      return`"${we(e)}" in availableModels was ignored, because "availableModelsMatch" is "exact" and this name means a different model depending on the release and settings. List the model IDs you want to allow instead${r===void 0?"":`, for example "${r}"`}.`
    }case"family":{
      let r=n.filter((d)=>FUt(d).kind!=="ignored").map((d)=>Jt(d.trim().toLowerCase()));
      if(O_(e.trim().toLowerCase())&&M5n(s.family,r))return;
      let i=Jl(s.family);
      return`"${we(e)}" in availableModels allows every ${Vh(s.family)} model, including future releases, even though "availableModelsMatch" is "exact". To allow only some versions, list their model IDs instead${i===void 0?"":`, for example "${i}"`}.`
    }case"model":return;
    case"literal":return Yh(e,s.value)
  }
}function Yh(e,n){
  let s=`"${we(e)}" in availableModels allows only a model named exactly "${we(n)}".`,r=n.replace(/(\d)\.(\d)/g,"$1-$2");
  if(r!==n){
    let d=r.startsWith("claude-")?r:`claude-${r}`;
    if(Tf(d)!==null)return`${s} To allow a version, write it with a hyphen: "${we(d)}".`
  }let i=new RegExp(`^(${c6.join("|")})\\s+(\\d+)(?:\\.(\\d+))?$`).exec(n);
  if(i){
    let[,d,c,p]=i;
    return`${s} To allow a version, write its model ID, for example "claude-${d}-${c}${p!==void 0?`-${p}`:""}".`
  }return
}function J1r(e){
  return e!==void 0&&(e.commit!==void 0||e.pr!==void 0)
}function Zl(e,n){
  let s=e?.commitTrailers;
  if(typeof s==="boolean")return s?"explicit-enabled":"disabled";
  if(e!==void 0&&J1r(e))return e.commit===""?"disabled":"implicit-enabled";
  if(n!==void 0)return n?"implicit-enabled":"disabled";
  return
}var Xh=["allowManagedMcpServersOnly","allowedMcpServers","deniedMcpServers","disabledMcpjsonServers","enabledMcpjsonServers","enableAllProjectMcpServers","disableClaudeAiConnectors","managedMcpServers"];
function uUe({
  slot:e,adminTiers:n
}){
  return e?.allowManagedMcpServersOnly===!0||n.some((s)=>s.allowManagedMcpServersOnly===!0)
}function h8e({
  slot:e,adminTiers:n
}){
  return e?.allowedMcpServers??n.find((s)=>s.allowedMcpServers!==void 0)?.allowedMcpServers
}function Ql(e,n){
  return Xh.filter((s)=>e[s]!==void 0&&!Jh(s,e,n))
}function Jh(e,n,s){
  let r=s.slot??{
  };
  switch(e){
    case"deniedMcpServers":return!0;
    case"allowManagedMcpServersOnly":return n.allowManagedMcpServersOnly===uUe(s);
    case"disableClaudeAiConnectors":return n.disableClaudeAiConnectors===(r.disableClaudeAiConnectors===!0||s.adminTiers.some((i)=>i.disableClaudeAiConnectors===!0));
    case"allowedMcpServers":return So(n.allowedMcpServers,uUe(s)?h8e(s):r.allowedMcpServers);
    case"disabledMcpjsonServers":return(n.disabledMcpjsonServers??[]).every((i)=>r.disabledMcpjsonServers?.includes(i)===!0);
    case"enabledMcpjsonServers":return(n.enabledMcpjsonServers??[]).every((i)=>r.enabledMcpjsonServers?.includes(i)===!0);
    case"enableAllProjectMcpServers":return(n.enableAllProjectMcpServers??!1)===(r.enableAllProjectMcpServers??!1);
    case"managedMcpServers":{
      let i=r.managedMcpServers??{
      };
      return Object.entries(n.managedMcpServers??{
      }).every(([d,c])=>Object.hasOwn(i,d)&&So(i[d],c))
    }
  }
}import{
  join as qh
}from"path";
class ed{
  managedFilePath=void 0;
  dropInDir=void 0;
  getManagedFilePath(){
    return this.managedFilePath??=Zh(),this.managedFilePath
  }getDropInDir(){
    return this.dropInDir??=qh(Jk(),"managed-settings.d"),this.dropInDir
  }clearDropInDir(){
    this.dropInDir=void 0
  }reset(){
    this.managedFilePath=void 0,this.dropInDir=void 0
  }
}var td=new ed;
function Jk(){
  return td.getManagedFilePath()
}function Zh(){
  let e=Q1r();
  if(e!==void 0)return e;
  switch(O()){
    case"macos":return"/Library/Application Support/ClaudeCode";
    case"windows":return"C:\\Program Files\\ClaudeCode";
    default:return"/etc/claude-code"
  }
}function Q1r(){
  return
}function y8e(){
  return td.getDropInDir()
}var nd=512;
function pUe(e){
  return e.map(Qh)
}function Qh(e){
  let{
    file:n,severity:s,docLink:r,statusOnly:i,startupFatal:d,errorClass:c,preserveOnWrite:p,mcpErrorMetadata:g,userWritable:h,wslIgnored:m,substituted:S,onlySubstitutes:y,removal:E,path:C,message:I,expected:x,suggestion:L,invalidValue:F,...W
  }=e,ne=W;
  return{
    file:n,severity:s,docLink:r,statusOnly:i,startupFatal:d,errorClass:c,preserveOnWrite:p,mcpErrorMetadata:g,userWritable:h,wslIgnored:m,substituted:S,onlySubstitutes:y,removal:E,path:Bt(C),message:Bt(I),expected:x===void 0?void 0:Bt(x),suggestion:L===void 0?void 0:Bt(L),invalidValue:typeof F==="string"?Bt(F):void 0
  }
}function Bt(e){
  let n=p8e(e.replace(/\s+/gu," "));
  return n.length>nd?`${n.slice(0,nd-1)}\u2026`:n
}var ey=new Set(["bigint","symbol","void","date","map","set","transform","nan","custom","function"]);
function ORe(e,n){
  let s=n?.io??"output",r=n?.unrepresentable??"throw";
  return{
    ...pde(e,{
      ...n,unrepresentable:"any",override(i){
        let{
          jsonSchema:d,zodSchema:c
        }=i,p=c._zod.def;if(r==="throw"&&ey.has(p.type))throw Error("Schema type cannot be represented in JSON Schema");if(p.type==="undefined")d.not={
        };else if(p.type==="union"&&d.oneOf)d.anyOf=d.oneOf,delete d.oneOf;else if(p.type==="object"&&d.properties&&!d.$ref){
          let g=p.shape,h=Object.keys(g).filter((S)=>!Et(g[S],s)),m=d.additionalProperties;if(delete d.required,delete d.additionalProperties,h.length>0)d.required=h;if(m!==void 0)d.additionalProperties=m
        }ty(d,c),n?.override?.(i)
      }
    })
  }
}function Et(e,n){
  let s=e._zod.def;
  switch(s.type){
    case"undefined":return!0;
    case"transform":return!1;
    case"pipe":return Et(n==="input"?s.in:s.out,n);
    case"union":return s.options.some((r)=>Et(r,n));
    case"nullable":case"readonly":return Et(s.innerType,n);
    case"catch":return n==="input"||Et(s.innerType,n);
    case"lazy":if(e instanceof a6n)return Et(e._zod.innerType,n);
    return(n==="input"?e._zod.optin:e._zod.optout)==="optional";
    default:return(n==="input"?e._zod.optin:e._zod.optout)==="optional"
  }
}function ty(e,n){
  let s=kUe.get(n);
  if(!s)return;
  for(let r of Object.keys(e)){
    if(Object.hasOwn(s,r))continue;
    let i=e[r];
    delete e[r],e[r]=i
  }
}function ys(e){
  let n=e?nft(e):Xb(),s=ORe(n,{
    unrepresentable:"any"
  });
  return cgn(s,!1),b(s,null,2)
}var ny=/^@internal(?:\b|$)/;
function od(e){
  return typeof e==="string"&&ny.test(e)
}function cgn(e,n){
  if(Array.isArray(e)){
    for(let i of e)cgn(i,n);
    return
  }if(e===null||typeof e!=="object")return;
  let s=e;
  if(n&&od(s.description)){
    let i=s.description.replace(/^@internal\s*/,"").trim();
    if(i)s.description=i;
    else delete s.description
  }let r=s.properties;
  if(!n&&r!==null&&typeof r==="object"&&!Array.isArray(r)){
    let i=r;
    for(let d of Object.keys(i)){
      let c=i[d],p=c!==null&&typeof c==="object"&&!Array.isArray(c)?c.description:void 0;
      if(od(p)){
        if(delete i[d],Array.isArray(s.required))s.required=s.required.filter((g)=>g!==d)
      }
    }
  }for(let i of Object.values(s))cgn(i,n)
}var qe="https://code.claude.com/docs/en",oy=[{
  matches:(e)=>e.path==="permissions.defaultMode"&&e.code==="invalid_value",tip:{
    suggestion:'Valid modes: "acceptEdits" (ask before file changes), "plan" (analysis only), "bypassPermissions" (auto-accept all), or "default" (standard behavior)',docLink:`${qe}/iam#permission-modes`
  }
},{
  matches:(e)=>e.path==="apiKeyHelper"&&e.code==="invalid_type",tip:{
    suggestion:'Provide a shell command that outputs your API key to stdout. The script should output only the API key. Example: "/bin/generate_temp_api_key.sh"'
  }
},{
  matches:(e)=>e.path==="cleanupPeriodDays"&&e.code==="too_small",tip:{
    suggestion:'cleanupPeriodDays must be at least 1. To keep transcripts for a long time, set a large number (e.g. 3650 for ~10 years). To disable transcript writes entirely, remove this setting and use the --no-session-persistence CLI flag or the SDK persistSession:false option instead. (0 is rejected because it previously silently disabled all transcript writes, which users setting it to mean "never clean up" did not expect.)'
  }
},{
  matches:(e)=>e.path.startsWith("env.")&&e.code==="invalid_type",tip:{
    suggestion:'Environment variables must be strings. Wrap numbers and booleans in quotes. Example: "DEBUG": "true", "PORT": "3000"',docLink:`${qe}/settings#environment-variables`
  }
},{
  matches:(e)=>(e.path==="permissions.allow"||e.path==="permissions.deny")&&e.code==="invalid_type"&&e.expected==="array",tip:{
    suggestion:'Permission rules must be in an array. Format: ["Tool(specifier)"]. Examples: ["Bash(npm run build)", "Edit(docs/**)", "Read(~/.zshrc)"]. Use * for wildcards.'
  }
},{
  matches:(e)=>e.path.startsWith("hooks.")&&e.code==="invalid_key",tip:{
    suggestion:"Not a recognized hook event. Common events: PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, SessionEnd, Stop. Check spelling and capitalization.",docLink:`${qe}/hooks`
  }
},{
  matches:(e)=>/\.hooks\.\d+\.command$/.test(e.path)&&e.code==="invalid_type"&&e.received==="undefined",tip:{
    suggestion:'Command hooks require `command`. For exec form (no shell), set `command` to the executable and `args` to its arguments: {"type": "command", "command": "echo", "args": ["hi"]}. For shell form, set `command` to the full shell string: {"type": "command", "command": "echo hi"}.',docLink:`${qe}/hooks#exec-form-and-shell-form`
  }
},{
  matches:(e)=>e.path.includes("hooks")&&e.code==="invalid_type",tip:{
    suggestion:'Hooks use a matcher + hooks array. The matcher is a string: a tool name ("Bash"), pipe-separated list ("Edit|Write"), or empty to match all. Example: {"PostToolUse": [{"matcher": "Edit|Write", "hooks": [{"type": "command", "command": "echo Done"}]}]}'
  }
},{
  matches:(e)=>e.code==="invalid_type"&&e.expected==="boolean",tip:{
    suggestion:'Use true or false without quotes. Example: "includeCoAuthoredBy": true'
  }
},{
  matches:(e)=>e.code==="unrecognized_keys",tip:{
    suggestion:"Check for typos or refer to the documentation for valid fields",docLink:`${qe}/settings`
  }
},{
  matches:(e)=>e.code==="invalid_value"&&e.enumValues!==void 0,tip:{
    suggestion:void 0
  }
},{
  matches:(e)=>e.code==="invalid_type"&&e.expected==="object"&&e.received===null&&e.path==="",tip:{
    suggestion:"Check for missing commas, unmatched brackets, or trailing commas. Use a JSON validator to identify the exact syntax error."
  }
},{
  matches:(e)=>e.path==="permissions.additionalDirectories"&&e.code==="invalid_type",tip:{
    suggestion:'Must be an array of directory paths. Example: ["~/projects", "/tmp/workspace"]. You can also use --add-dir flag or /add-dir command',docLink:`${qe}/iam#working-directories`
  }
}],sy={
  permissions:`${qe}/iam#configuring-permissions`,env:`${qe}/settings#environment-variables`,hooks:`${qe}/hooks`
};
function sd(e){
  let n=oy.find((r)=>r.matches(e));
  if(!n)return null;
  let s={
    ...n.tip
  };
  if(e.code==="invalid_value"&&e.enumValues&&!s.suggestion)s.suggestion=`Valid values: ${e.enumValues.map((r)=>`"${r}"`).join(", ")}`;
  if(!s.docLink&&e.path)s.docLink=sy[et(e.path,".")];
  return s
}var ry=f(()=>nft(u8e(),{
  strictPolicyHelperKeys:!0
}).strict());
function rd(e){
  return e.code==="invalid_type"
}function id(e){
  return e.code==="invalid_value"
}function iy(e){
  return e.code==="unrecognized_keys"
}function ad(e){
  return e.code==="too_small"
}function ye(e){
  if(e===null)return"null";
  if(e===void 0)return"undefined";
  if(Array.isArray(e))return"array";
  return typeof e
}function ld(e){
  let n=e.match(/received (\w+)/);
  return n?n[1]:void 0
}function kt(e,n){
  return e.issues.flatMap((r)=>{
    if(r.code!=="invalid_union"||r.path.join(".")!=="attribution")return[r];let i=r.errors.flat().filter((d)=>d.path.length>0);return i.length>0?i.map((d)=>({
      ...d,path:[...r.path,...d.path]
    })):[r]
  }).map((r)=>{
    let i=r.path.map(String).join("."),d=r.message,c,p,g,h,m;if(id(r))p=r.values.map((y)=>String(y)),g=p.join(" | "),h=void 0,m=void 0;else if(rd(r)){
      g=r.expected;let y=ld(r.message);h=y??ye(r.input),m=y??ye(r.input)
    }else if(ad(r))g=String(r.minimum);else if(r.code==="custom"&&"params"in r)h=r.params.received,m=h;let S=sd({
      path:i,code:r.code,expected:g,received:h,enumValues:p,message:r.message,value:h
    });if(id(r))c=p?.map((y)=>`"${y}"`).join(", "),d=`Invalid value. Expected one of: ${c}`;else if(rd(r)){
      let y=ld(r.message)??ye(r.input);if(r.expected==="object"&&y==="null"&&i==="")d="Invalid or malformed JSON";else d=`Expected ${r.expected}, but received ${y}`
    }else if(iy(r)){
      let y=r.keys.join(", ");d=`Unrecognized ${P(r.keys.length,"field")}: ${y}`
    }else if(ad(r))d=`Number must be greater than or equal to ${r.minimum}`,c=String(r.minimum);return{
      file:n,path:i,message:d,expected:c,invalidValue:m,suggestion:S?.suggestion,docLink:S?.docLink
    }
  })
}function Z1r(e){
  try{
    let n=J(e),s=z(n)?{
      ...n
    }:n,r=Rne(s,"settings").map(rs),i=n;
    if(z(n)){
      let y=dt.map((E)=>E.alias).filter((E)=>(E in n)&&n[E]===null);
      if(y.length>0){
        let E={
          ...n
        };
        for(let C of y)delete E[C];
        i=E
      }
    }let d=ry().safeParse(i),c=d.success?[]:kt(d.error,"settings"),p=tjr(n);
    if(p!==void 0)c.push({
      path:N5n,message:`"crossSessionInbound" ${p}.`
    });
    let g=$5n(n);
    if(g!==void 0)c.push({
      path:"strictPluginOnlyCustomization",message:`"strictPluginOnlyCustomization" ${g}.`
    });
    let h=ejr(n),m=L5n(s);
    if(c.length===0&&r.length===0&&h.length===0&&m.length===0)return{
      isValid:!0
    };
    return{
      isValid:!1,error:`Settings validation failed:
`+[...r.map((y)=>`- ${y}`),...c.map((y)=>{
        let E=`- ${y.path}: ${y.message}`;if(y.suggestion)E+=`. ${y.suggestion}`;return E
      }),...m.map((y)=>`- ${y}`),...h.map((y)=>`- ${y}`)].join(`
`),fullSchema:ys()
    }
  }catch(n){
    return{
      isValid:!1,error:`Invalid JSON: ${n instanceof Error?n.message:"Unknown parsing error"}`,fullSchema:ys()
    }
  }
}function D5n(e,n){
  let s=tm(e),r=[];
  if(s&&typeof s==="object"){
    let h=s;
    for(let m of["policyHelper","policyHelpers"])if(h[m]!==void 0){
      if(h[m]!==null)r.push(m);
      delete h[m]
    }
  }let i=new Map,d=At(s,n,{
    mcpServerEntrySalvageOnly:!0,policySource:!0,marketplacePatternIndexMapOut:i
  }),c=n.startsWith("policyHelpers.")?"payload":"managedSettings",p=$5n(s);
  if(p!==void 0)return{
    error:`${c} rejected: strictPluginOnlyCustomization: ${p}`,warnings:d,strippedKeys:r
  };
  let g=Xb().safeParse(s);
  if(!g.success){
    let h=g.error.issues.slice(0,3).map((m)=>{
      let S=fy(m.path,i);return S.length?`${S.join(".")}: ${m.message}`:m.message
    }).join("; ");
    return{
      error:`${c} rejected: ${h}`,warnings:d,strippedKeys:r
    }
  }return{
    settings:g.data,warnings:d,strippedKeys:r
  }
}function ejr(e){
  if(!e||typeof e!=="object"||Array.isArray(e))return[];
  let n=e.policyHelpers;
  if(!n||typeof n!=="object"||Array.isArray(n))return[];
  let s=[],r=n;
  if(r.default!==void 0&&r.default!==null)s.push(["policyHelpers.default",r.default]);
  for(let d of FL){
    let c=r[d];
    if(c&&typeof c==="object"&&!Array.isArray(c)){
      let p=c.defaultSettings;
      if(p!==void 0&&p!==null)s.push([`policyHelpers.${d}.defaultSettings`,p])
    }
  }let i=[];
  for(let[d,c]of s){
    let p=z(c)?{
      ...c
    }:c;
    for(let h of Rne(p,d))i.push(`${d}: ${rs(h)}`);
    for(let h of L5n(p))i.push(`${d}.${h}`);
    let g=D5n(c,d);
    if("error"in g)i.push(`${d}: not a valid static settings payload \u2014 Claude Code refuses to start on it when delivered from an OS-admin policy source (${g.error})`)
  }return i
}function ay(e,n,s){
  if(!e||typeof e!=="object")return[];
  let r=e;
  if(!r.permissions||typeof r.permissions!=="object")return[];
  let i=r.permissions,d=[],c=new Map;
  for(let p of["allow","deny","ask"]){
    let g=i[p];
    if(!Array.isArray(g))continue;
    let h=g.filter((m)=>{
      if(typeof m!=="string")return d.push({
        file:n,path:`permissions.${p}`,message:`Non-string value in ${p} array was removed`,severity:"warning",invalidValue:m
      }),!1;let S=Uye(m,p);if(!S.valid){
        let y=`Invalid permission rule "${m}" was skipped: ${S.error}`;if(S.suggestion)y+=`. ${S.suggestion}`;return d.push({
          file:n,path:`permissions.${p}`,message:y,severity:"warning",invalidValue:m
        }),!1
      }return!0
    });
    if(s?.policySource&&p!=="allow"&&g.length>0&&h.length===0){
      if(!s.strictParseFollows)continue;
      c.set(p,"unreadable")
    }else if(h.length<g.length)c.set(p,"trimmed");
    i[p]=h
  }return Qo("permissions",i,(p)=>c.get(p),(p)=>d.push({
    file:n,path:p.path,message:p.message,severity:"warning",...p.substituted&&{
      substituted:p.substituted
    }
  })),d
}var ly=new Set(Mm);
function dy(e,n){
  if(!e||typeof e!=="object")return[];
  return[...Xq(e,Fr)?[{
    file:n,path:"hooks",message:`PreToolUse/PermissionRequest hooks are declared outside "hooks" (at the top level or under another key) \u2014 ${Yb}.`,severity:"fatal",docLink:"https://code.claude.com/docs/en/hooks"
  }]:[],...cy(e,n)]
}function cy(e,n){
  if(!("hooks"in e))return[];
  if(e.hooks===null||typeof e.hooks!=="object"||Array.isArray(e.hooks)){
    let i=ye(e.hooks);
    if(Array.isArray(e.hooks)&&(e.hooks.some(z)||sde(e.hooks)))return[{
      file:n,path:"hooks",message:`"hooks" must be an object mapping event names to matcher arrays; received ${i} \u2014 ${Yb}.`,invalidValue:i,docLink:"https://code.claude.com/docs/en/hooks"
    }];
    return delete e.hooks,[{
      file:n,path:"hooks",message:`"hooks" must be an object mapping event names to matcher arrays; received ${i}. This field was ignored.`,severity:"warning",invalidValue:i,docLink:"https://code.claude.com/docs/en/hooks"
    }]
  }let s=e.hooks;
  if(wne(s))return[{
    file:n,path:"hooks",message:`"hooks" must be an object mapping event names to matcher arrays; received a single matcher \u2014 ${Yb}.`,docLink:"https://code.claude.com/docs/en/hooks"
  }];
  let r=[];
  for(let i of Object.keys(s)){
    let d=zm(i);
    if(!ly.has(i)){
      if(Nye(s[i],3,{
        matchersCount:!Array.isArray(s[i])
      })){
        r.push({
          file:n,path:`hooks.${d}`,message:`"${d}" is not a hook event, but it holds PreToolUse/PermissionRequest hooks \u2014 ${Yb}.`,docLink:"https://code.claude.com/docs/en/hooks"
        });
        continue
      }delete s[i],r.push({
        file:n,path:`hooks.${d}`,message:`Unknown hook event "${d}" was ignored. Valid events: ${Mm.join(", ")}`,severity:"warning",invalidValue:d,docLink:"https://code.claude.com/docs/en/hooks",preserveOnWrite:!0
      });
      continue
    }if(!Array.isArray(s[i])){
      let c=s[i],p=ye(c);
      if(EJ.has(i)&&c!==null||Nye(c,3,{
        matchersCount:!1
      })){
        r.push({
          file:n,path:`hooks.${d}`,message:`Hook event "${d}" must be an array of matchers; received ${p} \u2014 ${Yb}.`,invalidValue:p,docLink:"https://code.claude.com/docs/en/hooks"
        });
        continue
      }delete s[i],r.push({
        file:n,path:`hooks.${d}`,message:`Hook event "${d}" must be an array of matchers; received ${p}. This entry was ignored.`,severity:"warning",invalidValue:p,docLink:"https://code.claude.com/docs/en/hooks",...c!==null&&{
          preserveOnWrite:!0
        }
      })
    }
  }for(let[i,d]of Object.entries(s)){
    let{
      stripped:c,unloadableGuards:p
    }=rn(d,i);
    for(let g of p)r.push({
      file:n,path:g.aboutType?`hooks.${i}.${g.path}.type`:`hooks.${i}.${g.path}`,message:`${g.problem} \u2014 ${Yb}.${g.aboutType?` Valid types: ${[...sn()].join(", ")}`:""}`,severity:"fatal",invalidValue:g.received,docLink:"https://code.claude.com/docs/en/hooks"
    });
    for(let g of c)r.push({
      file:n,path:g.aboutType?`hooks.${i}.${g.path}.type`:`hooks.${i}.${g.path}`,message:g.aboutType?`${g.problem}; entry ignored. Valid types: ${[...sn()].join(", ")}`:`${g.problem}; ${g.hookIndex===void 0?"matcher":"entry"} ignored.`,severity:"warning",invalidValue:g.received,docLink:"https://code.claude.com/docs/en/hooks",preserveOnWrite:!0
    })
  }if(r.length>0&&Object.keys(s).length===0)delete e.hooks;
  return r
}var uy=[{
  key:"allowedMcpServers",schema:mn
},{
  key:"deniedMcpServers",schema:fn
}];
function py(e,n,s){
  if(!e||typeof e!=="object")return[];
  let r=e,i=[];
  for(let{
    key:d,schema:c
  }of uy){
    if(!(d in r))continue;
    if(!Array.isArray(r[d])){
      if(s?.keepWholeFieldInvalid)continue;
      let h=r[d];
      delete r[d],i.push({
        file:n,path:d,message:`"${d}" must be an array; received ${ye(h)}. This field was ignored.`,severity:"warning",invalidValue:h
      });
      continue
    }let p=r[d],g=[];
    for(let h=0;h<p.length;h++){
      let m=c().safeParse(p[h]);
      if(m.success)g.push(p[h]);
      else i.push({
        file:n,path:`${d}[${h}]`,message:`Invalid entry was ignored: ${m.error.issues[0]?.message??"failed validation"}`,severity:"warning",invalidValue:p[h]
      })
    }if(g.length<p.length)r[d]=g
  }return i
}var dd=["strictKnownMarketplaces","blockedMarketplaces"];
function gy(e){
  if(!z(e))return;
  for(let n of hn())if(e[n]===null)delete e[n]
}function my(e,n,s){
  if(!z(e))return[];
  let r=[];
  for(let i of dd){
    let d=e[i];
    if(!Array.isArray(d))continue;
    let c=[],p=[];
    for(let g=0;g<d.length;g++){
      let h=gt().safeParse(d[g]);
      if(!h.success){
        c.push(d[g]),p.push(g);
        continue
      }let m=yn(h.data);
      if(m===null){
        c.push(d[g]),p.push(g);
        continue
      }if(i==="blockedMarketplaces"){
        c.push(d[g]),p.push(g),r.push({
          file:n,path:`${i}[${g}]`,message:`Unenforceable entry was kept: ${m}; it can never match a marketplace source, but marketplace restrictions stay active`,severity:"warning"
        });
        continue
      }r.push({
        file:n,path:`${i}[${g}]`,message:`Invalid entry was ignored: ${m}`,severity:"warning"
      })
    }if(c.length<d.length)e[i]=c,s?.set(i,p)
  }return r
}function L5n(e){
  if(!z(e))return[];
  let n=[];
  for(let s of dd){
    let r=e[s];
    if(!Array.isArray(r))continue;
    for(let[i,d]of r.entries()){
      let c=gt().safeParse(d);
      if(!c.success)continue;
      let p=yn(c.data);
      if(p!==null)n.push(`${s}[${i}]: ${p} \u2014 on policy tiers (managed settings) ${s==="blockedMarketplaces"?"clients keep it with a warning, but it can never match, so it blocks nothing":"clients silently strip it at load"}; in user/project/local files the key is inert; fix or remove the entry`)
    }
  }return n
}function fy(e,n){
  let s=e[0],r=e[1];
  if(typeof s!=="string"||typeof r!=="number")return e;
  let i=n.get(s)?.[r];
  return i===void 0?e:[s,i,...e.slice(2)]
}function hy(e,n){
  if(!z(e)||e.managedMcpServers===void 0)return[];
  let r=[],i=Zt(e.managedMcpServers,(d,c)=>r.push({
    file:n,path:d?`managedMcpServers.${d}`:"managedMcpServers",message:d?`Managed MCP server was ignored: ${c}`:c,severity:"warning"
  }));
  if(i===void 0)delete e.managedMcpServers;
  else e.managedMcpServers=i;
  return r
}function yy(e){
  if(!e||typeof e!=="object")return;
  let n=e.source;
  if(!n||typeof n!=="object")return;
  let s=n.source;
  return typeof s==="string"?s:void 0
}function _y(e){
  if(!e||typeof e!=="object")return!1;
  let n=e.source;
  if(!n||typeof n!=="object")return!1;
  let s=n.plugins;
  return Array.isArray(s)&&s.some(To)
}function Sy(e,n){
  if(!e||typeof e!=="object")return[];
  let s=e,r="extraKnownMarketplaces";
  if(!(r in s))return[];
  let i=s[r];
  if(!i||typeof i!=="object"||Array.isArray(i)){
    let p=ye(i);
    return delete s[r],[{
      file:n,path:r,message:`"${r}" must be an object mapping marketplace names to declarations; received ${p}. This field was ignored.`,severity:"warning",invalidValue:p
    }]
  }let d=i,c=[];
  for(let p of Object.keys(d)){
    let g=Ko().safeParse(d[p]),h,m=!1;
    if(!g.success){
      let S=yy(d[p]);
      if(S!==void 0&&!pi.has(S)||_y(d[p]))continue;
      h=dn(g.error.issues)
    }else if(g.data.source.source==="settings"&&g.data.source.name!==p)h=`key "${je(p)}" must match the settings source name "${je(g.data.source.name)}"`;
    if(h!==void 0)c.push({
      file:n,path:`${r}.${je(p)}`,message:m?"Marketplace entry was ignored: its name reads like an official Anthropic or Claude marketplace. It stays in this file: rename it (the key and the source's name) to use it, or delete it.":`Invalid marketplace entry was ignored: ${h}`,severity:"warning",...m&&{
        preserveOnWrite:!0
      }
    }),delete d[p]
  }return c
}function by(e,n){
  if(!e||typeof e!=="object")return[];
  let s=e,r="modelPicker";
  if(!(r in s))return[];
  let i=s[r];
  if(!z(i)||!Array.isArray(i.options)){
    let g=z(i)?`options: ${ye(i.options)}`:ye(i);
    return delete s[r],[{
      file:n,path:r,message:`"${r}" must be an object with an "options" array of { model, label?, description?, behavesAs? } rows; received ${g}. This field was ignored.`,severity:"warning",invalidValue:g
    }]
  }let d=[];
  if("replaceBuiltInOptions"in i&&typeof i.replaceBuiltInOptions!=="boolean"){
    let g=ye(i.replaceBuiltInOptions);
    delete i.replaceBuiltInOptions,d.push({
      file:n,path:`${r}.replaceBuiltInOptions`,message:`"replaceBuiltInOptions" must be true or false; received ${g}. This entry was ignored (the rows are added to the built-in lineup).`,severity:"warning",invalidValue:g
    })
  }let c=i.options,p=[];
  for(let g=0;g<c.length;g++){
    let h=Vo().safeParse(c[g]);
    if(h.success){
      p.push(c[g]);
      continue
    }d.push({
      file:n,path:`${r}.options.${g}`,message:`${ky(h.error.issues[0])}. This row was ignored; the other rows still apply.`,severity:"warning",invalidValue:ye(c[g])
    })
  }if(p.length!==c.length)i.options=p;
  return d
}function Ey(e,n){
  if(!e||typeof e!=="object"||Array.isArray(e))return[];
  let s=e;
  if(!("modelPricing"in s)||s.modelPricing===void 0)return[];
  let r=s.modelPricing;
  if(!r||typeof r!=="object"||Array.isArray(r))return delete s.modelPricing,[{
    file:n,path:"modelPricing",message:`"modelPricing" must be an object; received ${ye(r)}. It was ignored.`,severity:"warning"
  }];
  let i=r,d=[];
  if(i.multiplier!==void 0&&!Go().safeParse(i.multiplier).success)d.push({
    file:n,path:"modelPricing.multiplier",message:'"multiplier" must be a number greater than 0 and at most 10. It was ignored.',severity:"warning",invalidValue:i.multiplier
  }),delete i.multiplier;
  if(i.overrides!==void 0){
    let c=i.overrides;
    if(!c||typeof c!=="object"||Array.isArray(c))d.push({
      file:n,path:"modelPricing.overrides",message:`"overrides" must be an object mapping model ID to rates; received ${ye(c)}. It was ignored.`,severity:"warning"
    }),delete i.overrides;
    else{
      let p=c;
      for(let g of Object.keys(p)){
        let h=Fo().safeParse(p[g]);
        if(h.success&&g!=="constructor"&&g!=="__proto__")continue;
        let m=h.success?void 0:h.error.issues[0];
        d.push({
          file:n,path:`modelPricing.overrides.${je(g)}`,message:`Invalid pricing row was ignored (${m?`${m.path.join(".")||"row"}: ${m.message}`:"not a model ID"}).`,severity:"warning",invalidValue:p[g]
        }),delete p[g]
      }
    }
  }return d
}function ky(e){
  if(!e)return"Invalid modelPicker row";
  return`modelPicker row ${e.path.length>0?`"${e.path.join(".")}" `:""}${e.message}`.trim()
}function Oy(e,n,s){
  if(!e||typeof e!=="object"||Array.isArray(e))return[];
  let r=e,i=r.crossSessionInbound;
  if(i===void 0||cd(i))return[];
  if(s?.policySource)r.crossSessionInbound="refuse";
  else delete r.crossSessionInbound;
  return[wy(i,n,s?.policySource===!0)]
}function cd(e){
  return typeof e==="string"&&tft.includes(e)
}var N5n="crossSessionInbound";
function tjr(e){
  if(!z(e))return;
  let n=e.crossSessionInbound;
  if(n===void 0||cd(n))return;
  return ud(n)
}function $5n(e){
  if(!z(e))return;
  let n=e.strictPluginOnlyCustomization;
  if(n===void 0||n===null||typeof n==="boolean"||Array.isArray(n))return;
  return`must be true, false, or an array of surface names; received ${ye(n)}`
}function ud(e){
  let n=tft.map((r)=>`"${r}"`).join(", "),s=typeof e==="string"?`"${je(e).replace(/^<key>$/,"<value>")}"`:ye(e);
  return`must be one of ${n}; received ${s}`
}function wy(e,n,s=!1){
  let r=tft.map((d)=>`"${d}"`).join(", "),i=s?'In managed settings an unrecognized value is treated as "refuse" (the most restrictive): cross-session messages to this session are turned away until an administrator fixes it.':"This value was ignored; while it is present, cross-session messages are held for your approval instead of being delivered. Set it to one of the values above.";
  return{
    file:n,path:N5n,message:`"crossSessionInbound" ${ud(e)}. ${i}`,severity:"warning",expected:r,...s&&{
      statusOnly:!0
    }
  }
}var F5n="remoteControl.shareHostProfile";
function Ry(e,n,s){
  if(!z(e)||e.remoteControl===void 0)return[];
  let r=s?.policySource===!0,i=oUe.map((y)=>`"${y}"`).join(", "),d=r?'In managed settings this is treated as "off" (the most restrictive): Remote Control environments report nothing about this machine until an administrator fixes it.':"While it is present, Remote Control environments report nothing about this machine.",c=(y)=>({
    file:n,path:F5n,message:`${y}. ${d}`,severity:"warning",expected:i,...r?{
      statusOnly:!0
    }:{
      preserveOnWrite:!0
    }
  }),p=(y)=>typeof y==="string"?`"${je(y).replace(/^<key>$/,"<value>")}"`:ye(y),g=e.remoteControl;
  if(!z(g)){
    if(r)e.remoteControl={
      shareHostProfile:"off"
    };
    else delete e.remoteControl;
    return[c(`"remoteControl" must be an object like { "shareHostProfile": ${i.replace(/, /g," | ")} }; received ${p(g)}`)]
  }let h=[],m=Object.keys(g).filter((y)=>y!=="shareHostProfile");
  if(m.length>0){
    if(r)g.shareHostProfile="off";
    h.push(c(`"remoteControl" has an unrecognized key ${m.map((y)=>`"${je(y)}"`).join(", ")} (its only key is "shareHostProfile")`))
  }let S=g.shareHostProfile;
  if(S!==void 0&&!(typeof S==="string"&&oUe.includes(S))){
    if(r)g.shareHostProfile="off";
    else delete g.shareHostProfile;
    h.push(c(`"${F5n}" must be one of ${i}; received ${p(S)}`))
  }return h
}function At(e,n,s){
  let r=[...Rne(e,n)];
  return gy(e),r.push(...ay(e,n,{
    policySource:s?.policySource,strictParseFollows:s?.mcpServerEntrySalvageOnly
  }),...dy(e,n),...Sy(e,n),...by(e,n),...Ey(e,n),...Oy(e,n,{
    policySource:s?.policySource
  }),...Ry(e,n,{
    policySource:s?.policySource
  }),...s?.skipMcpServerEntryFilter?[]:py(e,n,{
    keepWholeFieldInvalid:s?.mcpServerEntrySalvageOnly
  }),...s?.mcpServerEntrySalvageOnly?hy(e,n):[],...s?.mcpServerEntrySalvageOnly?my(e,n,s.marketplacePatternIndexMapOut):[]),r
}function UUt(e){
  let n=new Set(e.allowedSources);
  return n.add("flagSettings"),n.add("policySettings"),Ui.filter((s)=>n.has(s))
}function Py(){
  return Ie(Jk(),"managed-settings.json")
}function aft(e){
  if(O()==="wsl"){
    let n=dft(Os(e));
    if(e.wslInherits?.()){
      let s=njr(C0,e.store);
      if(dft(s)||n)return s;
      let r=njr(Jk(),e.store);
      return{
        ...r,errors:[...s.errors,...r.errors],loadState:Yye(s.loadState,r.loadState)
      }
    }if(n)return{
      settings:null,errors:[],documentHasPolicyContent:!1,loadState:"absent"
    }
  }return njr(Jk(),e.store)
}function pd(e,n,s){
  s.push(...n.errors);
  let{
    settings:r
  }=n;
  if(!r||Object.keys(r).length===0)return;
  for(let[i,d]of _n){
    let c=i.split(".");
    if(Ee(r,c)===void 0)continue;
    let p=n.errors.find((m)=>m.substituted&&m.path===i),g=p!==void 0,h=Ee(e.merged,c);
    if(g&&h!==void 0&&!e.floors.has(i)){
      let m=c.at(-1);
      if(d.inert.has(d.read(h))){
        Hl(r,c),s.push({
          file:p.file,path:i,message:`That substitute is not applied: "${m}" keeps the value an earlier managed-settings document of this folder wrote.`,severity:"warning",statusOnly:!0
        });
        continue
      }s.push({
        file:p.file,path:i,message:`That substitute also displaces the wider "${m}" an earlier managed-settings document of this folder wrote, until this document is fixed.`,severity:"warning",statusOnly:!0
      })
    }if(g)e.floors.add(i);
    else e.floors.delete(i)
  }if(e.merged=W1(e.merged,r,S6),e.found=!0,ggn(r)&&!n.errors.some((i)=>i.onlySubstitutes))e.authored=!0
}function RJ(e){
  return O()==="wsl"&&e?[C0,Jk()]:[Jk()]
}function b6(e){
  return e.endsWith(".json")&&!e.startsWith(".")
}function V2o(e){
  return(e.isFile()||e.isSymbolicLink())&&b6(e.name)
}function njr(e,n){
  let s=[],r={
    merged:{
    },found:!1,authored:!1,floors:new Set
  },i=!1,d="absent",c=fz(Ie(e,"managed-settings.json"),n,void 0,!0);
  pd(r,c,s),i||=gUe(c),d=Yye(d,WUt(c));
  let p=Ie(e,"managed-settings.d");
  try{
    let h=n.folderListingForPolicyWalk(p),m;
    if(h!==void 0)m=h;
    else m=ce().readdirSync(p).filter(V2o).map((S)=>S.name).sort(),n.noteWalkListing(p,m);
    for(let S of m){
      let y=fz(Ie(p,S),n,void 0,!0);
      pd(r,y,s),i||=gUe(y),d=Yye(d,WUt(y))
    }
  }catch(h){
    let m=v(h);
    if(m!=="ENOENT"&&m!=="ENOTDIR")t(`managed-settings.d read failed: ${h}`,{
      level:"error"
    }),s.push(BUt(p,h,"directory")),d="didNotLoad"
  }let g=r.found&&cft(r.merged)?r.merged:null;
  return{
    settings:g,errors:s,documentHasPolicyContent:i,loadState:d,...g!==null&&!r.authored&&ggn(g)&&{
      onlySubstitutes:!0
    }
  }
}function U5n(e,n){
  if(U(e))fUe(n);
  else t(`settings file read failed at ${n}: ${e}`,{
    level:"error"
  })
}function fz(e,n,s,r){
  let i=s!==void 0?`${e}\x00pinned`:e,d=n.parsedFiles.get(i);
  if(d)return{
    ...d,settings:d.settings?tm(d.settings):null
  };
  let c=Pne(e,s,r);
  return n.parsedFiles.set(i,c),{
    ...c,settings:c.settings?tm(c.settings):null
  }
}function Os(e){
  let n=e.mdm?.();
  if(!n)return{
    settings:null,errors:[],documentHasPolicyContent:!1,loadState:"absent"
  };
  return{
    settings:n.settings&&Object.keys(n.settings).length>0?n.settings:null,errors:B5n(n.errors,()=>Qq(e)),documentHasPolicyContent:gUe(n),loadState:WUt(n),...n.onlySubstitutes&&{
      onlySubstitutes:n.onlySubstitutes
    }
  }
}function HRe(e,n){
  let s=md.get(e),r=s?.get(n);
  if(r)return gd(r);
  let i=Ty(e,n);
  if(s)s.set(n,i);
  else md.set(e,new Map([[n,i]]));
  return gd(i)
}function gd(e){
  return{
    settings:e.settings&&tm(e.settings),errors:e.errors.map((n)=>({
      ...n
    })),documentHasPolicyContent:e.documentHasPolicyContent,loadState:e.loadState,removed:e.removed,...e.onlySubstitutes&&{
      onlySubstitutes:e.onlySubstitutes
    }
  }
}var md=new WeakMap;
function Ty(e,n){
  let s=tm(e),r=At(s,n,{
    skipMcpServerEntryFilter:!0,policySource:!0
  }),i=[],d=os(Od(n,i),n).safeParse(s);
  if(!d.success)return{
    settings:null,errors:[...r,...kt(d.error,n)],documentHasPolicyContent:!1,loadState:"didNotLoad",removed:[]
  };
  let c=[...r,...i],p=e,g=Object.keys(d.data).length>0?d.data:null;
  return{
    settings:g,errors:c,documentHasPolicyContent:C$o(e,d.data),loadState:"loaded",removed:Object.keys(p).filter((h)=>Ed(h,p[h])&&d.data[h]===void 0&&c.every((m)=>m.statusOnly||m.path!==h&&!m.path.startsWith(`${h}.`))),...g!==null&&i.some((h)=>h.onlySubstitutes)&&{
      onlySubstitutes:!0
    }
  }
}function Ed(e,n){
  let s=hn();
  return s.includes(e)||dt.some(({
    alias:r,canonical:i
  })=>r===e&&s.includes(i))?ts(e,n):Sn(e)&&kd(e,n)
}function kd(e,n){
  return n===null||z(n)&&Object.keys(n).length>0&&Object.entries(n).every(([s,r])=>{
    let i=`${e}.${s}`;return ts(i,r)||Sn(i)&&kd(i,r)
  })
}function MRe(e){
  return ixe()&&(e==="managedMcpServers"||e.startsWith("managedMcpServers."))
}var dgn=["managedMcpServers","isolation"],xy=[...dgn,"deniedModels","availableModelsMatch"];
function Ad(e,n){
  if(!z(e))return[];
  let s=[];
  for(let r of xy){
    if(!(r in e))continue;
    if(delete e[r],!MRe(r))s.push({
      file:n,path:r,message:`"${r}" is only honored from managed settings and was ignored here.`,severity:"warning",preserveOnWrite:!0
    })
  }return s
}function Od(e,n){
  return(s)=>{
    if(MRe(s.path))return;
    if(n.push({
      file:e,path:s.path,message:s.message,severity:"warning",...s.statusOnly&&{
        statusOnly:s.statusOnly
      },...s.startupFatal&&{
        startupFatal:s.startupFatal
      },...s.substituted&&{
        substituted:s.substituted
      },...s.onlySubstitutes&&{
        onlySubstitutes:s.onlySubstitutes
      },...s.removal&&{
        removal:s.removal
      }
    }),s.statusOnly||s.startupFatal)t(`${e}: ${s.path}: ${s.message}`,{
      level:s.startupFatal?"error":"warn"
    })
  }
}function Qq(e){
  let n=e?.remote?e.remote():Xk(),s=!e?.remote&&!MRe("managedMcpServers")&&agn()?[{
    file:"remote managed settings",path:"managedMcpServers",message:"The organization's MCP servers in the cached remote settings are withheld until the server confirms them this session; they connect as soon as it does.",severity:"warning",statusOnly:!0
  }]:[],r=e?.remote?void 0:jx(),i=(r?.state==="stale_cache"||r?.state==="failed")&&r.failure.errorKind==="ruled_empty"?pUe(r.failure.rulings??[]):[];
  if(!n||Object.keys(n).length===0)return{
    settings:null,errors:[...s,...i],servedSnapshot:!1,documentHasPolicyContent:!1
  };
  let{
    settings:d,errors:c,documentHasPolicyContent:p,onlySubstitutes:g
  }=HRe(n,"remote managed settings");
  return{
    settings:d,errors:[...s,...i,...pUe(c)],servedSnapshot:S$o(n),documentHasPolicyContent:p,...g&&{
      onlySubstitutes:g
    }
  }
}var _8e="parent managed settings",b8e=["cleanupPeriodDays","desktopSessionCleanupPeriodDays"];
function lft(e){
  let n=e.parentManaged;
  if(!n||Object.keys(n).length===0)return{
    settings:null,errors:[]
  };
  let s=HRe(n,_8e);
  for(let r of dgn)if(s.settings?.[r]!==void 0&&!MRe(r))s.errors.push({
    file:_8e,path:r,message:`"${r}" is only honored from the organization's managed settings sources (server-managed, MDM, managed-settings.json), not from settings a host passes in, and was ignored here.`,severity:"warning",statusOnly:!0
  });
  return s
}function S8e(e){
  let n=e.flagInline;
  if(!n)return{
    settings:null,errors:[]
  };
  let s=ixe(),r=e.store.inlineFlagParse;
  if(r?.inline!==n||r.desktopSupplied!==s)r={
    inline:n,desktopSupplied:s,parsed:Dy(n)
  },e.store.inlineFlagParse=r;
  let{
    settings:i,errors:d
  }=r.parsed;
  return{
    settings:i&&tm(i),errors:d.map((c)=>({
      ...c
    }))
  }
}function Dy(e){
  let n=tm(e),s=[...Ad(n,"SDK inline settings"),...At(n,"SDK inline settings")],r=Xb().safeParse(n);
  if(!r.success)return{
    settings:null,errors:[...s,...kt(r.error,"SDK inline settings")]
  };
  if(s.some((i)=>i.severity==="fatal"))return{
    settings:null,errors:s
  };
  return{
    settings:r.data,errors:s
  }
}var ch=2097152;
function Pne(e,n,s){
  try{
    let r;
    if(n!==void 0)r=n;
    else{
      let{
        resolvedPath:i
      }=Bo(ce(),e);
      r=Z1(i,ch)
    }return Gye(r,e,s)
  }catch(r){
    return Cd(r,e)
  }
}function rjr(e,n){
  let s;
  try{
    let{
      resolvedPath:d,isSymlink:c,isCanonical:p
    }=Bo(ce(),e);
    if(c&&(!p||Wl(d)))return n.delete(e),My(e);
    let g=Gl(d,p,ch,c);
    if(g===null)return n.delete(e),Iy(e);
    s=g
  }catch(d){
    return n.delete(e),Cd(d,e)
  }let r=n.get(e),i=r!==void 0&&r.content===s?r.parsed:Gye(s,e);
  return n.set(e,{
    content:s,parsed:i
  }),{
    settings:i.settings?tm(i.settings):null,errors:i.errors
  }
}function My(e){
  return Rd(e,`Settings file leads to another host and was not read: ${e}`)
}function Iy(e){
  return Rd(e,`Settings file could not be verified against the route its check resolved, and was not read: ${e}`)
}function Rd(e,n){
  return{
    settings:null,errors:[{
      file:e,path:"",message:n,severity:"fatal"
    }],loadState:"didNotLoad"
  }
}function Gye(e,n,s){
  if(e.trim()==="")return{
    settings:{
    },errors:[],loadState:"loaded"
  };
  let r=ct(e,!1);
  if(s){
    if(!z(r))return{
      settings:null,errors:[ugn(n)],loadState:"didNotLoad"
    };
    let p=tm(r),g=At(p,n,{
      skipMcpServerEntryFilter:!0,policySource:!0
    }),h=[],m=os(Od(n,h),n).safeParse(p);
    if(!m.success)return{
      settings:null,errors:[...g,...kt(m.error,n)],documentHasPolicyContent:!1,loadState:"didNotLoad"
    };
    return{
      settings:m.data,errors:[...g,...h],documentHasPolicyContent:C$o(r,m.data),loadState:"loaded"
    }
  }let i=tm(r),d=[...Ad(i,n),...At(i,n)],c=Xb().safeParse(i);
  if(!c.success){
    let p=kt(c.error,n);
    return{
      settings:null,errors:[...d,...p]
    }
  }if(d.some((p)=>p.severity==="fatal"))return{
    settings:null,errors:d
  };
  return{
    settings:c.data,errors:d
  }
}function ugn(e,{
  userWritable:n=!1
}={
}){
  return n?{
    file:e,path:"",message:`Managed settings document (${e}) could not be parsed as a JSON object; none of its settings are in effect. Fix or remove it.`,severity:"warning",statusOnly:!0,userWritable:!0
  }:{
    file:e,path:"",message:"Managed settings document could not be parsed as a JSON object; none of its settings are in effect. Fix or remove it.",startupFatal:!0
  }
}function fUe(e){
  t(`Broken symlink or missing file encountered for settings.json at path: ${e}`)
}function zye(){
  return{
    settings:null,errors:[],loadState:"absent"
  }
}function Cd(e,n){
  if(U5n(e,n),U(e))return zye();
  return{
    settings:null,errors:[BUt(n,e)],loadState:"didNotLoad"
  }
}function BUt(e,n,s="file"){
  return{
    file:e,path:"",message:`${s==="directory"?"Managed settings drop-in directory":"Settings file"} could not be read: ${n instanceof Error?n.message:String(n)}`,severity:"fatal",errorClass:"unreadable"
  }
}function ojr(e){
  return{
    file:e,path:"wslInheritsWindowsSettings",message:`"wslInheritsWindowsSettings" in ${e} holds a value that cannot be read (it takes true or false) and no Windows administrator policy is deployed beside it (HKLM or ${C0}), so whether WSL inherits Windows policy is unknown: no Windows or managed-file policy is in effect (/etc/claude-code is not read beneath it), and unless server-managed settings supply the policy \u2014 they apply regardless \u2014 sign-in and policy enforcement fail closed until the flag is fixed.`,severity:"fatal",statusOnly:!0
  }
}function fd(e){
  return e.path==="wslInheritsWindowsSettings"&&e.severity==="fatal"
}function B5n(e,n){
  if(!e.some(fd))return e;
  if(!mUe(n()))return e;
  return e.map((s)=>fd(s)?{
    ...s,severity:"warning"
  }:s)
}function jUt(e,n){
  switch(e){
    case"userSettings":return be(Se());
    case"policySettings":return be(pgn(n));
    case"projectSettings":return be(n.projectConfigDir??pgn(n));
    case"localSettings":{
      if(n.projectConfigDir!==void 0)return be(n.projectConfigDir);
      return q1(pgn(n),n.canonicalGitRoot)
    }case"flagSettings":return n.flagPath?Cy(be(n.flagPath)):be(pgn(n))
  }
}function pgn(e){
  if(e.cwd===null)throw new IA;
  return e.cwd
}function q1(e,n){
  let s=j5n(e,n);
  if(s.decided!==void 0)return s.decided;
  if(!K2o(s.root))return s.cwdResolved;
  return s.root
}function j5n(e,n){
  let s=n?.(e);
  if(!s)return{
    decided:be(e)
  };
  let r=be(s),i=be(e);
  if(r===i)return{
    decided:r
  };
  let d;
  try{
    d=W5n()
  }catch{
    return{
      decided:i
    }
  }if(r===d)return{
    decided:i
  };
  return{
    decided:void 0,root:r,cwdResolved:i
  }
}function q2o(e){
  return dl().localStoreProbes.canonicalRootOwnerUids(e,Ly)
}function Ly(e){
  let n=ce(),s=null;
  try{
    s=n.lstatSync(Ie(e,".claude")).uid
  }catch(r){
    if(!U(r))throw r
  }return{
    rootUid:n.statSync(e).uid,gitEntryUid:Ny(e),claudeEntryUid:s
  }
}function Ny(e){
  let n=ce();
  try{
    return n.lstatSync(Ie(e,".git")).uid
  }catch(s){
    throw s
  }
}function K2o(e){
  if(typeof process.getuid!=="function"&&typeof process.geteuid!=="function")return t(`localSettings: not canonicalizing the consent store to ${e} \u2014 this platform has no uid semantics to verify directory ownership with, so the store stays at the session cwd (canonicalization is POSIX-only)`,{
    level:"warn"
  }),!1;
  let n=typeof process.geteuid==="function"?process.geteuid():process.getuid?.();
  try{
    let{
      rootUid:s,gitEntryUid:r,claudeEntryUid:i
    }=q2o(e);
    if(s===n&&r===n&&(i===null||i===n))return!0;
    return t(`localSettings: not canonicalizing the consent store to ${e} \u2014 it (uid ${s}), its .git entry (uid ${r}), or its .claude entry (uid ${i??"absent"}) is not owned by the current user (uid ${n}); the store stays at the session cwd (the pre-canonicalization behavior). If you own this repo, chown it (including .git and .claude) or run from a directory you own.`,{
      level:"warn"
    }),!1
  }catch(s){
    return t(`localSettings: not canonicalizing the consent store to ${e} \u2014 its ownership could not be verified (${s instanceof Error?s.message:String(s)}); the store stays at the session cwd`,{
      level:"warn"
    }),!1
  }
}function W5n(){
  return dl().localStoreProbes.normalizedRealHomeDir(Uy)
}function Uy(){
  let e=nm(vy());
  if(e===null)throw Error("home directory realpath unavailable");
  return xn(e)
}function sjr(e,n){
  return e==="localSettings"||e==="projectSettings"?be(pgn(n)):jUt(e,n)
}var K1={
  default:"settings.json",cowork:"cowork_settings.json"
};
function zy(e){
  if(e.coworkPlugins||a.CLAUDE_CODE_USE_COWORK_PLUGINS)return K1.cowork;
  return K1.default
}function Vye(e,n){
  switch(e){
    case"userSettings":return Ie(jUt(e,n),zy(n));
    case"projectSettings":case"localSettings":{
      if(n.cwd===null&&n.projectConfigDir===void 0)return;
      return Ie(jUt(e,n),FP(e))
    }case"policySettings":return Py();
    case"flagSettings":return n.flagPath
  }
}function FP(e){
  switch(e){
    case"projectSettings":return Ie(".claude","settings.json");
    case"localSettings":return Ie(".claude","settings.local.json")
  }
}function qye(e){
  if(e.cwd===null||q1(e.cwd,e.canonicalGitRoot)===be(e.cwd))return;
  if(e.projectConfigDir!==void 0)return;
  return Ie(be(e.cwd),FP("localSettings"))
}function w8e(e,n){
  let s=n.store.perSource.get(e);
  if(s!==void 0)return s;
  let r=hgn(e,n),i=r&&Wt(e,r,n);
  return n.store.perSource.set(e,i),i
}function A$o(e){
  return(e.parentSettingsBehavior??(Rz()?"merge":"first-wins"))==="merge"
}function Y2o(e,n=!1){
  return!e||A$o(e)||n
}var X2o=[["permissions","defaultMode"],["modelPicker","replaceBuiltInOptions"]];
function Hy(e){
  let n={
  };
  for(let{
    path:s,restrictive:r
  }of Qe()){
    let i=Ee(e,s);
    if(s[0]==="sandbox"&&st(r).includes(i))Ve(n,s,i)
  }return n.sandbox??{
  }
}function fgn(e,n){
  return Ee(e,n)
}var G5n=/^(?:Read|Edit)\((?:\.\/)?!/;
function J2o(e,n){
  let s={
  };
  if(e.allowManagedHooksOnly===!0)s.allowManagedHooksOnly=!0;
  if(e.disableCommandPluginSources===!0)s.disableCommandPluginSources=!0;
  if(e.allowManagedMcpServersOnly===!0)s.allowManagedMcpServersOnly=!0;
  if(e.disableClaudeAiConnectors===!0)s.disableClaudeAiConnectors=!0;
  if(e.syncClaudeAiSkills===!1)s.syncClaudeAiSkills=!1;
  if(e.syncClaudeAiPlugins===!1)s.syncClaudeAiPlugins=!1;
  if(e.remoteTools?.allowUnattendedServing===!1)s.remoteTools={
    ...s.remoteTools,allowUnattendedServing:!1
  };
  if(e.allowManagedPermissionRulesOnly===!0)s.allowManagedPermissionRulesOnly=!0;
  if(e.disableAutoMode==="disable")s.disableAutoMode="disable";
  let r=e.remoteControl?.shareHostProfile;
  if(r==="off"||r==="basic")s.remoteControl={
    ...s.remoteControl,shareHostProfile:r
  };
  if(Zl(e.attribution,e.includeCoAuthoredBy)==="disabled")s.attribution={
    ...s.attribution,commitTrailers:!1
  };
  if(e.attribution?.sessionUrl===!1)s.attribution={
    ...s.attribution,sessionUrl:!1
  };
  let i=e.strictPluginOnlyCustomization;
  if(i===!0||Array.isArray(i)&&i.length>0)s.strictPluginOnlyCustomization=i;
  if(e.deniedMcpServers)s.deniedMcpServers=e.deniedMcpServers;
  if(e.blockedMarketplaces?.length)s.blockedMarketplaces=e.blockedMarketplaces;
  if(e.deniedModels&&e.deniedModels.length>0)s.deniedModels=e.deniedModels;
  if(n.forceLoginOrgUUID===void 0&&e.forceLoginOrgUUID)s.forceLoginOrgUUID=e.forceLoginOrgUUID;
  for(let d of Es)if(n[d]===void 0&&e[d])Object.assign(s,{
    [d]:e[d]
  });
  if(e.enforceAvailableModels===!0)s.enforceAvailableModels=!0;
  if(e.availableModelsMatch==="exact")s.availableModelsMatch="exact";
  if(e.permissions){
    let d=AJ(e.permissions,["deny","ask"]);
    for(let c of["deny","ask"]){
      let p=d[c];
      if(p!==void 0)d[c]=p.filter((g)=>{
        if(!G5n.test(g))return!0;return t(`Ignoring ${c} rule "${g}" from the parent process's managed settings: a rule starting with "!" removes paths from the rules listed before it instead of restricting anything, so it is not merged into the policy rules. Spell the deny without the exception instead.`,{
          level:"warn"
        }),!1
      })
    }if(e.permissions.disableBypassPermissionsMode==="disable")d.disableBypassPermissionsMode="disable";
    if(e.permissions.disableAutoMode==="disable")d.disableAutoMode="disable";
    if(e.permissions.blockReadsOutsideWorkingDirectories===!0)d.blockReadsOutsideWorkingDirectories=!0;
    if(n.allowManagedPermissionRulesOnly!==!0){
      let{
        allow:c,additionalDirectories:p
      }=e.permissions;
      if(c&&n.sandbox?.network?.allowManagedDomainsOnly!==!0)d.allow=c;
      if(p)d.additionalDirectories=p
    }if(Object.keys(d).length>0)s.permissions=d
  }if(e.sandbox){
    let{
      network:d,filesystem:c,credentials:p
    }=e.sandbox,g={
    },h=d?AJ(d,["deniedDomains"]):{
    },m=c?AJ(c,["denyRead","denyWrite"]):{
    };
    if(d){
      if(n.sandbox?.network?.allowManagedDomainsOnly!==!0&&d.allowedDomains)h.allowedDomains=d.allowedDomains
    }if(Object.keys(h).length>0)g.network=h;
    if(c){
      if(n.sandbox?.filesystem?.allowManagedReadPathsOnly!==!0&&c.allowRead)m.allowRead=c.allowRead
    }if(Object.keys(m).length>0)g.filesystem=m;
    if(p){
      let S=(p.files??[]).map((C)=>C.mode==="deny"?{
        path:C.path,mode:"deny"
      }:{
        path:C.path,mode:"mask",injectHosts:[]
      }),y=(p.envVars??[]).filter((C)=>C.mode==="deny").map((C)=>({
        name:C.name,mode:"deny"
      })),E={
        ...S.length>0&&{
          files:S
        },...y.length>0&&{
          envVars:y
        }
      };
      if(p.sigv4){
        let C={
        };
        for(let I of["streaming","presigned","sigv4a"])if(p.sigv4[I]==="deny")C[I]="deny";
        E.sigv4=C
      }{
        let C=Pd(p.awsPairs??[],[]);
        if(C.length>0)E.awsPairs=C
      }if(Object.keys(E).length>0)g.credentials=E
    }if(W1(g,Hy(e)),Object.keys(g).length>0)s.sandbox=g
  }return s
}function Pd(e,n){
  let s=SRe,r=new Set(n.flatMap(hd));
  return D(e.flatMap(hd)).filter((i)=>s.includes(i)&&!r.has(i)).map((i,d)=>({
    accessKeyIdVar:i,secretAccessKeyVar:`${Rt}${d+1}_`
  }))
}function hd(e){
  if(!z(e))return[];
  return[e.accessKeyIdVar,e.secretAccessKeyVar,e.sessionTokenVar].filter((n)=>typeof n==="string")
}var Q2o=new Set([...[...qYe].filter((e)=>e!=="ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION"),...hmn,"CLAUDE_CODE_AUTO_MODE_MODEL","CLAUDE_CODE_BG_CLASSIFIER_MODEL","CLAUDE_CODE_SUBAGENT_MODEL_FORCE"]);
function Z2o(e,n){
  if(!n||!e)return null;
  let s={
  };
  if(e.model!==void 0)s.model=e.model;
  if(e.availableModels!==void 0)s.availableModels=e.availableModels;
  if(e.availableModelsMatch==="exact"||e.availableModelsMatch!==void 0&&e.availableModels!==void 0)s.availableModelsMatch=e.availableModelsMatch;
  if(e.enforceAvailableModels!==void 0)s.enforceAvailableModels=e.enforceAvailableModels;
  if(e.deniedModels!==void 0&&e.deniedModels.length>0)s.deniedModels=e.deniedModels;
  if(e.fallbackModel!==void 0)s.fallbackModel=e.fallbackModel;
  if(e.modelPicker!==void 0)s.modelPicker=e.modelPicker;
  return Object.keys(s).length>0?s:null
}function z5n(e){
  let n=[];
  for(let s of e?.deniedModels??[]){
    let{
      warning:r
    }=H5n(s);
    if(r!==void 0)n.push({
      file:"managed settings",path:"deniedModels",message:r,severity:"warning",statusOnly:!0
    })
  }return n
}function V5n(e){
  if(e?.availableModelsMatch!=="exact")return[];
  let n=e.availableModels??[];
  return n.flatMap((s)=>{
    let r=ql(s,n);return r===void 0?[]:[{
      file:"managed settings",path:"availableModels",message:r,severity:"warning",statusOnly:!0
    }]
  })
}function yd(e,n){
  let s=e.deniedModels;
  if(Object.assign(e,n),s!==void 0&&n.deniedModels!==void 0)e.deniedModels=D([...s,...n.deniedModels])
}function q5n(e){
  if(delete e.model,delete e.fallbackModel,delete e.modelPicker,delete e.modelOverrides,e.env){
    let n={
    };
    for(let[s,r]of Object.entries(e.env))if(!Q2o.has(s.toUpperCase()))n[s]=r;
    e.env=n
  }
}function ijr(e){
  let n=e.store.policy.pairedModelOverrides;
  if(n!==void 0)return n.value;
  try{
    w8e("policySettings",e)
  }catch{
  }return e.store.policy.pairedModelOverrides?.value
}function ajr(e){
  if(e.store.policy.deniedModelsOverrides===void 0)try{
    w8e("policySettings",e)
  }catch{
  }return e.store.policy.deniedModelsOverrides?.value
}function ljr(e){
  if(!e.hostManagedProvider||mgn(e).some((n)=>n.modelPricing!==void 0))return;
  return lft(e).settings?.modelPricing
}function cjr(e){
  let n=e.store.policy.hostToolSearchEnv;
  if(n!==void 0)return n.value;
  let s;
  if(e.hostManagedProvider){
    let r=lft(e).settings?.env??{
    };
    for(let[i,d]of Object.entries(r)){
      if(i==="ENABLE_TOOL_SEARCH"){
        s=d;
        break
      }if(s===void 0&&i.toUpperCase()==="ENABLE_TOOL_SEARCH")s=d
    }
  }return e.store.policy.hostToolSearchEnv={
    value:s
  },s
}function mgn(e){
  let n=e.store.policy.allTiers;
  if(n!==void 0)return n;
  let s=Jy(e);
  return e.store.policy.allTiers=s,s
}function Y1(e){
  return e==="helper"||e==="plist"||e==="hklm"||e==="file"
}function $e(){
  return O()==="macos"?"plist":"hklm"
}function djr(e){
  let n={
    ...e,remote:()=>null,helper:e.helperArmedFromRemote?.()===!1?e.helper:()=>null
  },s=BL(n),r=s.composes==="tier"?s.helper:UP(n).admin;
  return{
    forceLoginMethod:r?.forceLoginMethod,forceLoginGatewayUrl:r?.forceLoginGatewayUrl,gatewayInternalNetworks:r?.gatewayInternalNetworks
  }
}function K5n(e){
  let n=BL(e);
  if(n.composes==="tier")return"helper";
  let s=UP(e);
  if(n.composes==="remoteSlot"||s.present.remote)return"remote";
  if(s.present.mdm)return $e();
  if(s.present.file)return"file";
  if(s.parentSlice||s.hostModelOverlay)return"parent";
  let r=e.hkcu?.();
  return r&&Object.keys(r.settings).length>0?"hkcu":null
}function ujr(e){
  let n=BL(e),s=n.composes==="none"?null:n.mergedOver,r=UP(e),i=[];
  if(n.composes==="tier")i.push("helper");
  if(n.composes==="remoteSlot"||r.present.remote)i.push("remote");
  if(r.present.mdm)i.push($e());
  if(r.present.file)i.push("file");
  let d=Y5n(e)??[],[c,...p]=i,g=p.filter((m)=>m!==s&&!d.includes(m)),h=e.hkcu?.();
  if(h&&Object.keys(h.settings).length>0&&(c||r.parentSlice))g.push("hkcu");
  return g
}function pjr(e){
  let n=UP(e),s=[];
  if(n.present.remote)s.push("remote");
  if(n.present.mdm)s.push($e());
  if(n.present.file)s.push("file");
  if(n.parentSlice||n.hostModelOverlay)s.push("parent");
  if(!n.admin&&!n.parentSlice){
    let r=e.hkcu?.();
    if(r&&Object.keys(r.settings).length>0)s.push("hkcu")
  }return{
    sources:s,behavior:n.mode==="merge"?"merge":"first-wins"
  }
}function fjr(e){
  if(BL(e).composes==="tier")return!0;
  let{
    admin:n,parentSlice:s
  }=UP(e);
  return n!==null||s!==null
}function UP(e){
  let n=[],s=Qq(e),{
    settings:r,servedSnapshot:i
  }=s;
  n.push(...s.errors);
  let d=BL(e),c=d.composes==="remoteSlot"?d.helper:_s(r),p=Os(e),g=p.settings;
  n.push(...p.errors);
  let h=_s(g),m=e.file?.()??aft(e),S=m.settings;
  n.push(...m.errors);
  let y=_s(S),E=d.composes==="remoteSlot"?c!==null:mUe(s),C=mUe(p),I=mUe(m),x=bs(c,E),L=bs(h,C),F=bs(y,I),W=c!==null&&x>=Math.max(L,F),ne=h!==null&&L>=F,me=[[r,W],[g,ne],[S,y!==null]],oe=(d.composes==="remoteSlot"?d.helper:me.find(([ge,Be])=>ge!==null&&(ge===r&&i?Be:ge.managedSourcesBehavior!==void 0||Be))?.[0])?.managedSourcesBehavior,_=c!==null&&!W,w=_?null:c,T=h!==null&&!ne&&w===null,M=T?null:h,V=[],Z=[[_,"remote",c],[T,$e(),h]];
  for(let[ge,Be,We]of Z){
    if(!ge||We===null)continue;
    if(V.push([We,Be]),!ggn(We))continue;
    let Ot=Be==="remote"&&C?$e():"file";
    n.push({
      file:Kye[Be],path:Object.keys(We).find((Gt)=>!lt.includes(Gt))??"",message:`${Kye[Be]} holds only values that could not be applied as written, so ${Kye[Ot]} supplies the managed settings while that fail-closed reading still binds beside it (the most restrictive value of each such key applies), until it is fixed.`,severity:"warning",statusOnly:!0
    })
  }let{
    settings:Y,errors:ee
  }=lft(e);
  n.push(...ee);
  let ie=(C?M:null)??(I?y:null),ve=Y!==null&&(ie===null||A$o(ie)),se=[By(w,i&&d.composes!=="remoteSlot",[M,y,...ve?[AJ(Y,Es)]:[]]),M,y,...V.map(([ge])=>ge)].filter((ge)=>ge!==null),ue=[...w!==null?["remote"]:[],...M!==null?[$e()]:[],...y!==null?["file"]:[],...V.map(([,ge])=>ge)],he=w!==null&&i&&d.composes!=="remoteSlot",{
    admin:Ne,merged:Ue
  }=jy(se,oe,he,V.length),pe=Ne===null?[s,p,m].find(gUe):void 0,_e=Ne??(pe?{
  }:null),Bn={
    remote:w!==null||pe===s,mdm:M!==null||pe===p,file:y!==null||pe===m
  },ws=!(w!==null&&E&&!he)&&!(M!==null&&C)&&!I,Rs=[];
  if(Ue){
    let ge=Bn.remote?"remote":Bn.mdm?$e():"file",Be=[[M,$e()],[y,"file"]];
    for(let[We,Ot]of Be){
      if(We===null||We===se[0]||he&&We===se[1])continue;
      let Gt=mjr.filter((Vn)=>Object.values(We[Vn]??{
      }).some((Ps)=>Ps!==void 0&&Ps!==null)),[Cs]=Gt;
      if(Cs===void 0)continue;
      Rs.push(Ot),n.push({
        file:Kye[Ot],path:Cs,message:`${Gt.map((Vn)=>`"${Vn}"`).join(" and ")} in ${Kye[Ot]} ignored: policy helper configuration is read from the highest managed settings source only (${Kye[ge]} here), even with managedSourcesBehavior "merge". Configure the helper in that source instead.`,severity:"warning",statusOnly:!0
      })
    }
  }let Wn=(ge)=>ge!==null&&(ge===se[0]||Object.keys(ss(ge,R$o())).length>0),jd={
    remote:Wn(w),mdm:Wn(M),file:Wn(y)
  },Kd={
    allowManagedPermissionRulesOnly:se.some((ge)=>ge.allowManagedPermissionRulesOnly===!0)||void 0,forceLoginOrgUUID:_e?.forceLoginOrgUUID,...AJ(_e??{
    },Es),allowedMcpServers:uUe({
      slot:_e,adminTiers:se
    })||Y?.allowManagedMcpServersOnly===!0&&_e?.allowManagedMcpServersOnly!==!1?h8e({
      slot:_e,adminTiers:se
    }):_e?.allowedMcpServers,sandbox:{
      network:{
        allowManagedDomainsOnly:se.some((ge)=>ge.sandbox?.network?.allowManagedDomainsOnly===!0)||void 0
      },filesystem:{
        allowManagedReadPathsOnly:se.some((ge)=>ge.sandbox?.filesystem?.allowManagedReadPathsOnly===!0)||void 0
      }
    }
  },vs=Y2o(Ne,ws),Gn=Y&&vs?J2o(Y,Kd):null,$d=Gn&&Object.keys(Gn).length>0?Gn:null,Fd=Z2o(Y,e.hostManagedProvider);
  return{
    tiers:se,tierSources:ue,admin:_e,parentSlice:$d,hostModelOverlay:Fd,errors:n,present:Bn,mode:oe,merged:Ue,composed:jd,snapshotFirst:he,parentNeverShutOut:ws,shadowedHelperSources:Rs,parentIncluded:vs,heldEmpty:pe!==void 0
  }
}function jy(e,n,s,r){
  let i=e[0];
  if(!i)return{
    admin:null,merged:!1
  };
  let{
    managedSourcesBehavior:d,...c
  }=i,p=n==="merge"&&e.length>=2;
  if(!p&&r===0)return{
    admin:d===void 0?i:c,merged:!1
  };
  let g=e.slice(p?1:e.length-r).map((m,S)=>{
    let y=p&&s&&S===0,E=y?{
      ...m
    }:ss(m,R$o());if(!y){
      for(let I of X2o)if(Ee(E,I)!==void 0)Ve(E,I,void 0)
    }let C=Ee(E.sandbox,["enabledPlatforms"]);if(Array.isArray(C)&&C.includes(O()))Ve(E,["sandbox","enabledPlatforms"],void 0);else if(C!==void 0)delete E.sandbox;return E
  });
  if(!p)return _d(c,[i,...g]),{
    admin:c,merged:!1
  };
  let h={
  };
  for(let m of[...g].reverse())W1(h,m,ks);
  return W1(h,c,s?Wy:ks),_d(h,[i,...g]),Ky(h,[i,...g],s),{
    admin:h,merged:!0
  }
}var mjr=["policyHelper","policyHelpers"],Kye={
  remote:"server-managed settings",plist:"the managed preferences plist",hklm:"the HKLM policy key",file:"managed-settings.json"
};
function cft(e){
  return Object.keys(e).some((n)=>!lt.includes(n))
}function ggn(e){
  return Object.entries(e).some(([n,s])=>!lt.includes(n)&&!Lt(s))
}function _s(e){
  return e&&cft(e)?e:null
}function mUe(e){
  return e.settings!==null&&ggn(e.settings)&&!e.onlySubstitutes
}function bs(e,n){
  if(e===null)return-1;
  if(n)return 2;
  return ggn(e)?1:0
}function C$o(e,n){
  return Object.entries(e).some(([s,r])=>r!==null&&!Ed(s,r)&&!lt.includes(s))||n!==null&&cft(n)
}function gUe(e){
  return e.documentHasPolicyContent??(e.settings!==null&&cft(e.settings))
}function WUt(e){
  return e.loadState??(e.settings!==null?"loaded":"absent")
}function Yye(e,n){
  if(e==="didNotLoad"||n==="didNotLoad")return"didNotLoad";
  return e==="loaded"||n==="loaded"?"loaded":"absent"
}function dft(e){
  return e.userWritable!==!0&&(gUe(e)||e.loadState==="didNotLoad")
}function Ky(e,n,s){
  let r=n.findIndex((d)=>d.availableModels!==void 0),i=n.findIndex((d)=>d.modelOverrides!==void 0);
  if(i!==-1&&(r===-1||i<=r||s&&r===0))e.modelOverrides={
    ...n[i].modelOverrides
  };
  else delete e.modelOverrides
}var Td=["allowedMcpServers","availableModels","strictKnownMarketplaces","allowedChannelPlugins"],$y=["awsPairs","ripgrep"];
function xd(e,n,s){
  if(n===void 0)return e;
  if(Array.isArray(n))return s==="awsPairs"&&Array.isArray(e)?[...n,...Pd(e,n)]:[...n];
  if(!z(n))return n;
  return io(n,(r)=>Array.isArray(r)?[...r]:r)
}var Fy=["allowedMcpServers","availableModels","strictKnownMarketplaces","allowedChannelPlugins","allowedMarketplaces","allowedHttpHookUrls","httpHookAllowedEnvVars"],Es=["allowedMcpServers","availableModels","strictKnownMarketplaces"];
function By(e,n,s){
  if(e===null||!n)return e;
  let r=Fy.filter((i)=>s.some((d)=>d?.[i]!==void 0));
  return r.length===0?e:ss(e,r)
}function ks(e,n,s){
  if(s!==void 0&&(Td.includes(s)||$y.includes(s)))return xd(e,n,s);
  return Md(e,n,s)
}function Wy(e,n,s){
  if(s!==void 0&&Td.includes(s))return xd(e,n,s);
  return Md(e,n,s)
}function Md(e,n,s){
  if(Array.isArray(e)&&Array.isArray(n)&&s!=="fallbackModel")return D([...n,...e]);
  return S6(e,n,s)
}function _d(e,n){
  let s=n[0],r=e;
  for(let{
    path:i,restrictive:d
  }of Qe()){
    let c=st(d),p=Math.min(...n.map((g)=>c.indexOf(Ee(g,i))).filter((g)=>g!==-1));
    if(Number.isFinite(p))Ve(r,i,c[p]);
    else if(Ee(s,i)===void 0&&Ee(e,i)!==void 0)Ve(r,i,void 0)
  }if(e.strictPluginOnlyCustomization!==!0){
    let i=D(n.flatMap((d)=>Array.isArray(d.strictPluginOnlyCustomization)?d.strictPluginOnlyCustomization:[]));
    if(i.length>0)e.strictPluginOnlyCustomization=i;
    else if(s?.strictPluginOnlyCustomization===void 0)delete e.strictPluginOnlyCustomization
  }
}function Y5n(e){
  let n=e.store.policy.mergedSources;
  if(n!==void 0)return n.value;
  let s=Gy(e);
  return e.store.policy.mergedSources={
    value:s
  },s
}function Gy(e){
  if(BL(e).composes==="tier")return null;
  let{
    merged:n,composed:s
  }=UP(e);
  if(!n)return null;
  let r=[];
  if(s.remote)r.push("remote");
  if(s.mdm)r.push($e());
  if(s.file)r.push("file");
  return r
}function BL(e){
  let n=e.helper?.()??null;
  if(!n)return{
    composes:"none"
  };
  let s=e.helperArmedFromRemote?.()===!1?"tier":"remoteSlot";
  if(e.helperMergesOutput?.()!==!0)return{
    composes:s,helper:n,mergedOver:null
  };
  if(!e.store.policy.mergedHelper){
    let{
      base:r,mergedOver:i
    }=s==="remoteSlot"?{
      base:Qq(e).settings,mergedOver:"remote"
    }:Id(e);
    e.store.policy.mergedHelper={
      helper:eVo(r,n),mergedOver:Object.keys(Nd(r)).length>0?i:null
    }
  }return{
    composes:s,...e.store.policy.mergedHelper
  }
}function Id(e){
  let n=Os(e);
  if(UP({
    ...e,helper:void 0
  }).present.mdm)return{
    base:n.settings,mergedOver:$e(),errors:n.errors
  };
  let s=e.file?.()??aft(e);
  return{
    base:s.settings,mergedOver:"file",errors:[...n.errors,...s.errors]
  }
}function Nd(e){
  return ss(e??{
  },mjr)
}function Vy(e,n){
  let s=new Map;
  for(let[i,d]of Object.entries(n)){
    let c=i.toUpperCase();
    if(!s.has(c))s.set(c,d)
  }let r={
  };
  for(let[i,d]of Object.entries(e))r[i]=s.get(i.toUpperCase())??d;
  return Object.assign(r,n)
}var Yy=["forceLoginOrgUUID","gatewayInternalNetworks","allowedHttpHookUrls","httpHookAllowedEnvVars","allowRead"];
function Xy(e,n,s){
  let r=s!==void 0&&n!==void 0&&Yy.includes(s)?n:ks(e,n,s);
  return r===n&&Array.isArray(r)?[...r]:r
}function eVo(e,n){
  let s=Nd(e),r=W1({
  },s,n,Xy);
  if(s.env&&n.env)r.env=Vy(s.env,n.env);
  return r
}function gjr(e){
  let n=BL(e);
  if(n.composes==="tier")return[n.helper];
  let{
    tiers:s,tierSources:r,present:i,merged:d,snapshotFirst:c
  }=UP(e),p=s.filter((g,h)=>r[h]==="file"?i.file:r[h]!=="remote"&&i.mdm);
  if(d)return p;
  if(i.remote&&!c)return[];
  return p.slice(0,1)
}function Jy(e){
  let n=BL(e);
  if(n.composes==="tier")return[n.helper];
  let{
    tiers:s,parentSlice:r
  }=UP(e);
  return r?[...s,r]:s
}function hjr(e){
  let n=e.store.policy.adminTiers;
  if(n!==void 0)return n;
  let s=BL(e),r=s.composes==="tier"?[s.helper]:UP(e).tiers;
  return e.store.policy.adminTiers=r,r
}function yjr(e,n){
  let s=e.mdm?.().userWritable===!0,r=BL(e);
  if(r.composes==="tier")return e.helperArmedFromUserWritableBase?.()!==!1||e.helperMergesOutput?.()===!0&&s?[]:[r.helper];
  let{
    tiers:i,tierSources:d,parentSlice:c,parentNeverShutOut:p,merged:g,snapshotFirst:h
  }=UP(e),m={
    remoteVerified:n,mdmUserWritable:s
  },S=i.filter((y,E)=>Sd(d[E],m));
  if(c!==null&&!p&&Sd(d[g&&h?1:0],m))S.push(c);
  return S
}function Sd(e,{
  remoteVerified:n,mdmUserWritable:s
}){
  switch(e){
    case"remote":return n;
    case"plist":case"hklm":return!s;
    case"file":return!0;
    case void 0:return!1
  }
}function _jr(e){
  if(BL(e).composes==="tier")return[];
  let{
    tiers:n,tierSources:s
  }=UP(e);
  return Ud(n,s,w8e("policySettings",e)??{
  })
}function Ud(e,n,s){
  let r={
    slot:s,adminTiers:e
  };
  return e.flatMap((i,d)=>{
    let c=n[d],p=Ql(i,r);return c!==void 0&&p.length>0?[{
      source:c,keys:p
    }]:[]
  })
}function bjr(e){
  if(BL(e).composes==="tier")return!1;
  return UP(e).parentIncluded
}function Sjr(e){
  let{
    tiers:n,admin:s,parentSlice:r
  }=UP({
    ...e,helper:void 0
  });
  if(n.some((i)=>i.forceRemoteSettingsRefresh===!0))return!0;
  return!s&&!r&&e.hkcu?.().settings.forceRemoteSettingsRefresh===!0
}function wjr(e){
  let n=e.store.policy.durableTiers;
  if(n!==void 0)return n;
  let s=qy(e);
  return e.store.policy.durableTiers=s,s
}function qy(e){
  let n=BL(e);
  if(n.composes==="tier")return[n.helper];
  let{
    tiers:s,admin:r
  }=UP(e);
  if(!r){
    let i=e.hkcu?.();
    if(i&&Object.keys(i.settings).length>0)return[i.settings]
  }return s
}function vjr(e){
  let n=e.store.policy.adminAuthored;
  if(n!==void 0)return n.value;
  let s=Zy(e);
  return e.store.policy.adminAuthored={
    value:s
  },s
}function Zy(e){
  let n=BL(e);
  if(n.composes==="tier")return n.helper;
  let{
    admin:s,parentSlice:r
  }=UP(e);
  if(s)return s;
  if(r)return null;
  let i=e.hkcu?.();
  return i&&Object.keys(i.settings).length>0?i.settings:null
}var zd=["apiKeyHelper","awsAuthRefresh","awsCredentialExport","gcpAuthRefresh"];
var X5n=[...zd,"otelHeadersHelper","proxyAuthHelper"];
function Wt(e,n,s){
  let r=X5n.some((p)=>n[p]!==void 0);
  if(!r&&e!=="policySettings")return n;
  let i=s.credentialHelperKeysFrom(e);
  if(i==="as_read")return n;
  let d=e==="policySettings"&&i==="machine_admin"?Qy(s):{
  };
  if(!r&&Object.keys(d).length===0)return n;
  let c={
    ...n
  };
  for(let p of X5n)delete c[p];
  return Object.assign(c,d)
}function Qy(e){
  let n=J5n(e),s={
  };
  for(let r of X5n){
    let i=n?.[r];
    if(i!==void 0)s[r]=i
  }return s
}function J5n(e){
  let n=e.helperArmedFromRemote?.()===!1&&e.helperArmedFromUserWritableBase?.()===!1,s={
    ...e,store:new ZYn,remote:()=>null,helper:n?e.helper:()=>null,...e.mdm?.().userWritable===!0&&{
      mdm:()=>({
        settings:{
        },errors:[]
      })
    }
  },r=BL(s);
  return r.composes==="tier"?r.helper:UP(s).admin
}var tVo=[...X5n,"forceLoginOrgUUID","forceLoginMethod","forceLoginGatewayUrl","gatewayInternalNetworks","parentSettingsBehavior","env","modelPicker",...mjr,...lt];
function R$o(){
  return tVo
}function e_(e){
  return $s.some((n)=>e.startsWith(n))||Ks.includes(e)
}function x$o(e,n,s,r=0){
  let i=new Map,d=new Map,c=!1;
  for(let[p,g]of e.entries()){
    let h=new Set,m=n?.[p]===!0;
    for(let[S,y]of Object.entries(g??{
    })){
      let E=S.toUpperCase(),C=e_(E);
      if(C&&y.trim()==="")continue;
      if(C&&c)continue;
      if(C&&p>r&&n?.[p]===!0)continue;
      let I=i.get(E);
      if(I!==void 0){
        if(h.has(E))d.set(S,y);
        else if(!d.has(S))d.set(S,I);
        continue
      }if(p>r&&s?.[p]?.has(E))continue;
      if(d.set(S,y),h.add(E),i.set(E,y),C)m=!0
    }if(m)c=!0
  }return Object.fromEntries(d)
}var t_="CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION";
function Ejr(e,n){
  let s=e.store.policy.adminTierEnvView;
  if(s!==void 0)return s[n];
  let r=mgn(e),i=a.CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION===!0?r[0]?.env??{
  }:x$o(r.map((c)=>c.env)),d={
  };
  for(let[c,p]of Object.entries(i)){
    let g=c.toUpperCase();
    if(c===g||!(g in d))d[g]=p
  }return e.store.policy.adminTierEnvView=d,d[n]
}function bd(e){
  if(!e)return;
  let n={
  };
  for(let[s,r]of Object.entries(e))if(s.toUpperCase()!==t_)n[s]=r;
  return n
}function o_(e,n){
  let s=Object.entries(e??{
  }),r=n??{
  };
  return s.length===Object.keys(r).length&&s.every(([i,d])=>r[i]===d)
}function I$o(e){
  let n=BL(e),s=(e.helperWarnings?.()??[]).filter((x)=>!MRe(x.path));
  if(n.composes==="tier"){
    let{
      helper:x
    }=n;
    e.store.lastPolicyEnvComposition=null;
    let L=e.hostManagedProvider?{
      ...x
    }:x;
    if(e.hostManagedProvider)q5n(L);
    e.store.policy.pairedModelOverrides={
      value:e.hostManagedProvider&&x.availableModels!==void 0?x.modelOverrides:void 0
    },e.store.policy.deniedModelsOverrides={
      value:e.hostManagedProvider?x.modelOverrides:void 0
    };
    let F=e.store.policy.helperBaseStatusNotices??=[...e.helperMergesOutput?.()===!0?Id(e).errors.filter((W)=>!W.statusOnly):[],...UP(e).errors.filter((W)=>W.statusOnly)];
    return{
      settings:L,errors:[...F,...s]
    }
  }let{
    tiers:r,tierSources:i,admin:d,parentSlice:c,hostModelOverlay:p,errors:g,present:h,snapshotFirst:m
  }=UP(e);
  if(g.push(...s),!d&&!c){
    e.store.lastPolicyEnvComposition=null,e.store.policy.pairedModelOverrides={
      value:void 0
    },e.store.policy.deniedModelsOverrides={
      value:void 0
    };
    let x=e.hkcu?.();
    if(x&&Object.keys(x.settings).length>0){
      let L=e.hostManagedProvider?{
        ...x.settings
      }:x.settings;
      if(e.hostManagedProvider){
        if(q5n(L),p)yd(L,p)
      }return{
        settings:L,errors:[...g,...x.errors]
      }
    }if(p)return{
      settings:{
        ...p
      },errors:[...g,...x?.errors??[]]
    };
    return{
      settings:null,errors:[...g,...x?.errors??[]]
    }
  }let S=W1({
  },c??{
  },d??{
  },S6);
  if(c?.availableModelsMatch==="exact")S.availableModelsMatch="exact";
  if(r.some((x)=>x.forceRemoteSettingsRefresh===!0))S.forceRemoteSettingsRefresh=!0;
  let y=a.CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION===!0,E=S.env;
  if(!y){
    let x=x$o(r.map((L)=>L.env),r.map((L)=>(L.otelHeadersHelper??"").trim()!==""),r.map((L)=>{
      let F=new Set;for(let W of zd){
        let ne=L[W];if(typeof ne==="string"&&ne.trim()!=="")for(let me of Fs[W])F.add(me)
      }return F.size>0?F:void 0
    }),m?1:0);
    if(Object.keys(x).length>0)S.env=x;
    else delete S.env
  }if(S.env){
    let x=bd(S.env);
    if(x&&Object.keys(x).length>0)S.env=x;
    else delete S.env
  }if(e.hostManagedProvider){
    if(q5n(S),p)yd(S,p)
  }let C={
    env:bd(E)
  };
  if(e.hostManagedProvider)q5n(C);
  let I=!y&&!o_(S.env,C.env);
  e.store.lastPolicyEnvComposition={
    unionOptedOut:y,unionChangedEnv:I,remoteTierPresent:h.remote,mdmTierPresent:h.mdm,fileTierPresent:h.file,adminTierCount:r.length,tiersWithEnv:B(r,(x)=>Object.keys(x.env??{
    }).length>0)
  },e.store.policy.pairedModelOverrides={
    value:e.hostManagedProvider&&d?.availableModels!==void 0&&d.modelOverrides!==void 0&&p?.availableModels===void 0?d.modelOverrides:void 0
  },e.store.policy.deniedModelsOverrides={
    value:e.hostManagedProvider?d?.modelOverrides:void 0
  };
  for(let{
    source:x,keys:L
  }of Ud(r,i,S)){
    let[F]=L;
    if(F===void 0)continue;
    let W=Kye[x],ne=L.length===1;
    g.push({
      file:W,path:F,message:`${L.map((me)=>`"${me}"`).join(" and ")} in ${W} ${ne?"is":"are"} not applied: ${W} is not the managed settings source that applies for ${ne?"this key":"these keys"} (/status lists the setting sources). Remove ${ne?"it":"them"} from ${W}, or set ${ne?"it":"them"} in the source that applies.`,severity:"warning",statusOnly:!0
    })
  }return{
    settings:S,errors:g
  }
}function hgn(e,n,{
  includeLegacyLocalSettings:s=!0
}={
}){
  if(e==="policySettings")return I$o(n).settings;
  let r=Vye(e,n),{
    settings:i
  }=r?fz(r,n.store,e==="flagSettings"?n.flagExpectedContent:void 0):{
    settings:null
  };
  if(e==="flagSettings"){
    let{
      settings:d
    }=S8e(n);
    if(d)return W1(i||{
    },d,S6)
  }if(e==="localSettings"&&s){
    let d=qye(n);
    if(d){
      let{
        settings:c
      }=fz(d,n.store);
      if(c)return n.onLegacyLocalSettingsRead?.("per_source"),W1(c,i||{
      },S6)
    }
  }return i
}function kjr(e,n){
  let s=[],r=Vye(e,n);
  if(r)s.push(...fz(r,n.store,e==="flagSettings"?n.flagExpectedContent:void 0).errors);
  if(e==="flagSettings")s.push(...S8e(n).errors);
  if(e==="localSettings"){
    let i=qye(n);
    if(i)s.push(...fz(i,n.store).errors)
  }return s
}function uft(e,n){
  return{
    ...e,...n
  }
}function S6(e,n,s){
  if(s==="modelPicker"&&n!==void 0)return Hd(n);
  if(Array.isArray(e)&&Array.isArray(n)){
    if(s==="fallbackModel")return n;
    return D([...e,...n])
  }if((s==="extraKnownMarketplaces"||s==="managedMcpServers")&&z(e)&&z(n))return uft(e,n);
  return
}function Hd(e){
  if(!z(e))return e;
  let n=e.options;
  return{
    ...e,...Array.isArray(n)&&{
      options:n.map((s)=>z(s)?{
        ...s
      }:s)
    }
  }
}function Q5n(e){
  if(e.store.isLoadingFromDisk)return{
    settings:{
    },errors:[]
  };
  let n=Date.now();
  K("info","settings_load_started"),e.store.isLoadingFromDisk=!0;
  try{
    let s=e.store.pluginBase,r={
    };
    if(s)r=W1(r,s,S6);
    let i=[],d=new Set,c=new Set,p=(m)=>{
      for(let S of m){
        let y=`${S.file}:${S.path}:${S.message}`;
        if(!d.has(y))d.add(y),i.push(S)
      }
    },g=null;
    for(let m of UUt(e)){
      if(m==="policySettings"){
        let{
          settings:y,errors:E
        }=I$o(e);
        if(g=y,p(z5n(y)),p(V5n(y)),y)r=W1(r,Wt(m,y,e),S6);
        p(E);
        continue
      }if(m==="localSettings"){
        let y=qye(e);
        if(y&&!c.has(be(y))){
          c.add(be(y));
          let{
            settings:E,errors:C
          }=fz(y,e.store);
          if(p(C),E)e.onLegacyLocalSettingsRead?.("cascade"),r=W1(r,Wt(m,E,e),S6)
        }
      }let S=Vye(m,e);
      if(S){
        let y=be(S),E=m==="flagSettings"&&e.flagExpectedContent!==void 0;
        if(!c.has(y)||E){
          c.add(y);
          let{
            settings:C,errors:I
          }=fz(S,e.store,m==="flagSettings"?e.flagExpectedContent:void 0);
          if(p(I),C)r=W1(r,Wt(m,C,e),S6)
        }
      }if(m==="flagSettings"){
        let{
          settings:y,errors:E
        }=S8e(e);
        if(p(E),y)r=W1(r,Wt(m,y,e),S6)
      }
    }if(g){
      if(g.availableModels!==void 0)r.availableModels=[...g.availableModels];
      if(g.enforceAvailableModels!==void 0)r.enforceAvailableModels=g.enforceAvailableModels;
      if(g.modelPicker!==void 0)r.modelPicker=Hd(g.modelPicker)
    }let h=g?.deniedModels;
    if(h!==void 0)r.deniedModels=[...h];
    else delete r.deniedModels;
    return K("info","settings_load_completed",{
      duration_ms:Date.now()-n,source_count:c.size,error_count:i.length
    }),{
      settings:r,errors:i
    }
  }finally{
    e.store.isLoadingFromDisk=!1
  }
}function nVo(e){
  let n=e.store.mergedSettings;
  if(n!==null)return n;
  let s=Q5n(e);
  return e.store.mergedSettings=s,s
}function rVo(e){
  let{
    settings:n
  }=nVo(e);
  return n||{
  }
}function yYo(e){
  e.store.invalidateAll();
  let n=[];
  for(let s of UUt(e)){
    let r=w8e(s,e);
    if(r&&Object.keys(r).length>0)n.push({
      source:s,settings:r
    })
  }return{
    effective:rVo(e),sources:n
  }
}function _Yo(e,n){
  let s=UUt(n);
  for(let r=s.length-1;r>=0;r--){
    let i=s[r];
    if(w8e(i,n)?.[e]!==void 0)return i
  }return null
} export{
  hne,z3n,W1,Mm,FNo,hF,yne,umn,V3n,Dv,nUt,rUt,BBr,UNo,jBr,WBr,GBr,VFe,SRe,q3n,oUt,zBr,K3n,pmn,Y3n,pa,z,wd,x0,X3n,BNo,J3n,Q3n,Z3n,jNo,G1,Dpt,sUt,fmn,mmn,Hye,LL,qFe,wRe,I0,gmn,qYe,hmn,iUt,aUt,Lpt,Npt,ymn,_mn,bmn,WNo,Smn,KYe,KFe,$pt,YFe,vRe,Fpt,NL,KE,$L,Dm,Ng,_ne,XFe,qq,lUt,Upt,VBr,qBr,cUt,KBr,JFe,ERe,dUt,uUt,pUt,YBr,fUt,Fx,wmn,Bpt,yF,$g,_F,mUt,jpt,gUt,kRe,vmn,Emn,YYe,XYe,kmn,Tmn,rde,e5n,hUt,t5n,n5n,XBr,JBr,Wpt,TRe,ARe,yUt,QBr,_Ut,r5n,ZBr,e1r,JYe,t1r,Mye,o5n,QFe,Gpt,QYe,bUt,n1r,Amn,r1r,Kq,p6,ZYe,As,e8e,$r,Dye,GNo,hA,zpt,Cmn,Rmn,s5n,Yq,bF,SUt,z1,zNo,ZFe,bne,VNo,wUt,o1r,qNo,KNo,xmn,vUt,ode,t8e,s1r,Lye,YE,Ay,Lv,Vpt,Nv,Dd,i1r,Imn,YNo,a1r,Ux,l1r,c1r,XNo,Pmn,EUt,d1r,kUt,SF,JNo,Omn,u1r,bb,QNo,n_,n8e,Hmn,ZNo,KH,e$o,V1,TUt,t$o,Mmn,f6,cz,oc,n$o,XE,dz,r$o,qpt,uz,Sne,yA,i5n,r8e,p1r,o$o,m6,Kpt,tn,Dmn,f1r,a5n,s$o,i$o,CRe,g6,a$o,wne,Nye,Xq,Ypt,m1r,Lmn,sde,EJ,vne,Yb,Ene,g1r,Xpt,eUe,l5n,Nmn,o8e,c5n,$mn,RRe,AUt,tUe,Fmn,kne,$ye,d5n,u5n,s8e,GS,h1r,l$o,Jq,p5n,f5n,m5n,Umn,g5n,CUt,y1r,i8e,a8e,_1r,Jpt,h5n,Tne,Qpt,nUe,Bmn,RUt,y5n,_5n,b1r,jmn,Wmn,S1r,rUe,xUt,b5n,Gmn,S5n,w5n,l8e,Lm,v5n,E5n,zmn,k5n,w1r,v1r,E1r,c8e,pz,xRe,Ane,VC,Zpt,c$o,IUt,PUt,T5n,d8e,kJ,Vmn,qC,Bx,IRe,d$o,qmn,u$o,p$o,f$o,m$o,Fg,u8e,Fye,k1r,A5n,h6,Kmn,Ymn,Xmn,PRe,eft,Uye,tft,oUe,g$o,T1r,A1r,OUt,C1r,R1r,x1r,I1r,P1r,O1r,C5n,H1r,M1r,h$o,FL,sUe,Jmn,nft,Xb,D1r,R5n,HUt,Qmn,Zmn,Cne,Rne,sr,egn,Ld,xne,iUe,y$o,Nm,Zf,aUe,lUe,tgn,ngn,Ia,$P,Bye,P0,_$o,rft,y6,rgn,b$o,L1r,N1r,$1r,p8e,x5n,F1r,oft,ide,ogn,U1r,I5n,jye,sgn,P5n,B1r,f8e,$v,sft,j1r,W1r,G1r,z1r,V1r,Ine,MUt,ign,jx,DUt,JE,cUe,q1r,S$o,LUt,TJ,O5n,NUt,dUe,$Ut,K1r,agn,lgn,Xk,UL,ift,ss,AJ,vd,Y1r,w$o,m8e,v$o,g8e,Wye,CJ,_6,H5n,E$o,FUt,k$o,X1r,T$o,M5n,J1r,uUe,h8e,Jk,Q1r,y8e,pUe,ORe,cgn,Z1r,D5n,ejr,L5n,N5n,tjr,$5n,F5n,UUt,aft,RJ,b6,V2o,njr,U5n,fz,HRe,MRe,dgn,Qq,_8e,b8e,lft,S8e,ch,Pne,rjr,Gye,ugn,fUe,zye,BUt,ojr,B5n,jUt,pgn,q1,j5n,q2o,K2o,W5n,sjr,K1,Vye,FP,qye,w8e,A$o,Y2o,X2o,fgn,G5n,J2o,Q2o,Z2o,z5n,V5n,q5n,ijr,ajr,ljr,cjr,mgn,Y1,djr,K5n,ujr,pjr,fjr,UP,mjr,Kye,cft,ggn,mUe,C$o,gUe,WUt,Yye,dft,Y5n,BL,eVo,gjr,hjr,yjr,_jr,bjr,Sjr,wjr,vjr,X5n,J5n,tVo,R$o,x$o,Ejr,I$o,hgn,kjr,uft,S6,Q5n,nVo,rVo,yYo,_Yo
};