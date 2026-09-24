// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Oe,Ao}from"/$bunfs/root/chunk-4a5nddj6.js";import{F}from"/$bunfs/root/chunk-7yckkh1m.js";import{b,c,pe}from"/$bunfs/root/chunk-rnxz8hs2.js";import{I,ot,se,l,v}from"/$bunfs/root/chunk-2bj5eqbj.js";import{i,ks}from"/$bunfs/root/chunk-bh8vsyek.js";import{y,fn,Ql}from"/$bunfs/root/chunk-2pwc1ycq.js";import{u,H}from"/$bunfs/root/chunk-0n80jtth.js";import{S,Q,t}from"/$bunfs/root/chunk-wfscmafr.js";import{er}from"/$bunfs/root/chunk-kcjajdc8.js";import{P}from"/$bunfs/root/chunk-nqsdwfmt.js";import{hLe,nr,yd,ELe}from"/$bunfs/root/chunk-b93xrf5w.js";import{c9}from"/$bunfs/root/chunk-5wq5hbjb.js";import{Ko}from"/$bunfs/root/chunk-v5zz2h09.js";import{In}from"/$bunfs/root/chunk-bzbw9xhh.js";import{ht}from"/$bunfs/root/chunk-xe0dn6dd.js";import{PTe,Ge}from"/$bunfs/root/chunk-kvqsg7vn.js";import{ST}from"/$bunfs/root/chunk-nb76zxqr.js";import{hN}from"/$bunfs/root/chunk-zp55ksfn.js";import{Js}from"/$bunfs/root/chunk-5khn4tvf.js";import{E_}from"/$bunfs/root/chunk-fp4z2b21.js";import{HOe,Mnt,QP,OCt,ol,EY,$Ct}from"/$bunfs/root/chunk-kwdwya5n.js";import{eT,FG,SM}from"/$bunfs/root/chunk-s55tc6b5.js";import{_qe}from"/$bunfs/root/chunk-srdjfbee.js";import{JK,Got,Mj,lU}from"/$bunfs/root/chunk-3g3ke397.js";import{utt}from"/$bunfs/root/chunk-adsaemws.js";import{kx,wSt,pJ,_1,TSt,H2,gor,k9r,T9r,Qn,Tto,dYt,Ap,jc,S_,t7,bF,Lv,Ew,sIn,Pb,Vi}from"/$bunfs/root/chunk-4n4g22z6.js";import{Cg}from"/$bunfs/root/chunk-gzz3t5wc.js";import{bue,Hy,JYt,P2e,JZe}from"/$bunfs/root/chunk-kqhzp1z5.js";import{th}from"/$bunfs/root/chunk-0rt7skk2.js";import{i4}from"/$bunfs/root/chunk-8rqsxa7r.js";import{$6e,z$e,O1r,zKn,zFt,Yee,B6e,M1r,V$e,j6e,Tpn,Apn}from"/$bunfs/root/chunk-rsnm989r.js";import{X}from"/$bunfs/root/chunk-7grzwhk6.js";import{fd,ir,_Ee,$d,Jqe,IMe}from"/$bunfs/root/chunk-wrhs39mg.js";import{an}from"/$bunfs/root/chunk-ady37mbs.js";import{Jo}from"/$bunfs/root/chunk-pf8mfgbr.js";async function f$e(e,n,r){let{name:d,marketplace:a}=$d(e),o=_1(d,a,n),f=Jqe(a);if(!f&&a!==fd&&!IMe(d,a))return o;let m=!1;try{m=await ne(e,d,a,r)}catch(s){t(`Plugin telemetry: could not read the marketplace catalog to confirm "${e}" exists (${l(s)}); logging its name as third-party`)}return{...o,...f&&a!==void 0&&{marketplace_name_redacted:gor(a)},...!m&&{plugin_name_redacted:b(E_)}}}async function ne(e,n,r,d){if(IMe(n,r))return!0;if(r===fd)return hN(n)!==void 0;return await t7(e,d)!==null}import{createHash as L,randomUUID as te}from"crypto";import{readFile as N,stat as ie}from"fs/promises";import{join as A}from"path";import{createInterface as oe}from"readline";class Y9 extends I{result;constructor(e,n={}){super(e,"plugin operation returned a failure result");this.name="PluginOperationFailedError",this.result=n}}function j(e){let n=e.kind==="command_source"?[e.kind,e.pluginId,e.command,e.mode,e.catalogRevision]:[e.kind,e.pluginId,e.command,e.archiveUrl,e.catalogRevision];return L("sha256").update(S(n),"utf8").digest("hex")}function mVn(e){return{...e,sha256:j(e)}}function U(e,n){return n===void 0?e:{...e,acceptCommandMatched:x(n,e)}}async function G(e,n,r){return{kind:"entry_helper",pluginId:n,command:e.command,archiveUrl:ELe(e).destination,catalogRevision:await Y(n,r)}}async function Y(e,n){let r=`unreadable:${te()}`;if(F()&&n!==void 0)return r;let{marketplace:d}=ir(e),a=d===void 0?void 0:(await jc(n))[d];if(a===void 0)return r;if(a.source.source==="claudeai")return r;let o=a.installLocation;try{if(a.source.source==="github"||a.source.source==="git"){if(await ie(A(o,".git")).then(()=>!0,()=>!1)){let m=PTe(o),s=await Ge(ht(),[...m.inCheckoutArgs,"rev-parse","HEAD"],{cwd:o,env:m.env,stdin:"ignore"});return s.code===0?`git:${s.stdout.trim()}`:r}if(S_(o)===void 0){let m=(await N(A(o,_qe),"utf8")).trim();return/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(m)?`gcs:${m}`:r}}return a.source.source==="settings"?`settings:${re([await B(o),T(a.source)])}`:`sha256:${await B(o)}`}catch{return r}}async function B(e){let n=(o)=>["ENOENT","ENOTDIR"].includes(v(o)??""),r,d=!0;try{r=await N(A(e,".claude-plugin","marketplace.json"),"utf8")}catch(o){if(!n(o))throw o;r=await N(e,"utf8"),d=!1}let a=d?await N(A(e,"package.json"),"utf8").catch((o)=>{if(n(o))return null;throw o}):null;return L("sha256").update(S([T(Q(Ko(r))),a===null?null:T(Q(Ko(a)))]),"utf8").digest("hex")}function re(e){return L("sha256").update(S(e),"utf8").digest("hex")}function T(e){if(Array.isArray(e))return["[",...e.map(T)];if(e!==null&&typeof e==="object")return["{",...Object.keys(e).sort().map((n)=>[n,T(e[n])])];return e}function x(e,n){return e!==void 0&&e.trim().toLowerCase()===j(n)}async function mAe(e){let n=e.failureCode!==void 0&&ae.has(e.failureCode)?e:{...e,shownCommand:void 0};await th(c9(S(n))+`
`)}var ae=new Set(["command_source_refused","command_source_declined","entry_helper_unconfirmed","entry_helper_declined"]);function le(e,n){if(e instanceof Y9)return e.result.failureCode??"op_failed";if(e instanceof ol){if(n==="update"){let r=e.telemetryMessage;if(r.startsWith(wSt))return r.slice(wSt.length)}return $Ct(e).code}if(e instanceof kx)return`claudeai_${e.code}`;return`error_${K(H2(e))}`}function K(e){return e.replaceAll("-","_")}var de={install:"claude plugin install failed with an unclassified error",uninstall:"claude plugin uninstall failed with an unclassified error",enable:"claude plugin enable failed with an unclassified error",disable:"claude plugin disable failed with an unclassified error","disable-all":"claude plugin disable --all failed with an unclassified error",update:"claude plugin update failed with an unclassified error",prune:"claude plugin prune failed with an unclassified error"};async function gAe(e,n,r,d,a,o){let f=e instanceof Y9?e.result.failureCode:void 0,s=H2(e),p=n==="disable-all"?"disable":n==="prune"?void 0:n;if(a&&p){let C=e instanceof Y9?e.result:{};await mAe({command:p,outcome:"failed",...n==="disable-all"?{all:!0}:{plugin:r},pluginId:C.pluginId??a.pluginId??o,scope:a.scope,message:yd(l(e)),failureCode:le(e,n),alreadyInGoalState:C.alreadyInGoalState,installedScope:C.installedScope,reverseDependents:C.reverseDependents,shownCommand:a.shownCommand&&mVn(a.shownCommand)})}if(e instanceof ol&&(n==="install"||n==="update")){if(console.error(yd(l(e))),n==="install"){let{code:C,kind:R}=$Ct(e);if(R==="bad")await fn("cli_plugin_install",C);else await Ql("cli_plugin_install",C)}await i4(),process.exit(1)}let g=e instanceof kx?`claudeai_${e.code}`:void 0;if(s==="unknown"&&!(e instanceof Y9)&&g===void 0)u(ot(se(e),de[n]));else t(`Plugin command "${n}" failed: ${l(e)}`,{level:"error"});let h=r?`${n} plugin "${r}"`:n==="disable-all"?"disable all plugins":`${n} plugins`;console.error(yd(`${X.cross} Failed to ${h}: ${l(e)}`));let w=g??K(s);switch(n){case"install":await fn("cli_plugin_install",w);break;case"uninstall":await fn("cli_plugin_uninstall",w);break;case"update":await fn("cli_plugin_update",w);break;case"enable":await fn("cli_plugin_enable","cli_plugin_enable_failed");break;default:break}let _=r?await f$e(o??r,Cg(),d):{};await ks("tengu_plugin_command_failed",{command:c(n),error_category:c(s),...{},..._,...{}}),await i4(),process.exit(1)}function ue(e,n){let r={};for(let o of e){let f=o.indexOf("=");if(f<=0)throw Error(`--config expects KEY=VALUE, got "${o}". Use --config key=value (repeatable).`);let m=o.slice(0,f),p=(o.slice(f+1).split(/\r\n|\r|\n/,1)[0]??"").trim(),g=Object.hasOwn(n,m)?n[m]:void 0;if(!g){let h=Object.keys(n);throw Error(`--config key "${m}" isn't declared in this plugin's userConfig.`+(h.length>0?` Known keys: ${h.join(", ")}.`:""))}if(p==="")throw Error(`--config ${m}: value is empty. Omit the flag to leave "${m}" unset.`);if(g.type==="number"){let h=Number(p);if(Number.isNaN(h))throw Error(`--config ${m}: "${p}" is not a number`);r[m]=h}else if(g.type==="boolean"){if(!Oe(p)&&!Ao(p))throw Error(`--config ${m}: "${p}" is not a boolean (use true/false, 1/0, yes/no, on/off)`);r[m]=Oe(p)}else r[m]=p}let d=Jo(n,(o,f)=>Object.hasOwn(r,f)),a=bue(r,d);if(!a.valid)throw Error(`--config validation failed: ${a.errors.join("; ")}`);return r}async function ce(e,n,r){Ap(r);let{enabled:d,disabled:a}=await Pb(r),o=JYt([...d,...a],e);if(!o){if(n&&n.length>0)throw Error(`--config was given but plugin "${e}" failed to load after install \u2014 run \`claude plugin list\` to see why.`);return""}let f=o.manifest.userConfig;if(!f||Object.keys(f).length===0){if(n&&n.length>0)throw Error(`--config was given but plugin "${e}" declares no userConfig options.`);return""}if(n&&n.length>0){let p=ue(n,f);await P2e(Hy(o),p,f,r)}let m=Object.keys(await JZe(o));if(m.length===0)return"";let s=m.filter((p)=>f[p]?.required===!0);return`${m.length} userConfig ${P(m.length,"option")} not yet set`+(s.length>0?` (${s.length} required)`:"")+` \u2014 run /plugin configure ${e} in Claude Code, or pass --config KEY=VALUE.`}async function q(e,n,{yes:r=!1,acceptedCommand:d,acceptCommand:a,onShown:o,storageV5:f}={}){if(typeof n.source!=="object"||n.source.source!=="command")return;if(eT()){er(`${FG}
`);return}if(n.source.mode==="link"&&H()==="windows"){er(`${Mnt}
`);return}let m=n.source.command,s=QP(n.source);if(d===s&&!HOe())return;let p={kind:"command_source",pluginId:e,command:m,mode:n.source.mode==="link"?"link":"copy",catalogRevision:await Y(e,f)};o?.({...U(p,a),...d!==void 0&&{previousAcceptance:d!==s?"changed":"unreliable"}});let{name:g,marketplace:h}=ir(e),w=an(g??"",200),_=an(h??"",200);er(`"${w}" is installed by running a command from marketplace "${_}" on this machine`+(d===void 0?"":d!==s?" \u2014 and that command (or how its output is used) CHANGED since you accepted it":" \u2014 your earlier acceptance is recorded where it cannot be relied on (a plugins root inside a workspace, on a network location, or one that could not be resolved), so please confirm it again")+`:
  ${m}
  (${OCt(n.source)})
`);let C=await M({yes:r,acceptCommand:a,shown:p});return C==="accepted"?{kind:"accepted",grantKey:s}:C==="declined"?{kind:"declined"}:void 0}async function M({yes:e=!1,acceptCommand:n,shown:r}){let d=process.stdout.isTTY&&process.stdin.isTTY;if(e||r!==void 0&&x(n,r)){if(!utt())return"accepted";if(!d)return er(`${e?"-y/--yes":"--accept-command"} is ignored inside a Claude Code session: run this in your own terminal to accept the command shown above.
`),"unconfirmed"}if(!d&&n!==void 0&&r!==void 0&&!x(n,r))return er(`--accept-command does not name the command shown above (it may have changed since it was shown), so it was not run. Show it to the person again before accepting it.
`),"unconfirmed";if(!d)return er(utt()?`Not an interactive terminal, so the command was only displayed, not accepted. Run this in your own terminal (outside the Claude Code session) to confirm the command shown above.
`:`Not an interactive terminal, so the command was only displayed, not accepted. Re-run in a terminal to confirm it, or pass -y/--yes to accept the command shown above.
`),"unconfirmed";return er("Run this command now? [y/N] "),await z()?"accepted":"declined"}async function j$r(e,n={},r){if(_Ee(e)!==null)return null;let{name:d,marketplace:a}=ir(e);if(!d)return null;let o=a??n.resolvedMarketplace;if(!o)try{o=(await Apn(d,r))?.marketplace}catch(g){if(g instanceof ol)return null;throw g}if(!o)return null;let f=`${d}@${o}`;if(await zKn(f,n.scope??"user",r))return null;let m=await j6e(f,void 0,r);if(m===null)return null;er(`${Tpn(m)}
`);let s=await G(m,f,r);n.onShown?.(U(s,n.acceptCommand));let p=await M({yes:n.yes,acceptCommand:n.acceptCommand,shown:s});return p==="accepted"?m:p}async function W$r(e,n={},r){if(_Ee(e)!==null)return;let{name:d,marketplace:a}=ir(e);if(!d)return;let o=await jc(r),f=a,m;if(!f){let k;try{k=await Apn(d,r)}catch(D){if(D instanceof ol)return;throw D}if(!k)return;f=k.marketplace,m=k.entry,n.onResolvedMarketplace?.(f)}let s=o[f];if(SM(s?.source))return;let p=`${d}@${f}`,g=m&&n.acceptCommand===void 0?{entry:m}:void 0;if(!g){let k=await $6e(f,s,r);n.onMarketplaceRefreshResult?.(k);try{g=await bF(p,r)}catch(D){if(D instanceof ol)return;throw D}}let h=g?EY(g.entry.source):void 0;if(!g||!h)return;let w=(F()&&r!==void 0?await Ew(r):Lv()).plugins[p]??[],_=QP(h),C=!HOe(),R=C&&w.some((k)=>k.sourceCommand===_);if(await dYt(p,n.scope??"user",r)){if(!R){let k=w.every((D)=>D.sourceCommand===void 0);er(`"${an(ir(p).name??"",200)}" is already installed, and its marketplace `+(k?"entry now installs it by running a command on this machine that has not been reviewed yet.":"has since changed the command that installs it (or how its output is used).")+` Review and accept it: ${ST("plugin update",p,{extra:(n.scope??"user")==="user"?void 0:`--scope ${n.scope}`,fallback:"an explicit plugin update reviews it"})}.
`)}return}if(R)return{kind:"accepted",grantKey:_};return q(p,g.entry,{yes:n.yes,acceptedCommand:C?w.find((k)=>k.sourceCommand!==void 0)?.sourceCommand:void 0,acceptCommand:n.acceptCommand,onShown:n.onShown,storageV5:r})}async function G$r(e,n="user",r,d,a,o,f,m={}){try{let s=await zFt(m.resolvedPlugin??e,n,{shownSourceCommand:d,shownEntryHelper:a,announceRefreshResult:f,npmRegistry:m.npmRegistry},o);if(!s.success)throw new Y9(s.message,s);let p=s.pluginId||e,g=s.scope||n;i("tengu_plugin_installed_cli",{...await f$e(p,Cg(),o),plugin_id:pJ(p),scope:c(g),install_source:b("cli-explicit"),...TSt(p,sIn(p,{scope:g})),...{},...{}});let h="",w=r&&r.length>0?!0:void 0;try{h=await ce(s.pluginId||e,r,o)}catch(C){let R=l(C);if(t(`post-install userConfig step failed: ${R}`,{level:"warn"}),r&&r.length>0)h=`${X.warning} Installed, but --config not applied: ${R}`,w=!1}let _=h?`${s.message}
${h}`:s.message;if(m.json)await mAe({command:"install",outcome:"ok",plugin:e,pluginId:s.pluginId,scope:s.scope||n,message:yd(_),configApplied:w,installedVersion:s.installedVersion,availableVersion:s.availableVersion});return _}catch(s){return gAe(s,"install",e,o,m.json?{scope:n,shownCommand:m.shownCommand}:void 0,s instanceof Y9&&s.result.aliasedId?s.result.pluginId:void 0)}}async function J(e,n){let r=z$e(e),{enabled:d,disabled:a}=await Vi(F()?n:void 0);return k9r((F()&&n!==void 0?await Ew(n):Lv()).plugins,[...d,...a],e,r)}async function kdt(e,n,r,{unlessNamedInSettings:d=!1,unlessDirectoryNameHeld:a=!1}={}){return{plugin:e,aliased:!1}}async function z$r(e,n="user",r=!1,d=!1,a=!1,o,f={}){let m={plugin:e,aliased:!1};try{m=await kdt(e,f.json,o,{unlessDirectoryNameHeld:!0});let s=await Yee(m.plugin,n,!r,o);if(!s.success)throw new Y9(s.message,s);await ks("tengu_plugin_uninstalled_cli",{...await f$e(s.pluginId||m.plugin,Cg(),o),scope:c(s.scope||n),...{}});let p=!1,g=async(h)=>{if(f.json)await mAe({command:"uninstall",outcome:"ok",plugin:e,pluginId:s.pluginId,scope:s.scope||n,keptData:s.dataDirKept??r,message:yd(h)});return h};try{let h=await J(n,o);if(d)return er(`${X.tick} ${nr(s.message)}
`),p=!0,await W(h,n,{dryRun:!1,yes:a,deleteDataDir:!r},o);return g(s.message+T9r(h.orphans,n))}catch(h){u(ot(se(h),"claude plugin uninstall: post-uninstall orphan scan or prune failed"));let _=`(${d?"prune":"orphan scan"} failed: ${l(h)})`;if(p)return _;let C=d?`${X.tick} ${s.message}`:s.message;return g(`${C}
${_}`)}}catch(s){return gAe(s,"uninstall",e,o,f.json?{scope:n}:void 0,m.aliased?m.plugin:void 0)}}async function V$r(e="user",{dryRun:n=!1,yes:r=!1}={},d){try{let a=await J(e,d);return await W(a,e,{dryRun:n,yes:r,deleteDataDir:!0},d)}catch(a){return gAe(a,"prune")}}async function W(e,n,r,d){if(e.unloadable.length>0)return`Skipped \u2014 cannot determine orphans: ${e.unloadable.map(nr).join(", ")} failed to load. Fix or uninstall, then retry.`;if(e.orphans.size===0)return e.autoCount===0?`Nothing to prune (no auto-installed plugins at ${n} scope).`:`Nothing to prune (${e.autoCount} auto-installed ${P(e.autoCount,"plugin","plugins")} at ${n} scope, all still needed).`;let a=(F()&&d!==void 0?await Ew(d):Lv()).plugins,o=z$e(n),f=[...e.orphans].map((p)=>{let g=a[p]?.find((h)=>h.scope===n&&h.projectPath===o);return`  ${nr(p)}${g?.version?` (${nr(g.version)})`:""}`}),m=`${e.orphans.size} auto-installed ${P(e.orphans.size,"plugin","plugins")} no longer needed at ${n} scope:
${f.join(`
`)}`;if(r.dryRun)return`${m}
(dry run \u2014 nothing removed)`;if(!r.yes){if(!process.stdin.isTTY||!process.stdout.isTTY){let g=n==="user"?"":` --scope ${n}`;return`${m}
Not a TTY \u2014 run \`claude plugin prune${g} -y\` to remove.`}if(er(`${m}
Remove? [y/N] `),!await z())return"Aborted."}let s=await Tto(e.orphans,n,o,{deleteDataDir:r.deleteDataDir},d);return await ks("tengu_plugin_prune_cli",{scope:c(n),removed_count:s.length}),`Removed ${s.length} auto-installed ${P(s.length,"plugin","plugins")}: ${s.map((p)=>nr(ir(p).name)).join(", ")}`}async function z(){let e=oe({input:process.stdin});try{for await(let n of e)return/^y(es)?$/i.test(n.trim());return!1}finally{e.close()}}async function q$r(e,n,r,d={}){let a={plugin:e,aliased:!1};try{a=await kdt(e,d.json,r,{unlessNamedInSettings:!0});let o=await B6e(a.plugin,n,r);if(!o.success)throw new Y9(o.message,o);if(await ks("tengu_plugin_disabled_cli",{...await f$e(o.pluginId||a.plugin,Cg(),r),scope:pe(o.scope),...{}}),d.json)await mAe({command:"disable",outcome:"ok",plugin:e,pluginId:o.pluginId,scope:o.scope??n,message:yd(o.message)});return`${X.tick} ${o.message}`}catch(o){return gAe(o,"disable",e,r,d.json?{scope:n}:void 0,a.aliased?a.plugin:void 0)}}async function K$r(e,n={}){try{let r=await M1r(e);if(!r.success)throw new Y9(r.message,r);if(await ks("tengu_plugin_disabled_all_cli",{}),n.json)await mAe({command:"disable",outcome:"ok",all:!0,message:yd(r.message)});return`${X.tick} ${r.message}`}catch(r){return gAe(r,"disable-all",void 0,void 0,n.json?{}:void 0)}}async function Y$r(e,n,{yes:r=!1,json:d=!1,acceptCommand:a}={},o){let f,m,s={plugin:e,aliased:!1};try{if(s=await kdt(e,d,o),!d)er(`${nr(`Checking for updates for plugin "${s.plugin}"${n?` at ${n} scope`:""}\u2026`)}
`);let p=await V$e(s.plugin,n,{explicit:!0,onEntryHelperDisclosure:async(w,_,C)=>{er(`${w}
`);let R=await G(_,C,o),k=await M({yes:r,acceptCommand:a,shown:R});return m=k==="accepted"?void 0:U(R,a),k},announceCommandSource:async(w,_,C)=>{let R=await q(w,_,{yes:r,acceptedCommand:C,acceptCommand:a,onShown:(k)=>{m=k},storageV5:o});if(R?.kind==="accepted")m=void 0;if(R?.kind==="declined")throw new ol("Aborted \u2014 the command was not run.","plugin command source declined at the prompt");return R?.grantKey}},o),g=nr(p.message);f=p.pluginId;let{outcome:h}=p;if(h==="failed"){if(p.failureCode!==void 0&&O1r(p.failureCode))throw new ol(g,`${wSt}${p.failureCode}`);throw new Y9(g,{failureCode:p.failureCode,pluginId:p.pluginId})}if(d)await mAe({command:"update",outcome:"ok",plugin:e,pluginId:p.pluginId,scope:p.scope??n,message:g,updateOutcome:h,oldVersion:p.oldVersion,newVersion:p.newVersion,skipReason:p.skipReason,blockedBy:p.blockedBy,refreshFailed:p.refreshFailed,refreshRefusedByPolicy:p.refreshRefusedByPolicy});else er(`${X.tick} ${g}
`);if(p.outcome==="updated"){let w=p.pluginId||s.plugin;i("tengu_plugin_updated_cli",{...await f$e(w,Cg(),o),old_version:Js(p.oldVersion),new_version:Js(p.newVersion),...TSt(w,p.gitCommitSha),...{}})}y("cli_plugin_update"),await Qn(0)}catch(p){return gAe(p,"update",e,o,d?{scope:n,pluginId:f,shownCommand:m}:void 0,s.aliased?s.plugin:void 0)}}import{mkdir as Z,writeFile as me}from"fs/promises";import{dirname as fe,join as O,relative as ge,resolve as V,sep as he}from"path";var ye="https://anthropic.com/claude-code/plugin.schema.json",Tdt=["skills","agents","hooks","mcp","lsp","output-style","channel"];function X$r(e){let n=hLe().shape.name.safeParse(e);if(!n.success)return n.error.issues[0]?.message??null;if(e.includes("/")||e.includes("\\")||e.includes("..")||e===".")return'Plugin name cannot contain path separators (/ or \\), ".." sequences, or be "."';if(!Got(e)||lU(e)||Mj(e))return`Plugin name cannot be "${JK}" or start with "." \u2014 those directories are never loaded as plugin adoptions`;return null}function J$r(e){let{name:n,description:r,author:d}=e,a=e.with??[],o=[],f={$schema:ye,name:n,version:"0.1.0",description:r??"TODO: describe what this plugin provides"};if(d)f.author=d;if(f.skills=["./"],o.push({relPath:O(".claude-plugin","plugin.json"),contents:S(f,null,2)+`
`}),o.push({relPath:"SKILL.md",contents:ee(n)}),a.includes("skills"))o.push({relPath:O("skills","example","SKILL.md"),contents:ee("example")});if(a.includes("agents"))o.push({relPath:O("agents","example.md"),contents:we()});if(a.includes("hooks"))o.push({relPath:O("hooks","hooks.json"),contents:Ce()},{relPath:O("hooks-handlers","on-session-start.ts"),contents:Se(),mode:493});if(a.includes("mcp")&&!a.includes("channel"))o.push({relPath:".mcp.json",contents:ke()});if(a.includes("lsp"))o.push({relPath:".lsp.json",contents:Pe()});if(a.includes("output-style"))o.push({relPath:O("output-styles",`${n}.md`),contents:be(n)});if(a.includes("channel"))f.channels=[{server:n,displayName:n}],o.push({relPath:".mcp.json",contents:_e(n)},{relPath:"server.ts",contents:Re(n)},{relPath:"package.json",contents:Ie(n)});return o[0].contents=S(f,null,2)+`
`,o}async function Q$r(e,n,r){let d=V(e);if(!r.force)try{await Z(O(d,".claude-plugin"))}catch(o){if(v(o)==="EEXIST")return{ok:!1,error:`${O(d,".claude-plugin")} already exists. Use --force to overwrite.`};if(v(o)!=="ENOENT")throw o}let a=[];for(let o of n){let f=V(d,o.relPath),m=ge(d,f);if(m.startsWith(".."+he)||m==="..")return{ok:!1,error:`Refusing to write outside ${d}: ${o.relPath}`};if(await Z(fe(f),{recursive:!0}),r.force)await In(f,o.contents,o.mode);else try{await me(f,o.contents,{flag:"wx",mode:o.mode})}catch(s){if(v(s)!=="EEXIST")throw s;a.push(o.relPath)}}return{ok:!0,skipped:a}}function ee(e){return`---
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
`}function Pe(){return S({example:{command:"example-language-server",args:["--stdio"],extensionToLanguage:{".example":"example"}}},null,2)+`
`}function be(e){return`---
name: ${e}
description: TODO \u2014 one line shown in the Output style picker in /config
force-for-plugin: true
keep-coding-instructions: true
---

TODO: the style prompt. This is appended to Claude's system prompt while the
style is active. With force-for-plugin: true, the style applies automatically
when this plugin is enabled.
`}function _e(e){return S({mcpServers:{[e]:{command:"bun",args:["run","--cwd","${CLAUDE_PLUGIN_ROOT}","--shell=bun","--silent","start"]}}},null,2)+`
`}function Ie(e){return S({name:`claude-channel-${e}`,version:"0.1.0",type:"module",scripts:{start:"bun install --no-summary && bun server.ts"},dependencies:{"@modelcontextprotocol/sdk":"^1.0.0"}},null,2)+`
`}function Re(e){return`#!/usr/bin/env bun
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
export{f$e,Y9,mVn,mAe,gAe,j$r,W$r,G$r,kdt,z$r,V$r,q$r,K$r,Y$r,Tdt,X$r,J$r,Q$r};
