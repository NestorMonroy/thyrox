// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{N}from"/$bunfs/root/chunk-0pd7kjzx.js";import{y,c,ue}from"/$bunfs/root/chunk-czwr6846.js";import{P,it,te,l,v}from"/$bunfs/root/chunk-31aa9k3a.js";import{i,$s}from"/$bunfs/root/chunk-wt82nr44.js";import{_,fn,bc}from"/$bunfs/root/chunk-q5gkv7dz.js";import{d,O}from"/$bunfs/root/chunk-320rdak1.js";import{b,J,t}from"/$bunfs/root/chunk-6b6gfk00.js";import{sr}from"/$bunfs/root/chunk-7jxsf4cd.js";import{I}from"/$bunfs/root/chunk-k6n2tyj0.js";import{_Be,or,Gd,kBe}from"/$bunfs/root/chunk-e1ahn80a.js";import{HK}from"/$bunfs/root/chunk-3xxkkv4v.js";import{ns}from"/$bunfs/root/chunk-fybh7qze.js";import{xn}from"/$bunfs/root/chunk-1qy944sj.js";import{_t}from"/$bunfs/root/chunk-hqy3a2gr.js";import{hPe,qe}from"/$bunfs/root/chunk-x15v86ew.js";import{Kw,Ra,Fx,rr,nRe,Rd,OYe,MFe}from"/$bunfs/root/chunk-pegpck1h.js";import{Nx}from"/$bunfs/root/chunk-cgw854vf.js";import{hi}from"/$bunfs/root/chunk-swk3rjnt.js";import{gb}from"/$bunfs/root/chunk-0ajbn6zw.js";import{INe,ect,_H,v0t,Nl,SX,C0t}from"/$bunfs/root/chunk-pd2rp87v.js";import{V3,vut,rz,S1}from"/$bunfs/root/chunk-q3sfp1s7.js";import{H6e}from"/$bunfs/root/chunk-f1swfy5b.js";import{uA,Iq,bL}from"/$bunfs/root/chunk-m2xq3y2f.js";import{Gat}from"/$bunfs/root/chunk-45s965ek.js";import{dRt,CZ,jW,mRt,uV,Ebr,$T,gfo,hfo,Qn,iSo,Inn,tf,pd,by,vee,AB,DE,Ev,IBn,AS,xi}from"/$bunfs/root/chunk-77kn462z.js";import{uh}from"/$bunfs/root/chunk-c6yk6epa.js";import{bge,ch,Srn,s4e,bit}from"/$bunfs/root/chunk-1hycj1ha.js";import{Vg}from"/$bunfs/root/chunk-hf5rffkn.js";import{J3}from"/$bunfs/root/chunk-68sjx27j.js";import{S7e,Uje,VXr,ftr,$Vt,ipe,E7e,qXr,Bje,k7e,gEn,hEn}from"/$bunfs/root/chunk-rbtfgcq8.js";import{OGe,XOe}from"/$bunfs/root/chunk-k7ah3gap.js";import{gtt}from"/$bunfs/root/chunk-s7fxavqq.js";import{Q}from"/$bunfs/root/chunk-s5727aqe.js";import{an}from"/$bunfs/root/chunk-pbs1taz0.js";import{Wr}from"/$bunfs/root/chunk-asz3893d.js";async function aje(e,n,a){let u=Fx(e),{name:s,marketplace:o}=Rd(u),f=jW(s,o,n),m=OYe(o);if(!m&&o!==Ra&&!MFe(s,o))return f;let r=!1;try{r=await ee(u,s,o,a)}catch(p){t(`Plugin telemetry: could not read the marketplace catalog to confirm "${e}" exists (${l(p)}); logging its name as third-party`)}return{...f,...m&&o!==void 0&&{marketplace_name_redacted:Ebr(o)},...!r&&{plugin_name_redacted:y(gb)}}}async function ee(e,n,a,u){if(MFe(n,a))return!0;if(a===Ra)return Nx(n)!==void 0;return await vee(e,u)!==null}import{createHash as M,randomUUID as ne}from"crypto";import{readFile as x,stat as ie}from"fs/promises";import{join as F}from"path";class Q7 extends P{result;pluginCommandErrorCategory;constructor(e,n={}){super(e,"plugin operation returned a failure result");if(this.name="PluginOperationFailedError",this.result=n,n.failureCode==="invalid_plugin_id"||n.failureCode==="install_records_unreadable"||n.failureCode==="directory_identity_changed"||n.failureCode==="directory_binding_unreadable")this.pluginCommandErrorCategory="validation"}}function G(e){let n=e.kind==="command_source"?[e.kind,e.pluginId,e.command,e.mode,e.catalogRevision]:[e.kind,e.pluginId,e.command,e.archiveUrl,e.catalogRevision];return M("sha256").update(b(n),"utf8").digest("hex")}function SQn(e){return{...e,sha256:G(e)}}function U(e,n){return n===void 0?e:{...e,acceptCommandMatched:L(n,e)}}async function H(e,n,a){return{kind:"entry_helper",pluginId:n,command:e.command,archiveUrl:kBe(e).destination,catalogRevision:await Y(n,a)}}async function Y(e,n){let a=`unreadable:${ne()}`;if(N()&&n!==void 0)return a;let{marketplace:u}=rr(e),s=u===void 0?void 0:(await pd(n))[u];if(s===void 0)return a;if(s.source.source==="claudeai")return a;let o=s.installLocation;try{if(s.source.source==="github"||s.source.source==="git"){if(await ie(F(o,".git")).then(()=>!0,()=>!1)){let m=hPe(o),r=await qe(_t(),[...m.inCheckoutArgs,"rev-parse","HEAD"],{cwd:o,env:m.env,stdin:"ignore"});return r.code===0?`git:${r.stdout.trim()}`:a}if(by(o)===void 0){let m=(await x(F(o,H6e),"utf8")).trim();return/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(m)?`gcs:${m}`:a}}return s.source.source==="settings"?`settings:${oe([await j(o),A(s.source)])}`:`sha256:${await j(o)}`}catch{return a}}async function j(e){let n=(o)=>["ENOENT","ENOTDIR"].includes(v(o)??""),a,u=!0;try{a=await x(F(e,".claude-plugin","marketplace.json"),"utf8")}catch(o){if(!n(o))throw o;a=await x(e,"utf8"),u=!1}let s=u?await x(F(e,"package.json"),"utf8").catch((o)=>{if(n(o))return null;throw o}):null;return M("sha256").update(b([A(J(ns(a))),s===null?null:A(J(ns(s)))]),"utf8").digest("hex")}function oe(e){return M("sha256").update(b(e),"utf8").digest("hex")}function A(e){if(Array.isArray(e))return["[",...e.map(A)];if(e!==null&&typeof e==="object")return["{",...Object.keys(e).sort().map((n)=>[n,A(e[n])])];return e}function L(e,n){return e!==void 0&&e.trim().toLowerCase()===G(n)}async function iIe(e){let n=e.failureCode!==void 0&&ae.has(e.failureCode)?e:{...e,shownCommand:void 0};await Vg(HK(b(n))+`
`)}var ae=new Set(["command_source_refused","command_source_declined","entry_helper_unconfirmed","entry_helper_declined"]);function re(e,n){if(e instanceof Q7)return e.result.failureCode??"op_failed";if(e instanceof Nl){if(n==="update"){let a=e.telemetryMessage;if(a.startsWith(dRt))return a.slice(dRt.length)}return C0t(e).code}if(e instanceof $T)return`claudeai_${e.code}`;return`error_${K(uV(e))}`}function K(e){return e.replaceAll("-","_")}var se={install:"claude plugin install failed with an unclassified error",uninstall:"claude plugin uninstall failed with an unclassified error",enable:"claude plugin enable failed with an unclassified error",disable:"claude plugin disable failed with an unclassified error","disable-all":"claude plugin disable --all failed with an unclassified error",update:"claude plugin update failed with an unclassified error",prune:"claude plugin prune failed with an unclassified error"};async function aIe(e,n,a,u,s,o){let f=e instanceof Q7?e.result.failureCode:void 0,r=uV(e),p=n==="disable-all"?"disable":n==="prune"?void 0:n;if(s&&p){let C=e instanceof Q7?e.result:{};await iIe({command:p,outcome:"failed",...n==="disable-all"?{all:!0}:{plugin:a},pluginId:C.pluginId??s.pluginId??o,scope:s.scope,message:Gd(l(e)),failureCode:re(e,n),alreadyInGoalState:C.alreadyInGoalState,installedScope:C.installedScope,reverseDependents:C.reverseDependents,shownCommand:s.shownCommand&&SQn(s.shownCommand)})}if(e instanceof Nl&&(n==="install"||n==="update")){if(console.error(Gd(l(e))),n==="install"){let{code:C,kind:S}=C0t(e);if(S==="bad")await fn("cli_plugin_install",C);else await bc("cli_plugin_install",C)}await J3(),process.exit(1)}let h=e instanceof $T?`claudeai_${e.code}`:void 0;if(r==="unknown"&&!(e instanceof Q7)&&h===void 0)d(it(te(e),se[n]));else t(`Plugin command "${n}" failed: ${l(e)}`,{level:"error"});let g=a?`${n} plugin "${a}"`:n==="disable-all"?"disable all plugins":`${n} plugins`;console.error(Gd(`${Q.cross} Failed to ${g}: ${l(e)}`));let w=h??K(r);switch(n){case"install":await fn("cli_plugin_install",w);break;case"uninstall":await fn("cli_plugin_uninstall",w);break;case"update":await fn("cli_plugin_update",w);break;case"enable":await fn("cli_plugin_enable","cli_plugin_enable_failed");break;default:break}let R=a?await aje(o??a,uh(),u):{};await $s("tengu_plugin_command_failed",{command:c(n),error_category:c(r),...{},...R,...{}}),await J3(),process.exit(1)}function le(e,n){let a={};for(let o of e){let f=o.indexOf("=");if(f<=0)throw Error(`--config expects KEY=VALUE, got "${o}". Use --config key=value (repeatable).`);let m=o.slice(0,f),p=(o.slice(f+1).split(/\r\n|\r|\n/,1)[0]??"").trim(),h=Object.hasOwn(n,m)?n[m]:void 0;if(!h){let g=Object.keys(n);throw Error(`--config key "${m}" isn't declared in this plugin's userConfig.`+(g.length>0?` Known keys: ${g.join(", ")}.`:""))}if(p==="")throw Error(`--config ${m}: value is empty. Omit the flag to leave "${m}" unset.`);if(h.type==="number"){let g=Number(p);if(Number.isNaN(g))throw Error(`--config ${m}: "${p}" is not a number`);a[m]=g}else if(h.type==="boolean"){let g=gtt(p);if(g===void 0)throw Error(`--config ${m}: "${p}" is not a boolean (use true/false, 1/0, yes/no, on/off)`);a[m]=g}else a[m]=p}let u=Wr(n,(o,f)=>Object.hasOwn(a,f)),s=bge(a,u);if(!s.valid)throw Error(`--config validation failed: ${s.errors.join("; ")}`);return a}async function de(e,n,a){tf(a);let{enabled:u,disabled:s}=await AS(a),o=Srn([...u,...s],e);if(!o){if(n&&n.length>0)throw Error(`--config was given but plugin "${e}" failed to load after install \u2014 run \`claude plugin list\` to see why.`);return""}let f=o.manifest.userConfig;if(!f||Object.keys(f).length===0){if(n&&n.length>0)throw Error(`--config was given but plugin "${e}" declares no userConfig options.`);return""}if(n&&n.length>0){let p=le(n,f);await s4e(ch(o),p,f,a)}let m=Object.keys(await bit(o));if(m.length===0)return"";let r=m.filter((p)=>f[p]?.required===!0);return`${m.length} userConfig ${I(m.length,"option")} not yet set`+(r.length>0?` (${r.length} required)`:"")+` \u2014 run /plugin configure ${e} in Claude Code, or pass --config KEY=VALUE.`}async function q(e,n,{yes:a=!1,acceptedCommand:u,acceptCommand:s,onShown:o,storageV5:f}={}){if(typeof n.source!=="object"||n.source.source!=="command")return;if(uA()){sr(`${Iq}
`);return}if(n.source.mode==="link"&&O()==="windows"){sr(`${ect}
`);return}let m=n.source.command,r=_H(n.source);if(u===r&&!INe())return;let p={kind:"command_source",pluginId:e,command:m,mode:n.source.mode==="link"?"link":"copy",catalogRevision:await Y(e,f)};o?.({...U(p,s),...u!==void 0&&{previousAcceptance:u!==r?"changed":"unreliable"}});let{name:h,marketplace:g}=rr(e),w=an(h??"",200),R=an(g??"",200),C=`"${w}" is installed by running a command from marketplace "${R}" on this machine`+(u===void 0?"":u!==r?" \u2014 and that command (or how its output is used) CHANGED since you accepted it":" \u2014 your earlier acceptance is recorded where it cannot be relied on (a plugins root inside a workspace, on a network location, or one that could not be resolved), so please confirm it again")+`:
  ${m}
  (${v0t(n.source)})
`;sr(C);let S=await B({yes:a,acceptCommand:s,shown:p,disclosure:C});return S==="accepted"?{kind:"accepted",grantKey:r}:S==="declined"?{kind:"declined"}:void 0}async function B({yes:e=!1,acceptCommand:n,shown:a,disclosure:u=""}){let s=process.stdout.isTTY&&process.stdin.isTTY;if(e||a!==void 0&&L(n,a)){if(!Gat())return"accepted";if(!s)return sr(`${e?"-y/--yes":"--accept-command"} is ignored inside a Claude Code session: run this in your own terminal to accept the command shown above.
`),"unconfirmed"}if(!s&&n!==void 0&&a!==void 0&&!L(n,a))return sr(`--accept-command does not name the command shown above (it may have changed since it was shown), so it was not run. Show it to the person again before accepting it.
`),"unconfirmed";if(!s)return sr(Gat()?`Not an interactive terminal, so the command was only displayed, not accepted. Run this in your own terminal (outside the Claude Code session) to confirm the command shown above.
`:`Not an interactive terminal, so the command was only displayed, not accepted. Re-run in a terminal to confirm it, or pass -y/--yes to accept the command shown above.
`),"unconfirmed";return await XOe("Run this command now?",process.stdin,{ignoreAnswersWithinMs:OGe,reaskPreamble:u})?"accepted":"declined"}async function Z6r(e,n={},a){if(nRe(e)!==null)return null;let{name:u,marketplace:s}=rr(e);if(!u)return null;let o=s??n.resolvedMarketplace;if(!o)try{o=(await hEn(u,a))?.marketplace}catch(g){if(g instanceof Nl)return null;throw g}if(!o)return null;let f=`${u}@${o}`;if(await ftr(f,n.scope??"user",a))return null;let m=await k7e(f,void 0,a);if(m===null)return null;let r=`${gEn(m)}
`;sr(r);let p=await H(m,f,a);n.onShown?.(U(p,n.acceptCommand));let h=await B({yes:n.yes,acceptCommand:n.acceptCommand,shown:p,disclosure:r});return h==="accepted"?m:h}async function eYr(e,n={},a){if(nRe(e)!==null)return;let{name:u,marketplace:s}=rr(e);if(!u)return;let o=await pd(a),f=s,m;if(!f){let k;try{k=await hEn(u,a)}catch(T){if(T instanceof Nl)return;throw T}if(!k)return;f=k.marketplace,m=k.entry,n.onResolvedMarketplace?.(f)}let r=o[f];if(bL(r?.source))return;let p=`${u}@${f}`,h=m&&n.acceptCommand===void 0?{entry:m}:void 0;if(!h){let k=await S7e(f,r,a);n.onMarketplaceRefreshResult?.(k);try{h=await AB(p,a)}catch(T){if(T instanceof Nl)return;throw T}}let g=h?SX(h.entry.source):void 0;if(!h||!g)return;let w=(N()&&a!==void 0?await Ev(a):DE()).plugins[p]??[],R=_H(g),C=!INe(),S=C&&w.some((k)=>k.sourceCommand===R);if(await Inn(p,n.scope??"user",a)){if(!S){let k=w.every((T)=>T.sourceCommand===void 0);sr(`"${an(rr(p).name??"",200)}" is already installed, and its marketplace `+(k?"entry now installs it by running a command on this machine that has not been reviewed yet.":"has since changed the command that installs it (or how its output is used).")+` Review and accept it: ${Kw("plugin update",p,{extra:(n.scope??"user")==="user"?void 0:`--scope ${n.scope}`,fallback:"an explicit plugin update reviews it"})}.
`)}return}if(S)return{kind:"accepted",grantKey:R};return q(p,h.entry,{yes:n.yes,acceptedCommand:C?w.find((k)=>k.sourceCommand!==void 0)?.sourceCommand:void 0,acceptCommand:n.acceptCommand,onShown:n.onShown,storageV5:a})}async function tYr(e,n="user",a,u,s,o,f,m={}){try{let r=await $Vt(m.resolvedPlugin??e,n,{shownSourceCommand:u,shownEntryHelper:s,announceRefreshResult:f,replaceInstalledCopy:m.replaceInstalledCopy,npmRegistry:m.npmRegistry},o);if(!r.success)throw new Q7(r.message,r);let p=r.pluginId||e,h=r.scope||n;i("tengu_plugin_installed_cli",{...await aje(p,uh(),o),plugin_id:CZ(p),scope:c(h),install_source:y("cli-explicit"),...mRt(p,IBn(p,{scope:h})),...{},...{}});let g="",w=a&&a.length>0?!0:void 0;try{g=await de(r.pluginId||e,a,o)}catch(C){let S=l(C);if(t(`post-install userConfig step failed: ${S}`,{level:"warn"}),a&&a.length>0)g=`${Q.warning} Installed, but --config not applied: ${S}`,w=!1}let R=g?`${r.message}
${g}`:r.message;if(m.json)await iIe({command:"install",outcome:"ok",plugin:e,pluginId:r.pluginId,scope:r.scope||n,message:Gd(R),configApplied:w,installedVersion:r.installedVersion,availableVersion:r.availableVersion});return R}catch(r){return aIe(r,"install",e,o,m.json?{scope:n,shownCommand:m.shownCommand}:void 0,r instanceof Q7&&r.result.aliasedId?r.result.pluginId:void 0)}}async function W(e,n){let a=Uje(e),{enabled:u,disabled:s}=await xi(N()?n:void 0);return gfo((N()&&n!==void 0?await Ev(n):DE()).plugins,[...u,...s],e,a)}async function cyt(e,n,a,{unlessNamedInSettings:u=!1,unlessDirectoryNameHeld:s=!1}={}){return{plugin:e,aliased:!1}}async function nYr(e,n="user",a=!1,u=!1,s=!1,o,f={}){let m={plugin:e,aliased:!1};try{m=await cyt(e,f.json,o,{unlessDirectoryNameHeld:!0});let r=await ipe(m.plugin,n,!a,o);if(!r.success)throw new Q7(r.message,r);await $s("tengu_plugin_uninstalled_cli",{...await aje(r.pluginId||m.plugin,uh(),o),scope:c(r.scope||n),...{},...r.savedKept!==void 0&&{saved_kept:!0}});let p=!1,h=async(g)=>{if(f.json)await iIe({command:"uninstall",outcome:"ok",plugin:e,pluginId:r.pluginId,scope:r.scope||n,keptData:r.dataDirKept??a,...r.savedKept!==void 0&&{savedKept:r.savedKept.reason},message:Gd(g)});return g};try{let g=await W(n,o);if(u)return sr(`${Q.tick} ${or(r.message)}
`),p=!0,await z(g,n,{dryRun:!1,yes:s,deleteDataDir:!a},o);return h(r.message+hfo(g.orphans,n))}catch(g){d(it(te(g),"claude plugin uninstall: post-uninstall orphan scan or prune failed"));let R=`(${u?"prune":"orphan scan"} failed: ${l(g)})`;if(p)return R;let C=u?`${Q.tick} ${r.message}`:r.message;return h(`${C}
${R}`)}}catch(r){return aIe(r,"uninstall",e,o,f.json?{scope:n}:void 0,m.aliased?m.plugin:void 0)}}async function rYr(e="user",{dryRun:n=!1,yes:a=!1}={},u){try{let s=await W(e,u);return await z(s,e,{dryRun:n,yes:a,deleteDataDir:!0},u)}catch(s){return aIe(s,"prune")}}async function z(e,n,a,u){if(e.unloadable.length>0)return`Skipped \u2014 cannot determine orphans: ${e.unloadable.map(or).join(", ")} failed to load. Fix or uninstall, then retry.`;if(e.orphans.size===0)return e.autoCount===0?`Nothing to prune (no auto-installed plugins at ${n} scope).`:`Nothing to prune (${e.autoCount} auto-installed ${I(e.autoCount,"plugin","plugins")} at ${n} scope, all still needed).`;let s=(N()&&u!==void 0?await Ev(u):DE()).plugins,o=Uje(n),f=[...e.orphans].map((p)=>{let h=s[p]?.find((g)=>g.scope===n&&g.projectPath===o);return`  ${or(p)}${h?.version?` (${or(h.version)})`:""}`}),m=`${e.orphans.size} auto-installed ${I(e.orphans.size,"plugin","plugins")} no longer needed at ${n} scope:
${f.join(`
`)}`;if(a.dryRun)return`${m}
(dry run \u2014 nothing removed)`;if(!a.yes){if(!process.stdin.isTTY||!process.stdout.isTTY){let h=n==="user"?"":` --scope ${n}`;return`${m}
Not a TTY \u2014 run \`claude plugin prune${h} -y\` to remove.`}if(sr(`${m}
`),!await XOe("Remove?"))return"Aborted."}let r=await iSo(e.orphans,n,o,{deleteDataDir:a.deleteDataDir},u);return await $s("tengu_plugin_prune_cli",{scope:c(n),removed_count:r.length}),`Removed ${r.length} auto-installed ${I(r.length,"plugin","plugins")}: ${r.map((p)=>or(rr(p).name)).join(", ")}`}async function oYr(e,n,a,u={}){let s={plugin:e,aliased:!1};try{s=await cyt(e,u.json,a,{unlessNamedInSettings:!0});let o=await E7e(s.plugin,n,a);if(!o.success)throw new Q7(o.message,o);if(await $s("tengu_plugin_disabled_cli",{...await aje(o.pluginId||s.plugin,uh(),a),scope:ue(o.scope),...{}}),u.json)await iIe({command:"disable",outcome:"ok",plugin:e,pluginId:o.pluginId,scope:o.scope??n,message:Gd(o.message)});return`${Q.tick} ${o.message}`}catch(o){return aIe(o,"disable",e,a,u.json?{scope:n}:void 0,s.aliased?s.plugin:void 0)}}async function sYr(e,n={}){try{let a=await qXr(e);if(!a.success)throw new Q7(a.message,a);if(await $s("tengu_plugin_disabled_all_cli",{}),n.json)await iIe({command:"disable",outcome:"ok",all:!0,message:Gd(a.message)});return`${Q.tick} ${a.message}`}catch(a){return aIe(a,"disable-all",void 0,void 0,n.json?{}:void 0)}}async function iYr(e,n,{yes:a=!1,json:u=!1,acceptCommand:s}={},o){let f,m,r={plugin:e,aliased:!1};try{if(r=await cyt(e,u,o),!u)sr(`${or(`Checking for updates for plugin "${r.plugin}"${n?` at ${n} scope`:""}\u2026`)}
`);let p=await Bje(r.plugin,n,{explicit:!0,onEntryHelperDisclosure:async(w,R,C)=>{sr(`${w}
`);let S=await H(R,C,o),k=await B({yes:a,acceptCommand:s,shown:S,disclosure:`${w}
`});return m=k==="accepted"?void 0:U(S,s),k},announceCommandSource:async(w,R,C)=>{let S=await q(w,R,{yes:a,acceptedCommand:C,acceptCommand:s,onShown:(k)=>{m=k},storageV5:o});if(S?.kind==="accepted")m=void 0;if(S?.kind==="declined")throw new Nl("Aborted \u2014 the command was not run.","plugin command source declined at the prompt");return S?.grantKey}},o),h=or(p.message);f=p.pluginId;let{outcome:g}=p;if(g==="failed"){if(p.failureCode!==void 0&&VXr(p.failureCode))throw new Nl(h,`${dRt}${p.failureCode}`);throw new Q7(h,{failureCode:p.failureCode,pluginId:p.pluginId})}if(u)await iIe({command:"update",outcome:"ok",plugin:e,pluginId:p.pluginId,scope:p.scope??n,message:h,updateOutcome:g,oldVersion:p.oldVersion,newVersion:p.newVersion,skipReason:p.skipReason,blockedBy:p.blockedBy,refreshFailed:p.refreshFailed,refreshRefusedByPolicy:p.refreshRefusedByPolicy});else sr(`${Q.tick} ${h}
`);if(p.outcome==="updated"){let w=p.pluginId||r.plugin;i("tengu_plugin_updated_cli",{...await aje(w,uh(),o),old_version:hi(p.oldVersion),new_version:hi(p.newVersion),...mRt(w,p.gitCommitSha),...{}})}_("cli_plugin_update"),await Qn(0)}catch(p){return aIe(p,"update",e,o,u?{scope:n,pluginId:f,shownCommand:m}:void 0,r.aliased?r.plugin:void 0)}}import{mkdir as X,writeFile as ce}from"fs/promises";import{dirname as pe,join as D,relative as me,resolve as Z,sep as fe}from"path";var ge="https://anthropic.com/claude-code/plugin.schema.json",dyt=["skills","agents","hooks","mcp","lsp","output-style","channel"];function aYr(e){let n=_Be().shape.name.safeParse(e);if(!n.success)return n.error.issues[0]?.message??null;if(e.includes("/")||e.includes("\\")||e.includes("..")||e===".")return'Plugin name cannot contain path separators (/ or \\), ".." sequences, or be "."';if(!vut(e)||S1(e)||rz(e))return`Plugin name cannot be "${V3}" or start with "." \u2014 those directories are never loaded as plugin adoptions`;return null}function lYr(e){let{name:n,description:a,author:u}=e,s=e.with??[],o=[],f={$schema:ge,name:n,version:"0.1.0",description:a??"TODO: describe what this plugin provides"};if(u)f.author=u;if(f.skills=["./"],o.push({relPath:D(".claude-plugin","plugin.json"),contents:b(f,null,2)+`
`}),o.push({relPath:"SKILL.md",contents:V(n)}),s.includes("skills"))o.push({relPath:D("skills","example","SKILL.md"),contents:V("example")});if(s.includes("agents"))o.push({relPath:D("agents","example.md"),contents:he()});if(s.includes("hooks"))o.push({relPath:D("hooks","hooks.json"),contents:ye()},{relPath:D("hooks-handlers","on-session-start.ts"),contents:we(),mode:493});if(s.includes("mcp")&&!s.includes("channel"))o.push({relPath:".mcp.json",contents:Ce()});if(s.includes("lsp"))o.push({relPath:".lsp.json",contents:Se()});if(s.includes("output-style"))o.push({relPath:D("output-styles",`${n}.md`),contents:_e(n)});if(s.includes("channel"))f.channels=[{server:n,displayName:n}],o.push({relPath:".mcp.json",contents:ke(n)},{relPath:"server.ts",contents:Pe(n)},{relPath:"package.json",contents:be(n)});return o[0].contents=b(f,null,2)+`
`,o}async function cYr(e,n,a){let u=Z(e);if(!a.force)try{await X(D(u,".claude-plugin"))}catch(o){if(v(o)==="EEXIST")return{ok:!1,error:`${D(u,".claude-plugin")} already exists. Use --force to overwrite.`};if(v(o)!=="ENOENT")throw o}let s=[];for(let o of n){let f=Z(u,o.relPath),m=me(u,f);if(m.startsWith(".."+fe)||m==="..")return{ok:!1,error:`Refusing to write outside ${u}: ${o.relPath}`};if(await X(pe(f),{recursive:!0}),a.force)await xn(f,o.contents,o.mode);else try{await ce(f,o.contents,{flag:"wx",mode:o.mode})}catch(r){if(v(r)!=="EEXIST")throw r;s.push(o.relPath)}}return{ok:!0,skipped:s}}function V(e){return`---
name: ${e}
description: TODO \u2014 describe WHEN Claude should use this. Include trigger phrases users
  might say ("do X", "set up Y", "review Z"). Be specific; this string is what Claude
  matches the user's request against.
---

# ${e}

TODO: what this skill does, and the steps Claude should take.
`}function he(){return`---
name: example
description: TODO \u2014 when should Claude delegate to this subagent?
tools:
  - Read
  - Grep
---

TODO: system prompt for the subagent.
`}function ye(){return b({hooks:{SessionStart:[{hooks:[{type:"command",command:'bun "${CLAUDE_PLUGIN_ROOT}/hooks-handlers/on-session-start.ts"'}]}]}},null,2)+`
`}function we(){return`#!/usr/bin/env bun
// SessionStart hook handler. Reads the event from stdin, writes a JSON result
// to stdout. Swap "bun" for "node" or "python3" in hooks/hooks.json if your
// users' environment lacks bun.
const input = await new Response(Bun.stdin.stream()).text()
const event = JSON.parse(input)
process.stdout.write(JSON.stringify({}))
`}function Ce(){return b({mcpServers:{"example-remote":{type:"http",url:"https://example.com/mcp"},"example-local":{command:"npx",args:["<your-mcp-server-package>"]}}},null,2)+`
`}function Se(){return b({example:{command:"example-language-server",args:["--stdio"],extensionToLanguage:{".example":"example"}}},null,2)+`
`}function _e(e){return`---
name: ${e}
description: TODO \u2014 one line shown in the Output style picker in /config
force-for-plugin: true
keep-coding-instructions: true
---

TODO: the style prompt. This is appended to Claude's system prompt while the
style is active. With force-for-plugin: true, the style applies automatically
when this plugin is enabled.
`}function ke(e){return b({mcpServers:{[e]:{command:"bun",args:["run","--cwd","${CLAUDE_PLUGIN_ROOT}","--shell=bun","--silent","start"]}}},null,2)+`
`}function be(e){return b({name:`claude-channel-${e}`,version:"0.1.0",type:"module",scripts:{start:"bun install --no-summary && bun server.ts"},dependencies:{"@modelcontextprotocol/sdk":"^1.0.0"}},null,2)+`
`}function Pe(e){return`#!/usr/bin/env bun
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
export{aje,Q7,SQn,iIe,aIe,Z6r,eYr,tYr,cyt,nYr,rYr,oYr,sYr,iYr,dyt,aYr,lYr,cYr};
