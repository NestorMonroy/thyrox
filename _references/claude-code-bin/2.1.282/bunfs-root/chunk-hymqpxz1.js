// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Oe,ko}from"/$bunfs/root/chunk-zt13kgz5.js";import{N}from"/$bunfs/root/chunk-hm6k4hcw.js";import{_,c,pe}from"/$bunfs/root/chunk-zxcb8vnv.js";import{I,ot,se,l,v}from"/$bunfs/root/chunk-dw9y6h6j.js";import{i,Cs}from"/$bunfs/root/chunk-hm522bzh.js";import{y,mn,nc}from"/$bunfs/root/chunk-fq30rq8e.js";import{u,H}from"/$bunfs/root/chunk-xt60grfb.js";import{S,Q,t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{tr}from"/$bunfs/root/chunk-zx0c9jrs.js";import{P}from"/$bunfs/root/chunk-shebh248.js";import{VNe,Zn,kd,QNe}from"/$bunfs/root/chunk-t6d3nxvc.js";import{Z9}from"/$bunfs/root/chunk-c01w1545.js";import{Bo}from"/$bunfs/root/chunk-sentf9c1.js";import{Rn}from"/$bunfs/root/chunk-1s5hx5dz.js";import{ht}from"/$bunfs/root/chunk-36kx407g.js";import{JAe,Ge}from"/$bunfs/root/chunk-a23hx12j.js";import{DT}from"/$bunfs/root/chunk-v7arbnft.js";import{ON}from"/$bunfs/root/chunk-st5y2mpe.js";import{ri}from"/$bunfs/root/chunk-wbbthbh9.js";import{N_}from"/$bunfs/root/chunk-dh73nbtm.js";import{rMe,vot,hH,Vxt,gl,i8,Jxt}from"/$bunfs/root/chunk-a7qs06gr.js";import{bT,p2,YM}from"/$bunfs/root/chunk-1xjxfex5.js";import{DKe}from"/$bunfs/root/chunk-8y2t7vqf.js";import{wrt}from"/$bunfs/root/chunk-ga02wneq.js";import{jx,Zvt,y7,Y1,rEt,iG,Rcr,veo,Eeo,Qn,mao,YXt,Pp,Kc,M_,aQ,jF,Jv,Hw,d0n,jb,Qi}from"/$bunfs/root/chunk-c9jscxk0.js";import{M4,kit,sW,MU}from"/$bunfs/root/chunk-7y32bp4y.js";import{Dg}from"/$bunfs/root/chunk-5yk5cxet.js";import{kpe,Gy,LJt,m2e,Qtt}from"/$bunfs/root/chunk-cm721d50.js";import{yh}from"/$bunfs/root/chunk-4fpty3r8.js";import{B4}from"/$bunfs/root/chunk-pt8cfhg2.js";import{h8e,gUe,a2r,D6n,I1t,uce,b8e,l2r,hUe,S8e,Mgn,Dgn}from"/$bunfs/root/chunk-fk22q53q.js";import{X}from"/$bunfs/root/chunk-g30jw8yf.js";import{bd,ar,Fke,Yd,T4e,oLe}from"/$bunfs/root/chunk-g5a1w94e.js";import{ln}from"/$bunfs/root/chunk-ewsr9rhf.js";import{os}from"/$bunfs/root/chunk-pt3n8f0h.js";async function NFe(e,n,a){let{name:d,marketplace:s}=Yd(e),o=Y1(d,s,n),f=T4e(s);if(!f&&s!==bd&&!oLe(d,s))return o;let m=!1;try{m=await ne(e,d,s,a)}catch(r){t(`Plugin telemetry: could not read the marketplace catalog to confirm "${e}" exists (${l(r)}); logging its name as third-party`)}return{...o,...f&&s!==void 0&&{marketplace_name_redacted:Rcr(s)},...!m&&{plugin_name_redacted:_(N_)}}}async function ne(e,n,a,d){if(oLe(n,a))return!0;if(a===bd)return ON(n)!==void 0;return await aQ(e,d)!==null}import{createHash as L,randomUUID as te}from"crypto";import{readFile as A,stat as ie}from"fs/promises";import{join as x}from"path";import{createInterface as oe}from"readline";class WX extends I{result;constructor(e,n={}){super(e,"plugin operation returned a failure result");this.name="PluginOperationFailedError",this.result=n}}function j(e){let n=e.kind==="command_source"?[e.kind,e.pluginId,e.command,e.mode,e.catalogRevision]:[e.kind,e.pluginId,e.command,e.archiveUrl,e.catalogRevision];return L("sha256").update(S(n),"utf8").digest("hex")}function r5n(e){return{...e,sha256:j(e)}}function U(e,n){return n===void 0?e:{...e,acceptCommandMatched:F(n,e)}}async function G(e,n,a){return{kind:"entry_helper",pluginId:n,command:e.command,archiveUrl:QNe(e).destination,catalogRevision:await Y(n,a)}}async function Y(e,n){let a=`unreadable:${te()}`;if(N()&&n!==void 0)return a;let{marketplace:d}=ar(e),s=d===void 0?void 0:(await Kc(n))[d];if(s===void 0)return a;if(s.source.source==="claudeai")return a;let o=s.installLocation;try{if(s.source.source==="github"||s.source.source==="git"){if(await ie(x(o,".git")).then(()=>!0,()=>!1)){let m=JAe(o),r=await Ge(ht(),[...m.inCheckoutArgs,"rev-parse","HEAD"],{cwd:o,env:m.env,stdin:"ignore"});return r.code===0?`git:${r.stdout.trim()}`:a}if(M_(o)===void 0){let m=(await A(x(o,DKe),"utf8")).trim();return/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(m)?`gcs:${m}`:a}}return s.source.source==="settings"?`settings:${ae([await B(o),T(s.source)])}`:`sha256:${await B(o)}`}catch{return a}}async function B(e){let n=(o)=>["ENOENT","ENOTDIR"].includes(v(o)??""),a,d=!0;try{a=await A(x(e,".claude-plugin","marketplace.json"),"utf8")}catch(o){if(!n(o))throw o;a=await A(e,"utf8"),d=!1}let s=d?await A(x(e,"package.json"),"utf8").catch((o)=>{if(n(o))return null;throw o}):null;return L("sha256").update(S([T(Q(Bo(a))),s===null?null:T(Q(Bo(s)))]),"utf8").digest("hex")}function ae(e){return L("sha256").update(S(e),"utf8").digest("hex")}function T(e){if(Array.isArray(e))return["[",...e.map(T)];if(e!==null&&typeof e==="object")return["{",...Object.keys(e).sort().map((n)=>[n,T(e[n])])];return e}function F(e,n){return e!==void 0&&e.trim().toLowerCase()===j(n)}async function DCe(e){let n=e.failureCode!==void 0&&re.has(e.failureCode)?e:{...e,shownCommand:void 0};await yh(Z9(S(n))+`
`)}var re=new Set(["command_source_refused","command_source_declined","entry_helper_unconfirmed","entry_helper_declined"]);function le(e,n){if(e instanceof WX)return e.result.failureCode??"op_failed";if(e instanceof gl){if(n==="update"){let a=e.telemetryMessage;if(a.startsWith(Zvt))return a.slice(Zvt.length)}return Jxt(e).code}if(e instanceof jx)return`claudeai_${e.code}`;return`error_${K(iG(e))}`}function K(e){return e.replaceAll("-","_")}var de={install:"claude plugin install failed with an unclassified error",uninstall:"claude plugin uninstall failed with an unclassified error",enable:"claude plugin enable failed with an unclassified error",disable:"claude plugin disable failed with an unclassified error","disable-all":"claude plugin disable --all failed with an unclassified error",update:"claude plugin update failed with an unclassified error",prune:"claude plugin prune failed with an unclassified error"};async function LCe(e,n,a,d,s,o){let f=e instanceof WX?e.result.failureCode:void 0,r=iG(e),p=n==="disable-all"?"disable":n==="prune"?void 0:n;if(s&&p){let C=e instanceof WX?e.result:{};await DCe({command:p,outcome:"failed",...n==="disable-all"?{all:!0}:{plugin:a},pluginId:C.pluginId??s.pluginId??o,scope:s.scope,message:kd(l(e)),failureCode:le(e,n),alreadyInGoalState:C.alreadyInGoalState,installedScope:C.installedScope,reverseDependents:C.reverseDependents,shownCommand:s.shownCommand&&r5n(s.shownCommand)})}if(e instanceof gl&&(n==="install"||n==="update")){if(console.error(kd(l(e))),n==="install"){let{code:C,kind:R}=Jxt(e);if(R==="bad")await mn("cli_plugin_install",C);else await nc("cli_plugin_install",C)}await B4(),process.exit(1)}let g=e instanceof jx?`claudeai_${e.code}`:void 0;if(r==="unknown"&&!(e instanceof WX)&&g===void 0)u(ot(se(e),de[n]));else t(`Plugin command "${n}" failed: ${l(e)}`,{level:"error"});let h=a?`${n} plugin "${a}"`:n==="disable-all"?"disable all plugins":`${n} plugins`;console.error(kd(`${X.cross} Failed to ${h}: ${l(e)}`));let w=g??K(r);switch(n){case"install":await mn("cli_plugin_install",w);break;case"uninstall":await mn("cli_plugin_uninstall",w);break;case"update":await mn("cli_plugin_update",w);break;case"enable":await mn("cli_plugin_enable","cli_plugin_enable_failed");break;default:break}let b=a?await NFe(o??a,Dg(),d):{};await Cs("tengu_plugin_command_failed",{command:c(n),error_category:c(r),...{},...b,...{}}),await B4(),process.exit(1)}function ue(e,n){let a={};for(let o of e){let f=o.indexOf("=");if(f<=0)throw Error(`--config expects KEY=VALUE, got "${o}". Use --config key=value (repeatable).`);let m=o.slice(0,f),p=(o.slice(f+1).split(/\r\n|\r|\n/,1)[0]??"").trim(),g=Object.hasOwn(n,m)?n[m]:void 0;if(!g){let h=Object.keys(n);throw Error(`--config key "${m}" isn't declared in this plugin's userConfig.`+(h.length>0?` Known keys: ${h.join(", ")}.`:""))}if(p==="")throw Error(`--config ${m}: value is empty. Omit the flag to leave "${m}" unset.`);if(g.type==="number"){let h=Number(p);if(Number.isNaN(h))throw Error(`--config ${m}: "${p}" is not a number`);a[m]=h}else if(g.type==="boolean"){if(!Oe(p)&&!ko(p))throw Error(`--config ${m}: "${p}" is not a boolean (use true/false, 1/0, yes/no, on/off)`);a[m]=Oe(p)}else a[m]=p}let d=os(n,(o,f)=>Object.hasOwn(a,f)),s=kpe(a,d);if(!s.valid)throw Error(`--config validation failed: ${s.errors.join("; ")}`);return a}async function ce(e,n,a){Pp(a);let{enabled:d,disabled:s}=await jb(a),o=LJt([...d,...s],e);if(!o){if(n&&n.length>0)throw Error(`--config was given but plugin "${e}" failed to load after install \u2014 run \`claude plugin list\` to see why.`);return""}let f=o.manifest.userConfig;if(!f||Object.keys(f).length===0){if(n&&n.length>0)throw Error(`--config was given but plugin "${e}" declares no userConfig options.`);return""}if(n&&n.length>0){let p=ue(n,f);await m2e(Gy(o),p,f,a)}let m=Object.keys(await Qtt(o));if(m.length===0)return"";let r=m.filter((p)=>f[p]?.required===!0);return`${m.length} userConfig ${P(m.length,"option")} not yet set`+(r.length>0?` (${r.length} required)`:"")+` \u2014 run /plugin configure ${e} in Claude Code, or pass --config KEY=VALUE.`}async function q(e,n,{yes:a=!1,acceptedCommand:d,acceptCommand:s,onShown:o,storageV5:f}={}){if(typeof n.source!=="object"||n.source.source!=="command")return;if(bT()){tr(`${p2}
`);return}if(n.source.mode==="link"&&H()==="windows"){tr(`${vot}
`);return}let m=n.source.command,r=hH(n.source);if(d===r&&!rMe())return;let p={kind:"command_source",pluginId:e,command:m,mode:n.source.mode==="link"?"link":"copy",catalogRevision:await Y(e,f)};o?.({...U(p,s),...d!==void 0&&{previousAcceptance:d!==r?"changed":"unreliable"}});let{name:g,marketplace:h}=ar(e),w=ln(g??"",200),b=ln(h??"",200);tr(`"${w}" is installed by running a command from marketplace "${b}" on this machine`+(d===void 0?"":d!==r?" \u2014 and that command (or how its output is used) CHANGED since you accepted it":" \u2014 your earlier acceptance is recorded where it cannot be relied on (a plugins root inside a workspace, on a network location, or one that could not be resolved), so please confirm it again")+`:
  ${m}
  (${Vxt(n.source)})
`);let C=await M({yes:a,acceptCommand:s,shown:p});return C==="accepted"?{kind:"accepted",grantKey:r}:C==="declined"?{kind:"declined"}:void 0}async function M({yes:e=!1,acceptCommand:n,shown:a}){let d=process.stdout.isTTY&&process.stdin.isTTY;if(e||a!==void 0&&F(n,a)){if(!wrt())return"accepted";if(!d)return tr(`${e?"-y/--yes":"--accept-command"} is ignored inside a Claude Code session: run this in your own terminal to accept the command shown above.
`),"unconfirmed"}if(!d&&n!==void 0&&a!==void 0&&!F(n,a))return tr(`--accept-command does not name the command shown above (it may have changed since it was shown), so it was not run. Show it to the person again before accepting it.
`),"unconfirmed";if(!d)return tr(wrt()?`Not an interactive terminal, so the command was only displayed, not accepted. Run this in your own terminal (outside the Claude Code session) to confirm the command shown above.
`:`Not an interactive terminal, so the command was only displayed, not accepted. Re-run in a terminal to confirm it, or pass -y/--yes to accept the command shown above.
`),"unconfirmed";return tr("Run this command now? [y/N] "),await z()?"accepted":"declined"}async function hjr(e,n={},a){if(Fke(e)!==null)return null;let{name:d,marketplace:s}=ar(e);if(!d)return null;let o=s??n.resolvedMarketplace;if(!o)try{o=(await Dgn(d,a))?.marketplace}catch(g){if(g instanceof gl)return null;throw g}if(!o)return null;let f=`${d}@${o}`;if(await D6n(f,n.scope??"user",a))return null;let m=await S8e(f,void 0,a);if(m===null)return null;tr(`${Mgn(m)}
`);let r=await G(m,f,a);n.onShown?.(U(r,n.acceptCommand));let p=await M({yes:n.yes,acceptCommand:n.acceptCommand,shown:r});return p==="accepted"?m:p}async function yjr(e,n={},a){if(Fke(e)!==null)return;let{name:d,marketplace:s}=ar(e);if(!d)return;let o=await Kc(a),f=s,m;if(!f){let k;try{k=await Dgn(d,a)}catch(D){if(D instanceof gl)return;throw D}if(!k)return;f=k.marketplace,m=k.entry,n.onResolvedMarketplace?.(f)}let r=o[f];if(YM(r?.source))return;let p=`${d}@${f}`,g=m&&n.acceptCommand===void 0?{entry:m}:void 0;if(!g){let k=await h8e(f,r,a);n.onMarketplaceRefreshResult?.(k);try{g=await jF(p,a)}catch(D){if(D instanceof gl)return;throw D}}let h=g?i8(g.entry.source):void 0;if(!g||!h)return;let w=(N()&&a!==void 0?await Hw(a):Jv()).plugins[p]??[],b=hH(h),C=!rMe(),R=C&&w.some((k)=>k.sourceCommand===b);if(await YXt(p,n.scope??"user",a)){if(!R){let k=w.every((D)=>D.sourceCommand===void 0);tr(`"${ln(ar(p).name??"",200)}" is already installed, and its marketplace `+(k?"entry now installs it by running a command on this machine that has not been reviewed yet.":"has since changed the command that installs it (or how its output is used).")+` Review and accept it: ${DT("plugin update",p,{extra:(n.scope??"user")==="user"?void 0:`--scope ${n.scope}`,fallback:"an explicit plugin update reviews it"})}.
`)}return}if(R)return{kind:"accepted",grantKey:b};return q(p,g.entry,{yes:n.yes,acceptedCommand:C?w.find((k)=>k.sourceCommand!==void 0)?.sourceCommand:void 0,acceptCommand:n.acceptCommand,onShown:n.onShown,storageV5:a})}async function _jr(e,n="user",a,d,s,o,f,m={}){try{let r=await I1t(m.resolvedPlugin??e,n,{shownSourceCommand:d,shownEntryHelper:s,announceRefreshResult:f,replaceInstalledCopy:m.replaceInstalledCopy,npmRegistry:m.npmRegistry},o);if(!r.success)throw new WX(r.message,r);let p=r.pluginId||e,g=r.scope||n;i("tengu_plugin_installed_cli",{...await NFe(p,Dg(),o),plugin_id:y7(p),scope:c(g),install_source:_("cli-explicit"),...rEt(p,d0n(p,{scope:g})),...{},...{}});let h="",w=a&&a.length>0?!0:void 0;try{h=await ce(r.pluginId||e,a,o)}catch(C){let R=l(C);if(t(`post-install userConfig step failed: ${R}`,{level:"warn"}),a&&a.length>0)h=`${X.warning} Installed, but --config not applied: ${R}`,w=!1}let b=h?`${r.message}
${h}`:r.message;if(m.json)await DCe({command:"install",outcome:"ok",plugin:e,pluginId:r.pluginId,scope:r.scope||n,message:kd(b),configApplied:w,installedVersion:r.installedVersion,availableVersion:r.availableVersion});return b}catch(r){return LCe(r,"install",e,o,m.json?{scope:n,shownCommand:m.shownCommand}:void 0,r instanceof WX&&r.result.aliasedId?r.result.pluginId:void 0)}}async function J(e,n){let a=gUe(e),{enabled:d,disabled:s}=await Qi(N()?n:void 0);return veo((N()&&n!==void 0?await Hw(n):Jv()).plugins,[...d,...s],e,a)}async function gpt(e,n,a,{unlessNamedInSettings:d=!1,unlessDirectoryNameHeld:s=!1}={}){return{plugin:e,aliased:!1}}async function bjr(e,n="user",a=!1,d=!1,s=!1,o,f={}){let m={plugin:e,aliased:!1};try{m=await gpt(e,f.json,o,{unlessDirectoryNameHeld:!0});let r=await uce(m.plugin,n,!a,o);if(!r.success)throw new WX(r.message,r);await Cs("tengu_plugin_uninstalled_cli",{...await NFe(r.pluginId||m.plugin,Dg(),o),scope:c(r.scope||n),...{},...r.savedKept!==void 0&&{saved_kept:!0}});let p=!1,g=async(h)=>{if(f.json)await DCe({command:"uninstall",outcome:"ok",plugin:e,pluginId:r.pluginId,scope:r.scope||n,keptData:r.dataDirKept??a,...r.savedKept!==void 0&&{savedKept:r.savedKept.reason},message:kd(h)});return h};try{let h=await J(n,o);if(d)return tr(`${X.tick} ${Zn(r.message)}
`),p=!0,await W(h,n,{dryRun:!1,yes:s,deleteDataDir:!a},o);return g(r.message+Eeo(h.orphans,n))}catch(h){u(ot(se(h),"claude plugin uninstall: post-uninstall orphan scan or prune failed"));let b=`(${d?"prune":"orphan scan"} failed: ${l(h)})`;if(p)return b;let C=d?`${X.tick} ${r.message}`:r.message;return g(`${C}
${b}`)}}catch(r){return LCe(r,"uninstall",e,o,f.json?{scope:n}:void 0,m.aliased?m.plugin:void 0)}}async function Sjr(e="user",{dryRun:n=!1,yes:a=!1}={},d){try{let s=await J(e,d);return await W(s,e,{dryRun:n,yes:a,deleteDataDir:!0},d)}catch(s){return LCe(s,"prune")}}async function W(e,n,a,d){if(e.unloadable.length>0)return`Skipped \u2014 cannot determine orphans: ${e.unloadable.map(Zn).join(", ")} failed to load. Fix or uninstall, then retry.`;if(e.orphans.size===0)return e.autoCount===0?`Nothing to prune (no auto-installed plugins at ${n} scope).`:`Nothing to prune (${e.autoCount} auto-installed ${P(e.autoCount,"plugin","plugins")} at ${n} scope, all still needed).`;let s=(N()&&d!==void 0?await Hw(d):Jv()).plugins,o=gUe(n),f=[...e.orphans].map((p)=>{let g=s[p]?.find((h)=>h.scope===n&&h.projectPath===o);return`  ${Zn(p)}${g?.version?` (${Zn(g.version)})`:""}`}),m=`${e.orphans.size} auto-installed ${P(e.orphans.size,"plugin","plugins")} no longer needed at ${n} scope:
${f.join(`
`)}`;if(a.dryRun)return`${m}
(dry run \u2014 nothing removed)`;if(!a.yes){if(!process.stdin.isTTY||!process.stdout.isTTY){let g=n==="user"?"":` --scope ${n}`;return`${m}
Not a TTY \u2014 run \`claude plugin prune${g} -y\` to remove.`}if(tr(`${m}
Remove? [y/N] `),!await z())return"Aborted."}let r=await mao(e.orphans,n,o,{deleteDataDir:a.deleteDataDir},d);return await Cs("tengu_plugin_prune_cli",{scope:c(n),removed_count:r.length}),`Removed ${r.length} auto-installed ${P(r.length,"plugin","plugins")}: ${r.map((p)=>Zn(ar(p).name)).join(", ")}`}async function z(){let e=oe({input:process.stdin});try{for await(let n of e)return/^y(es)?$/i.test(n.trim());return!1}finally{e.close()}}async function wjr(e,n,a,d={}){let s={plugin:e,aliased:!1};try{s=await gpt(e,d.json,a,{unlessNamedInSettings:!0});let o=await b8e(s.plugin,n,a);if(!o.success)throw new WX(o.message,o);if(await Cs("tengu_plugin_disabled_cli",{...await NFe(o.pluginId||s.plugin,Dg(),a),scope:pe(o.scope),...{}}),d.json)await DCe({command:"disable",outcome:"ok",plugin:e,pluginId:o.pluginId,scope:o.scope??n,message:kd(o.message)});return`${X.tick} ${o.message}`}catch(o){return LCe(o,"disable",e,a,d.json?{scope:n}:void 0,s.aliased?s.plugin:void 0)}}async function vjr(e,n={}){try{let a=await l2r(e);if(!a.success)throw new WX(a.message,a);if(await Cs("tengu_plugin_disabled_all_cli",{}),n.json)await DCe({command:"disable",outcome:"ok",all:!0,message:kd(a.message)});return`${X.tick} ${a.message}`}catch(a){return LCe(a,"disable-all",void 0,void 0,n.json?{}:void 0)}}async function Ejr(e,n,{yes:a=!1,json:d=!1,acceptCommand:s}={},o){let f,m,r={plugin:e,aliased:!1};try{if(r=await gpt(e,d,o),!d)tr(`${Zn(`Checking for updates for plugin "${r.plugin}"${n?` at ${n} scope`:""}\u2026`)}
`);let p=await hUe(r.plugin,n,{explicit:!0,onEntryHelperDisclosure:async(w,b,C)=>{tr(`${w}
`);let R=await G(b,C,o),k=await M({yes:a,acceptCommand:s,shown:R});return m=k==="accepted"?void 0:U(R,s),k},announceCommandSource:async(w,b,C)=>{let R=await q(w,b,{yes:a,acceptedCommand:C,acceptCommand:s,onShown:(k)=>{m=k},storageV5:o});if(R?.kind==="accepted")m=void 0;if(R?.kind==="declined")throw new gl("Aborted \u2014 the command was not run.","plugin command source declined at the prompt");return R?.grantKey}},o),g=Zn(p.message);f=p.pluginId;let{outcome:h}=p;if(h==="failed"){if(p.failureCode!==void 0&&a2r(p.failureCode))throw new gl(g,`${Zvt}${p.failureCode}`);throw new WX(g,{failureCode:p.failureCode,pluginId:p.pluginId})}if(d)await DCe({command:"update",outcome:"ok",plugin:e,pluginId:p.pluginId,scope:p.scope??n,message:g,updateOutcome:h,oldVersion:p.oldVersion,newVersion:p.newVersion,skipReason:p.skipReason,blockedBy:p.blockedBy,refreshFailed:p.refreshFailed,refreshRefusedByPolicy:p.refreshRefusedByPolicy});else tr(`${X.tick} ${g}
`);if(p.outcome==="updated"){let w=p.pluginId||r.plugin;i("tengu_plugin_updated_cli",{...await NFe(w,Dg(),o),old_version:ri(p.oldVersion),new_version:ri(p.newVersion),...rEt(w,p.gitCommitSha),...{}})}y("cli_plugin_update"),await Qn(0)}catch(p){return LCe(p,"update",e,o,d?{scope:n,pluginId:f,shownCommand:m}:void 0,r.aliased?r.plugin:void 0)}}import{mkdir as Z,writeFile as me}from"fs/promises";import{dirname as fe,join as O,relative as ge,resolve as V,sep as he}from"path";var ye="https://anthropic.com/claude-code/plugin.schema.json",hpt=["skills","agents","hooks","mcp","lsp","output-style","channel"];function kjr(e){let n=VNe().shape.name.safeParse(e);if(!n.success)return n.error.issues[0]?.message??null;if(e.includes("/")||e.includes("\\")||e.includes("..")||e===".")return'Plugin name cannot contain path separators (/ or \\), ".." sequences, or be "."';if(!kit(e)||MU(e)||sW(e))return`Plugin name cannot be "${M4}" or start with "." \u2014 those directories are never loaded as plugin adoptions`;return null}function Tjr(e){let{name:n,description:a,author:d}=e,s=e.with??[],o=[],f={$schema:ye,name:n,version:"0.1.0",description:a??"TODO: describe what this plugin provides"};if(d)f.author=d;if(f.skills=["./"],o.push({relPath:O(".claude-plugin","plugin.json"),contents:S(f,null,2)+`
`}),o.push({relPath:"SKILL.md",contents:ee(n)}),s.includes("skills"))o.push({relPath:O("skills","example","SKILL.md"),contents:ee("example")});if(s.includes("agents"))o.push({relPath:O("agents","example.md"),contents:we()});if(s.includes("hooks"))o.push({relPath:O("hooks","hooks.json"),contents:Ce()},{relPath:O("hooks-handlers","on-session-start.ts"),contents:Se(),mode:493});if(s.includes("mcp")&&!s.includes("channel"))o.push({relPath:".mcp.json",contents:ke()});if(s.includes("lsp"))o.push({relPath:".lsp.json",contents:_e()});if(s.includes("output-style"))o.push({relPath:O("output-styles",`${n}.md`),contents:Pe(n)});if(s.includes("channel"))f.channels=[{server:n,displayName:n}],o.push({relPath:".mcp.json",contents:be(n)},{relPath:"server.ts",contents:ve(n)},{relPath:"package.json",contents:Ie(n)});return o[0].contents=S(f,null,2)+`
`,o}async function Ajr(e,n,a){let d=V(e);if(!a.force)try{await Z(O(d,".claude-plugin"))}catch(o){if(v(o)==="EEXIST")return{ok:!1,error:`${O(d,".claude-plugin")} already exists. Use --force to overwrite.`};if(v(o)!=="ENOENT")throw o}let s=[];for(let o of n){let f=V(d,o.relPath),m=ge(d,f);if(m.startsWith(".."+he)||m==="..")return{ok:!1,error:`Refusing to write outside ${d}: ${o.relPath}`};if(await Z(fe(f),{recursive:!0}),a.force)await Rn(f,o.contents,o.mode);else try{await me(f,o.contents,{flag:"wx",mode:o.mode})}catch(r){if(v(r)!=="EEXIST")throw r;s.push(o.relPath)}}return{ok:!0,skipped:s}}function ee(e){return`---
name: ${e}
description: TODO \u2014 describe WHEN Claude should use this. Include trigger phrases users
  might say ("do X", "set up Y", "review Z"). Be specific; this string is what Claude
  matches the user's request against.
---

# ${e}

TODO: what this skill does, and the steps Claude should take.
`}function we(){return`---
name: example
description: TODO \u2014 when should Claude delegate to this subagent?
tools:
  - Read
  - Grep
---

TODO: system prompt for the subagent.
`}function Ce(){return S({hooks:{SessionStart:[{hooks:[{type:"command",command:'bun "${CLAUDE_PLUGIN_ROOT}/hooks-handlers/on-session-start.ts"'}]}]}},null,2)+`
`}function Se(){return`#!/usr/bin/env bun
// SessionStart hook handler. Reads the event from stdin, writes a JSON result
// to stdout. Swap "bun" for "node" or "python3" in hooks/hooks.json if your
// users' environment lacks bun.
const input = await new Response(Bun.stdin.stream()).text()
const event = JSON.parse(input)
process.stdout.write(JSON.stringify({}))
`}function ke(){return S({mcpServers:{"example-remote":{type:"http",url:"https://example.com/mcp"},"example-local":{command:"npx",args:["<your-mcp-server-package>"]}}},null,2)+`
`}function _e(){return S({example:{command:"example-language-server",args:["--stdio"],extensionToLanguage:{".example":"example"}}},null,2)+`
`}function Pe(e){return`---
name: ${e}
description: TODO \u2014 one line shown in the Output style picker in /config
force-for-plugin: true
keep-coding-instructions: true
---

TODO: the style prompt. This is appended to Claude's system prompt while the
style is active. With force-for-plugin: true, the style applies automatically
when this plugin is enabled.
`}function be(e){return S({mcpServers:{[e]:{command:"bun",args:["run","--cwd","${CLAUDE_PLUGIN_ROOT}","--shell=bun","--silent","start"]}}},null,2)+`
`}function Ie(e){return S({name:`claude-channel-${e}`,version:"0.1.0",type:"module",scripts:{start:"bun install --no-summary && bun server.ts"},dependencies:{"@modelcontextprotocol/sdk":"^1.0.0"}},null,2)+`
`}function ve(e){return`#!/usr/bin/env bun
/**
 * ${e} channel server \u2014 stdio MCP server implementing the channel contract.
 * See https://code.claude.com/docs/en/channels-reference.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const mcp = new Server(
  { name: '${e}', version: '0.1.0' },
  {
    capabilities: {
      tools: {},
      // Required: presence of this key registers the channel notification
      // listener on Claude's side.
      experimental: { 'claude/channel': {} },
    },
    instructions:
      "Events from ${e} arrive as <channel source=\\"${e}\\" ...>. Anything " +
      "you want the sender to see must go through the reply tool \u2014 your " +
      "transcript output never reaches the channel.",
  },
)

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'reply',
      description: 'Send a message back to the ${e} channel.',
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
    },
  ],
}))

mcp.setRequestHandler(CallToolRequestSchema, async req => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>
  if (req.params.name === 'reply') {
    // TODO: deliver args.text to the external service.
    return { content: [{ type: 'text', text: 'sent' }] }
  }
  return { content: [{ type: 'text', text: 'unknown tool' }], isError: true }
})

// TODO: when the external service has an inbound event, push it to Claude:
//
//   await mcp.notification({
//     method: 'notifications/claude/channel',
//     params: {
//       content: 'the event body',
//       meta: { chat_id: '...', sender: '...' },
//     },
//   })
//
// Each meta key becomes an attribute on the <channel> tag. Keys must be
// identifiers (letters/digits/underscores) \u2014 others are silently dropped.

await mcp.connect(new StdioServerTransport())
`}
export{NFe,WX,r5n,DCe,LCe,hjr,yjr,_jr,gpt,bjr,Sjr,wjr,vjr,Ejr,hpt,kjr,Tjr,Ajr};
