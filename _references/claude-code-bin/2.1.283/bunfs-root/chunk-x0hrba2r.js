// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Le,Wo}from"/$bunfs/root/chunk-2j44ssk9.js";import{N}from"/$bunfs/root/chunk-8nz62976.js";import{y,c,ue}from"/$bunfs/root/chunk-vyyazxfq.js";import{I,st,te,l,v}from"/$bunfs/root/chunk-ern0s5ks.js";import{i,Ds}from"/$bunfs/root/chunk-ab7mw5d9.js";import{_,gn,gc}from"/$bunfs/root/chunk-d09a8ccq.js";import{d,O}from"/$bunfs/root/chunk-fmsbxtrp.js";import{b,J,t}from"/$bunfs/root/chunk-zkn0228z.js";import{tr}from"/$bunfs/root/chunk-19wkka67.js";import{P}from"/$bunfs/root/chunk-vq0drrah.js";import{nUe,sr,Ld,lUe}from"/$bunfs/root/chunk-379zyrv7.js";import{PJ}from"/$bunfs/root/chunk-pbnxt79v.js";import{Xo}from"/$bunfs/root/chunk-f5egm5fk.js";import{An}from"/$bunfs/root/chunk-797phdpb.js";import{yt}from"/$bunfs/root/chunk-m8ebe51k.js";import{txe,Ve}from"/$bunfs/root/chunk-n043szf8.js";import{LE}from"/$bunfs/root/chunk-z4xt60ea.js";import{G$}from"/$bunfs/root/chunk-zjmd7cfw.js";import{fi}from"/$bunfs/root/chunk-t6pwageh.js";import{tb}from"/$bunfs/root/chunk-tbjnvbhd.js";import{_Le,bat,nH,SHt,Tl,B9,THt}from"/$bunfs/root/chunk-dt8hdjgq.js";import{jT,NV,KD}from"/$bunfs/root/chunk-dw3eh2qr.js";import{i5e}from"/$bunfs/root/chunk-0cqpxx2s.js";import{pit}from"/$bunfs/root/chunk-5t3x93y6.js";import{rAt,jQ,yW,aAt,M2,shr,PI,aco,lco,Kn,dho,aen,Gp,id,ty,FZ,iB,yE,iv,b$n,fS,Ti}from"/$bunfs/root/chunk-csayct82.js";import{f5,Ect,HG,e1}from"/$bunfs/root/chunk-ztd4p95c.js";import{Qg}from"/$bunfs/root/chunk-aqjnefpv.js";import{vme,p_,Yen,Hqe,Vot}from"/$bunfs/root/chunk-cnp2ghvr.js";import{Oh}from"/$bunfs/root/chunk-repqv23t.js";import{_5}from"/$bunfs/root/chunk-1g18tqyd.js";import{jXe,v1e,x6r,R7n,azt,cue,zXe,I6r,E1e,VXe,cSn,dSn}from"/$bunfs/root/chunk-xqjfse8c.js";import{Z}from"/$bunfs/root/chunk-yzk2pa6b.js";import{Id,or,VAe,du,Y5e,_$e}from"/$bunfs/root/chunk-krwpsn0e.js";import{an}from"/$bunfs/root/chunk-tp36n59y.js";import{Qr}from"/$bunfs/root/chunk-7h88gd3q.js";async function GBe(e,n,o){let{name:u,marketplace:s}=du(e),a=yW(u,s,n),f=Y5e(s);if(!f&&s!==Id&&!_$e(u,s))return a;let m=!1;try{m=await ne(e,u,s,o)}catch(r){t(`Plugin telemetry: could not read the marketplace catalog to confirm "${e}" exists (${l(r)}); logging its name as third-party`)}return{...a,...f&&s!==void 0&&{marketplace_name_redacted:shr(s)},...!m&&{plugin_name_redacted:y(tb)}}}async function ne(e,n,o,u){if(_$e(n,o))return!0;if(o===Id)return G$(n)!==void 0;return await FZ(e,u)!==null}import{createHash as U,randomUUID as ie}from"crypto";import{readFile as x,stat as ae}from"fs/promises";import{join as F}from"path";import{createInterface as oe}from"readline";class h7 extends I{result;pluginCommandErrorCategory;constructor(e,n={}){super(e,"plugin operation returned a failure result");if(this.name="PluginOperationFailedError",this.result=n,n.failureCode==="invalid_plugin_id"||n.failureCode==="install_records_unreadable"||n.failureCode==="directory_identity_changed"||n.failureCode==="directory_binding_unreadable")this.pluginCommandErrorCategory="validation"}}function G(e){let n=e.kind==="command_source"?[e.kind,e.pluginId,e.command,e.mode,e.catalogRevision]:[e.kind,e.pluginId,e.command,e.archiveUrl,e.catalogRevision];return U("sha256").update(b(n),"utf8").digest("hex")}function M9n(e){return{...e,sha256:G(e)}}function M(e,n){return n===void 0?e:{...e,acceptCommandMatched:L(n,e)}}async function H(e,n,o){return{kind:"entry_helper",pluginId:n,command:e.command,archiveUrl:lUe(e).destination,catalogRevision:await Y(n,o)}}async function Y(e,n){let o=`unreadable:${ie()}`;if(N()&&n!==void 0)return o;let{marketplace:u}=or(e),s=u===void 0?void 0:(await id(n))[u];if(s===void 0)return o;if(s.source.source==="claudeai")return o;let a=s.installLocation;try{if(s.source.source==="github"||s.source.source==="git"){if(await ae(F(a,".git")).then(()=>!0,()=>!1)){let m=txe(a),r=await Ve(yt(),[...m.inCheckoutArgs,"rev-parse","HEAD"],{cwd:a,env:m.env,stdin:"ignore"});return r.code===0?`git:${r.stdout.trim()}`:o}if(ty(a)===void 0){let m=(await x(F(a,i5e),"utf8")).trim();return/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(m)?`gcs:${m}`:o}}return s.source.source==="settings"?`settings:${re([await j(a),A(s.source)])}`:`sha256:${await j(a)}`}catch{return o}}async function j(e){let n=(a)=>["ENOENT","ENOTDIR"].includes(v(a)??""),o,u=!0;try{o=await x(F(e,".claude-plugin","marketplace.json"),"utf8")}catch(a){if(!n(a))throw a;o=await x(e,"utf8"),u=!1}let s=u?await x(F(e,"package.json"),"utf8").catch((a)=>{if(n(a))return null;throw a}):null;return U("sha256").update(b([A(J(Xo(o))),s===null?null:A(J(Xo(s)))]),"utf8").digest("hex")}function re(e){return U("sha256").update(b(e),"utf8").digest("hex")}function A(e){if(Array.isArray(e))return["[",...e.map(A)];if(e!==null&&typeof e==="object")return["{",...Object.keys(e).sort().map((n)=>[n,A(e[n])])];return e}function L(e,n){return e!==void 0&&e.trim().toLowerCase()===G(n)}async function Vxe(e){let n=e.failureCode!==void 0&&se.has(e.failureCode)?e:{...e,shownCommand:void 0};await Oh(PJ(b(n))+`
`)}var se=new Set(["command_source_refused","command_source_declined","entry_helper_unconfirmed","entry_helper_declined"]);function le(e,n){if(e instanceof h7)return e.result.failureCode??"op_failed";if(e instanceof Tl){if(n==="update"){let o=e.telemetryMessage;if(o.startsWith(rAt))return o.slice(rAt.length)}return THt(e).code}if(e instanceof PI)return`claudeai_${e.code}`;return`error_${K(M2(e))}`}function K(e){return e.replaceAll("-","_")}var de={install:"claude plugin install failed with an unclassified error",uninstall:"claude plugin uninstall failed with an unclassified error",enable:"claude plugin enable failed with an unclassified error",disable:"claude plugin disable failed with an unclassified error","disable-all":"claude plugin disable --all failed with an unclassified error",update:"claude plugin update failed with an unclassified error",prune:"claude plugin prune failed with an unclassified error"};async function qxe(e,n,o,u,s,a){let f=e instanceof h7?e.result.failureCode:void 0,r=M2(e),p=n==="disable-all"?"disable":n==="prune"?void 0:n;if(s&&p){let C=e instanceof h7?e.result:{};await Vxe({command:p,outcome:"failed",...n==="disable-all"?{all:!0}:{plugin:o},pluginId:C.pluginId??s.pluginId??a,scope:s.scope,message:Ld(l(e)),failureCode:le(e,n),alreadyInGoalState:C.alreadyInGoalState,installedScope:C.installedScope,reverseDependents:C.reverseDependents,shownCommand:s.shownCommand&&M9n(s.shownCommand)})}if(e instanceof Tl&&(n==="install"||n==="update")){if(console.error(Ld(l(e))),n==="install"){let{code:C,kind:R}=THt(e);if(R==="bad")await gn("cli_plugin_install",C);else await gc("cli_plugin_install",C)}await _5(),process.exit(1)}let g=e instanceof PI?`claudeai_${e.code}`:void 0;if(r==="unknown"&&!(e instanceof h7)&&g===void 0)d(st(te(e),de[n]));else t(`Plugin command "${n}" failed: ${l(e)}`,{level:"error"});let h=o?`${n} plugin "${o}"`:n==="disable-all"?"disable all plugins":`${n} plugins`;console.error(Ld(`${Z.cross} Failed to ${h}: ${l(e)}`));let w=g??K(r);switch(n){case"install":await gn("cli_plugin_install",w);break;case"uninstall":await gn("cli_plugin_uninstall",w);break;case"update":await gn("cli_plugin_update",w);break;case"enable":await gn("cli_plugin_enable","cli_plugin_enable_failed");break;default:break}let k=o?await GBe(a??o,Qg(),u):{};await Ds("tengu_plugin_command_failed",{command:c(n),error_category:c(r),...{},...k,...{}}),await _5(),process.exit(1)}function ce(e,n){let o={};for(let a of e){let f=a.indexOf("=");if(f<=0)throw Error(`--config expects KEY=VALUE, got "${a}". Use --config key=value (repeatable).`);let m=a.slice(0,f),p=(a.slice(f+1).split(/\r\n|\r|\n/,1)[0]??"").trim(),g=Object.hasOwn(n,m)?n[m]:void 0;if(!g){let h=Object.keys(n);throw Error(`--config key "${m}" isn't declared in this plugin's userConfig.`+(h.length>0?` Known keys: ${h.join(", ")}.`:""))}if(p==="")throw Error(`--config ${m}: value is empty. Omit the flag to leave "${m}" unset.`);if(g.type==="number"){let h=Number(p);if(Number.isNaN(h))throw Error(`--config ${m}: "${p}" is not a number`);o[m]=h}else if(g.type==="boolean"){if(!Le(p)&&!Wo(p))throw Error(`--config ${m}: "${p}" is not a boolean (use true/false, 1/0, yes/no, on/off)`);o[m]=Le(p)}else o[m]=p}let u=Qr(n,(a,f)=>Object.hasOwn(o,f)),s=vme(o,u);if(!s.valid)throw Error(`--config validation failed: ${s.errors.join("; ")}`);return o}async function pe(e,n,o){Gp(o);let{enabled:u,disabled:s}=await fS(o),a=Yen([...u,...s],e);if(!a){if(n&&n.length>0)throw Error(`--config was given but plugin "${e}" failed to load after install \u2014 run \`claude plugin list\` to see why.`);return""}let f=a.manifest.userConfig;if(!f||Object.keys(f).length===0){if(n&&n.length>0)throw Error(`--config was given but plugin "${e}" declares no userConfig options.`);return""}if(n&&n.length>0){let p=ce(n,f);await Hqe(p_(a),p,f,o)}let m=Object.keys(await Vot(a));if(m.length===0)return"";let r=m.filter((p)=>f[p]?.required===!0);return`${m.length} userConfig ${P(m.length,"option")} not yet set`+(r.length>0?` (${r.length} required)`:"")+` \u2014 run /plugin configure ${e} in Claude Code, or pass --config KEY=VALUE.`}async function q(e,n,{yes:o=!1,acceptedCommand:u,acceptCommand:s,onShown:a,storageV5:f}={}){if(typeof n.source!=="object"||n.source.source!=="command")return;if(jT()){tr(`${NV}
`);return}if(n.source.mode==="link"&&O()==="windows"){tr(`${bat}
`);return}let m=n.source.command,r=nH(n.source);if(u===r&&!_Le())return;let p={kind:"command_source",pluginId:e,command:m,mode:n.source.mode==="link"?"link":"copy",catalogRevision:await Y(e,f)};a?.({...M(p,s),...u!==void 0&&{previousAcceptance:u!==r?"changed":"unreliable"}});let{name:g,marketplace:h}=or(e),w=an(g??"",200),k=an(h??"",200);tr(`"${w}" is installed by running a command from marketplace "${k}" on this machine`+(u===void 0?"":u!==r?" \u2014 and that command (or how its output is used) CHANGED since you accepted it":" \u2014 your earlier acceptance is recorded where it cannot be relied on (a plugins root inside a workspace, on a network location, or one that could not be resolved), so please confirm it again")+`:
  ${m}
  (${SHt(n.source)})
`);let C=await B({yes:o,acceptCommand:s,shown:p});return C==="accepted"?{kind:"accepted",grantKey:r}:C==="declined"?{kind:"declined"}:void 0}async function B({yes:e=!1,acceptCommand:n,shown:o}){let u=process.stdout.isTTY&&process.stdin.isTTY;if(e||o!==void 0&&L(n,o)){if(!pit())return"accepted";if(!u)return tr(`${e?"-y/--yes":"--accept-command"} is ignored inside a Claude Code session: run this in your own terminal to accept the command shown above.
`),"unconfirmed"}if(!u&&n!==void 0&&o!==void 0&&!L(n,o))return tr(`--accept-command does not name the command shown above (it may have changed since it was shown), so it was not run. Show it to the person again before accepting it.
`),"unconfirmed";if(!u)return tr(pit()?`Not an interactive terminal, so the command was only displayed, not accepted. Run this in your own terminal (outside the Claude Code session) to confirm the command shown above.
`:`Not an interactive terminal, so the command was only displayed, not accepted. Re-run in a terminal to confirm it, or pass -y/--yes to accept the command shown above.
`),"unconfirmed";return tr("Run this command now? [y/N] "),await X()?"accepted":"declined"}async function FKr(e,n={},o){if(VAe(e)!==null)return null;let{name:u,marketplace:s}=or(e);if(!u)return null;let a=s??n.resolvedMarketplace;if(!a)try{a=(await dSn(u,o))?.marketplace}catch(g){if(g instanceof Tl)return null;throw g}if(!a)return null;let f=`${u}@${a}`;if(await R7n(f,n.scope??"user",o))return null;let m=await VXe(f,void 0,o);if(m===null)return null;tr(`${cSn(m)}
`);let r=await H(m,f,o);n.onShown?.(M(r,n.acceptCommand));let p=await B({yes:n.yes,acceptCommand:n.acceptCommand,shown:r});return p==="accepted"?m:p}async function UKr(e,n={},o){if(VAe(e)!==null)return;let{name:u,marketplace:s}=or(e);if(!u)return;let a=await id(o),f=s,m;if(!f){let S;try{S=await dSn(u,o)}catch(T){if(T instanceof Tl)return;throw T}if(!S)return;f=S.marketplace,m=S.entry,n.onResolvedMarketplace?.(f)}let r=a[f];if(KD(r?.source))return;let p=`${u}@${f}`,g=m&&n.acceptCommand===void 0?{entry:m}:void 0;if(!g){let S=await jXe(f,r,o);n.onMarketplaceRefreshResult?.(S);try{g=await iB(p,o)}catch(T){if(T instanceof Tl)return;throw T}}let h=g?B9(g.entry.source):void 0;if(!g||!h)return;let w=(N()&&o!==void 0?await iv(o):yE()).plugins[p]??[],k=nH(h),C=!_Le(),R=C&&w.some((S)=>S.sourceCommand===k);if(await aen(p,n.scope??"user",o)){if(!R){let S=w.every((T)=>T.sourceCommand===void 0);tr(`"${an(or(p).name??"",200)}" is already installed, and its marketplace `+(S?"entry now installs it by running a command on this machine that has not been reviewed yet.":"has since changed the command that installs it (or how its output is used).")+` Review and accept it: ${LE("plugin update",p,{extra:(n.scope??"user")==="user"?void 0:`--scope ${n.scope}`,fallback:"an explicit plugin update reviews it"})}.
`)}return}if(R)return{kind:"accepted",grantKey:k};return q(p,g.entry,{yes:n.yes,acceptedCommand:C?w.find((S)=>S.sourceCommand!==void 0)?.sourceCommand:void 0,acceptCommand:n.acceptCommand,onShown:n.onShown,storageV5:o})}async function BKr(e,n="user",o,u,s,a,f,m={}){try{let r=await azt(m.resolvedPlugin??e,n,{shownSourceCommand:u,shownEntryHelper:s,announceRefreshResult:f,replaceInstalledCopy:m.replaceInstalledCopy,npmRegistry:m.npmRegistry},a);if(!r.success)throw new h7(r.message,r);let p=r.pluginId||e,g=r.scope||n;i("tengu_plugin_installed_cli",{...await GBe(p,Qg(),a),plugin_id:jQ(p),scope:c(g),install_source:y("cli-explicit"),...aAt(p,b$n(p,{scope:g})),...{},...{}});let h="",w=o&&o.length>0?!0:void 0;try{h=await pe(r.pluginId||e,o,a)}catch(C){let R=l(C);if(t(`post-install userConfig step failed: ${R}`,{level:"warn"}),o&&o.length>0)h=`${Z.warning} Installed, but --config not applied: ${R}`,w=!1}let k=h?`${r.message}
${h}`:r.message;if(m.json)await Vxe({command:"install",outcome:"ok",plugin:e,pluginId:r.pluginId,scope:r.scope||n,message:Ld(k),configApplied:w,installedVersion:r.installedVersion,availableVersion:r.availableVersion});return k}catch(r){return qxe(r,"install",e,a,m.json?{scope:n,shownCommand:m.shownCommand}:void 0,r instanceof h7&&r.result.aliasedId?r.result.pluginId:void 0)}}async function W(e,n){let o=v1e(e),{enabled:u,disabled:s}=await Ti(N()?n:void 0);return aco((N()&&n!==void 0?await iv(n):yE()).plugins,[...u,...s],e,o)}async function agt(e,n,o,{unlessNamedInSettings:u=!1,unlessDirectoryNameHeld:s=!1}={}){return{plugin:e,aliased:!1}}async function jKr(e,n="user",o=!1,u=!1,s=!1,a,f={}){let m={plugin:e,aliased:!1};try{m=await agt(e,f.json,a,{unlessDirectoryNameHeld:!0});let r=await cue(m.plugin,n,!o,a);if(!r.success)throw new h7(r.message,r);await Ds("tengu_plugin_uninstalled_cli",{...await GBe(r.pluginId||m.plugin,Qg(),a),scope:c(r.scope||n),...{},...r.savedKept!==void 0&&{saved_kept:!0}});let p=!1,g=async(h)=>{if(f.json)await Vxe({command:"uninstall",outcome:"ok",plugin:e,pluginId:r.pluginId,scope:r.scope||n,keptData:r.dataDirKept??o,...r.savedKept!==void 0&&{savedKept:r.savedKept.reason},message:Ld(h)});return h};try{let h=await W(n,a);if(u)return tr(`${Z.tick} ${sr(r.message)}
`),p=!0,await z(h,n,{dryRun:!1,yes:s,deleteDataDir:!o},a);return g(r.message+lco(h.orphans,n))}catch(h){d(st(te(h),"claude plugin uninstall: post-uninstall orphan scan or prune failed"));let k=`(${u?"prune":"orphan scan"} failed: ${l(h)})`;if(p)return k;let C=u?`${Z.tick} ${r.message}`:r.message;return g(`${C}
${k}`)}}catch(r){return qxe(r,"uninstall",e,a,f.json?{scope:n}:void 0,m.aliased?m.plugin:void 0)}}async function WKr(e="user",{dryRun:n=!1,yes:o=!1}={},u){try{let s=await W(e,u);return await z(s,e,{dryRun:n,yes:o,deleteDataDir:!0},u)}catch(s){return qxe(s,"prune")}}async function z(e,n,o,u){if(e.unloadable.length>0)return`Skipped \u2014 cannot determine orphans: ${e.unloadable.map(sr).join(", ")} failed to load. Fix or uninstall, then retry.`;if(e.orphans.size===0)return e.autoCount===0?`Nothing to prune (no auto-installed plugins at ${n} scope).`:`Nothing to prune (${e.autoCount} auto-installed ${P(e.autoCount,"plugin","plugins")} at ${n} scope, all still needed).`;let s=(N()&&u!==void 0?await iv(u):yE()).plugins,a=v1e(n),f=[...e.orphans].map((p)=>{let g=s[p]?.find((h)=>h.scope===n&&h.projectPath===a);return`  ${sr(p)}${g?.version?` (${sr(g.version)})`:""}`}),m=`${e.orphans.size} auto-installed ${P(e.orphans.size,"plugin","plugins")} no longer needed at ${n} scope:
${f.join(`
`)}`;if(o.dryRun)return`${m}
(dry run \u2014 nothing removed)`;if(!o.yes){if(!process.stdin.isTTY||!process.stdout.isTTY){let g=n==="user"?"":` --scope ${n}`;return`${m}
Not a TTY \u2014 run \`claude plugin prune${g} -y\` to remove.`}if(tr(`${m}
Remove? [y/N] `),!await X())return"Aborted."}let r=await dho(e.orphans,n,a,{deleteDataDir:o.deleteDataDir},u);return await Ds("tengu_plugin_prune_cli",{scope:c(n),removed_count:r.length}),`Removed ${r.length} auto-installed ${P(r.length,"plugin","plugins")}: ${r.map((p)=>sr(or(p).name)).join(", ")}`}async function X(){let e=oe({input:process.stdin});try{for await(let n of e)return/^y(es)?$/i.test(n.trim());return!1}finally{e.close()}}async function GKr(e,n,o,u={}){let s={plugin:e,aliased:!1};try{s=await agt(e,u.json,o,{unlessNamedInSettings:!0});let a=await zXe(s.plugin,n,o);if(!a.success)throw new h7(a.message,a);if(await Ds("tengu_plugin_disabled_cli",{...await GBe(a.pluginId||s.plugin,Qg(),o),scope:ue(a.scope),...{}}),u.json)await Vxe({command:"disable",outcome:"ok",plugin:e,pluginId:a.pluginId,scope:a.scope??n,message:Ld(a.message)});return`${Z.tick} ${a.message}`}catch(a){return qxe(a,"disable",e,o,u.json?{scope:n}:void 0,s.aliased?s.plugin:void 0)}}async function zKr(e,n={}){try{let o=await I6r(e);if(!o.success)throw new h7(o.message,o);if(await Ds("tengu_plugin_disabled_all_cli",{}),n.json)await Vxe({command:"disable",outcome:"ok",all:!0,message:Ld(o.message)});return`${Z.tick} ${o.message}`}catch(o){return qxe(o,"disable-all",void 0,void 0,n.json?{}:void 0)}}async function VKr(e,n,{yes:o=!1,json:u=!1,acceptCommand:s}={},a){let f,m,r={plugin:e,aliased:!1};try{if(r=await agt(e,u,a),!u)tr(`${sr(`Checking for updates for plugin "${r.plugin}"${n?` at ${n} scope`:""}\u2026`)}
`);let p=await E1e(r.plugin,n,{explicit:!0,onEntryHelperDisclosure:async(w,k,C)=>{tr(`${w}
`);let R=await H(k,C,a),S=await B({yes:o,acceptCommand:s,shown:R});return m=S==="accepted"?void 0:M(R,s),S},announceCommandSource:async(w,k,C)=>{let R=await q(w,k,{yes:o,acceptedCommand:C,acceptCommand:s,onShown:(S)=>{m=S},storageV5:a});if(R?.kind==="accepted")m=void 0;if(R?.kind==="declined")throw new Tl("Aborted \u2014 the command was not run.","plugin command source declined at the prompt");return R?.grantKey}},a),g=sr(p.message);f=p.pluginId;let{outcome:h}=p;if(h==="failed"){if(p.failureCode!==void 0&&x6r(p.failureCode))throw new Tl(g,`${rAt}${p.failureCode}`);throw new h7(g,{failureCode:p.failureCode,pluginId:p.pluginId})}if(u)await Vxe({command:"update",outcome:"ok",plugin:e,pluginId:p.pluginId,scope:p.scope??n,message:g,updateOutcome:h,oldVersion:p.oldVersion,newVersion:p.newVersion,skipReason:p.skipReason,blockedBy:p.blockedBy,refreshFailed:p.refreshFailed,refreshRefusedByPolicy:p.refreshRefusedByPolicy});else tr(`${Z.tick} ${g}
`);if(p.outcome==="updated"){let w=p.pluginId||r.plugin;i("tengu_plugin_updated_cli",{...await GBe(w,Qg(),a),old_version:fi(p.oldVersion),new_version:fi(p.newVersion),...aAt(w,p.gitCommitSha),...{}})}_("cli_plugin_update"),await Kn(0)}catch(p){return qxe(p,"update",e,a,u?{scope:n,pluginId:f,shownCommand:m}:void 0,r.aliased?r.plugin:void 0)}}import{mkdir as Q,writeFile as me}from"fs/promises";import{dirname as fe,join as D,relative as ge,resolve as V,sep as he}from"path";var ye="https://anthropic.com/claude-code/plugin.schema.json",lgt=["skills","agents","hooks","mcp","lsp","output-style","channel"];function qKr(e){let n=nUe().shape.name.safeParse(e);if(!n.success)return n.error.issues[0]?.message??null;if(e.includes("/")||e.includes("\\")||e.includes("..")||e===".")return'Plugin name cannot contain path separators (/ or \\), ".." sequences, or be "."';if(!Ect(e)||e1(e)||HG(e))return`Plugin name cannot be "${f5}" or start with "." \u2014 those directories are never loaded as plugin adoptions`;return null}function KKr(e){let{name:n,description:o,author:u}=e,s=e.with??[],a=[],f={$schema:ye,name:n,version:"0.1.0",description:o??"TODO: describe what this plugin provides"};if(u)f.author=u;if(f.skills=["./"],a.push({relPath:D(".claude-plugin","plugin.json"),contents:b(f,null,2)+`
`}),a.push({relPath:"SKILL.md",contents:ee(n)}),s.includes("skills"))a.push({relPath:D("skills","example","SKILL.md"),contents:ee("example")});if(s.includes("agents"))a.push({relPath:D("agents","example.md"),contents:we()});if(s.includes("hooks"))a.push({relPath:D("hooks","hooks.json"),contents:Ce()},{relPath:D("hooks-handlers","on-session-start.ts"),contents:Se(),mode:493});if(s.includes("mcp")&&!s.includes("channel"))a.push({relPath:".mcp.json",contents:_e()});if(s.includes("lsp"))a.push({relPath:".lsp.json",contents:ke()});if(s.includes("output-style"))a.push({relPath:D("output-styles",`${n}.md`),contents:be(n)});if(s.includes("channel"))f.channels=[{server:n,displayName:n}],a.push({relPath:".mcp.json",contents:Pe(n)},{relPath:"server.ts",contents:ve(n)},{relPath:"package.json",contents:Ie(n)});return a[0].contents=b(f,null,2)+`
`,a}async function YKr(e,n,o){let u=V(e);if(!o.force)try{await Q(D(u,".claude-plugin"))}catch(a){if(v(a)==="EEXIST")return{ok:!1,error:`${D(u,".claude-plugin")} already exists. Use --force to overwrite.`};if(v(a)!=="ENOENT")throw a}let s=[];for(let a of n){let f=V(u,a.relPath),m=ge(u,f);if(m.startsWith(".."+he)||m==="..")return{ok:!1,error:`Refusing to write outside ${u}: ${a.relPath}`};if(await Q(fe(f),{recursive:!0}),o.force)await An(f,a.contents,a.mode);else try{await me(f,a.contents,{flag:"wx",mode:a.mode})}catch(r){if(v(r)!=="EEXIST")throw r;s.push(a.relPath)}}return{ok:!0,skipped:s}}function ee(e){return`---
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
`}function Ce(){return b({hooks:{SessionStart:[{hooks:[{type:"command",command:'bun "${CLAUDE_PLUGIN_ROOT}/hooks-handlers/on-session-start.ts"'}]}]}},null,2)+`
`}function Se(){return`#!/usr/bin/env bun
// SessionStart hook handler. Reads the event from stdin, writes a JSON result
// to stdout. Swap "bun" for "node" or "python3" in hooks/hooks.json if your
// users' environment lacks bun.
const input = await new Response(Bun.stdin.stream()).text()
const event = JSON.parse(input)
process.stdout.write(JSON.stringify({}))
`}function _e(){return b({mcpServers:{"example-remote":{type:"http",url:"https://example.com/mcp"},"example-local":{command:"npx",args:["<your-mcp-server-package>"]}}},null,2)+`
`}function ke(){return b({example:{command:"example-language-server",args:["--stdio"],extensionToLanguage:{".example":"example"}}},null,2)+`
`}function be(e){return`---
name: ${e}
description: TODO \u2014 one line shown in the Output style picker in /config
force-for-plugin: true
keep-coding-instructions: true
---

TODO: the style prompt. This is appended to Claude's system prompt while the
style is active. With force-for-plugin: true, the style applies automatically
when this plugin is enabled.
`}function Pe(e){return b({mcpServers:{[e]:{command:"bun",args:["run","--cwd","${CLAUDE_PLUGIN_ROOT}","--shell=bun","--silent","start"]}}},null,2)+`
`}function Ie(e){return b({name:`claude-channel-${e}`,version:"0.1.0",type:"module",scripts:{start:"bun install --no-summary && bun server.ts"},dependencies:{"@modelcontextprotocol/sdk":"^1.0.0"}},null,2)+`
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
export{GBe,h7,M9n,Vxe,qxe,FKr,UKr,BKr,agt,jKr,WKr,GKr,zKr,VKr,lgt,qKr,KKr,YKr};
