// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Cx as B}from"/$bunfs/root/_220.js";import{$x as X,Xx as Le,by as Me,fy as Be,gy as Fe,hy as je,jy as Ue,ky as He,ly as qe,my as Ke,ny as Ge,oy as Z}from"/$bunfs/root/_222.js";import{Caa as _e,Cea as Nn,Eaa as In,I1 as pe,Jda as xe,K1 as Pn,L1 as me,M1 as fe,Mda as An,N2 as ye,O1 as ge,Q1 as he,Qea as N,Rea as L,T1 as $n,U2 as Cn,Zea as Ln,bfa as Ie,cca as Ee,cfa as Re,dca as Oe,ffa as Mn,ica as Rn,lga as Ae,naa as Ce,nea as De,nga as Ne,tga as Bn,waa as E,xea as Te}from"/$bunfs/root/_441.js";import{s8a as f,t8a as Tn}from"/$bunfs/root/_477.js";import{$db as $e,Ceb as Dn,Ldb as W,Mdb as On,Vdb as be,Wdb as z,Xdb as Pe,Ydb as w,ceb as xn,reb as ve}from"/$bunfs/root/_496.js";import{Cfb as ke,Nfb as En,sfb as we,yfb as Se}from"/$bunfs/root/_497.js";import{jgb as v,xgb as _n}from"/$bunfs/root/_499.js";import{bkb as _,dkb as bn}from"/$bunfs/root/_512.js";import{Arb as Yn,irb as nn,lrb as tn,orb as rn,qrb as on}from"/$bunfs/root/_527.js";import{$5b as H,d6b as vn}from"/$bunfs/root/_645.js";import{imc as U,nmc as kn}from"/$bunfs/root/_668.js";import{eJc as I,fJc as R,jJc as wn}from"/$bunfs/root/_708.js";import{FMc as de,GMc as yn}from"/$bunfs/root/_710.js";import{GPc as Gn,gPc as en}from"/$bunfs/root/_714.js";import{IPc as A,KPc as Sn}from"/$bunfs/root/_715.js";import{$0c as Ve,c1c as Kn}from"/$bunfs/root/_754.js";import{A_c as ce,D_c as hn,v_c as ue,z_c as k}from"/$bunfs/root/_780.js";import{Tbd as gn}from"/$bunfs/root/_811.js";import{ncd as x}from"/$bunfs/root/_812.js";import{Pcd as q,Qcd as C,Rcd as ln}from"/$bunfs/root/_814.js";import{Xcd as le,bdd as fn}from"/$bunfs/root/_815.js";import{Ged as J,Oed as mn}from"/$bunfs/root/_816.js";import{jhd as Y,mgd as h,ohd as pn,ugd as qn}from"/$bunfs/root/_820.js";import{Dhd as cn,thd as p}from"/$bunfs/root/_821.js";import{nid as un}from"/$bunfs/root/_824.js";import{nud as T,pud as an}from"/$bunfs/root/_829.js";import{Gud as se,Hud as K,Lud as G,Mud as b,Nud as M,zvd as ae}from"/$bunfs/root/_831.js";import{Dvd as D,dwd as dn}from"/$bunfs/root/_832.js";import{ewd as re,fwd as P,gwd as oe,nwd as sn}from"/$bunfs/root/_833.js";import{mxd as j,nxd as ie}from"/$bunfs/root/_836.js";import{wxd as ut}from"/$bunfs/root/_837.js";Tn();Dn();yn();pn();un();En();gn();Sn();fn();ae();vn();Cn();mn();An();import{createInterface as Fn}from"readline";On();Rn();Ln();an();bn();Pn();xn();Nn();_n();Mn();Bn();$n();cn();wn();dn();In();hn();ln();kn();sn();class S extends se{constructor(n){super(n,"plugin operation returned a failure result");this.name="PluginOperationFailedError"}}var jn={install:"claude plugin install failed with an unclassified error",uninstall:"claude plugin uninstall failed with an unclassified error",enable:"claude plugin enable failed with an unclassified error",disable:"claude plugin disable failed with an unclassified error","disable-all":"claude plugin disable --all failed with an unclassified error",update:"claude plugin update failed with an unclassified error",prune:"claude plugin prune failed with an unclassified error"};async function O(n,e,r){let o=_e(n);if(n instanceof w&&(e==="install"||e==="update")){if(console.error(R(b(n))),e==="install"){let{code:a,kind:u}=ve(n);if(u==="bad")await k("cli_plugin_install",a);else await ce("cli_plugin_install",a)}await H(),process.exit(1)}if(o==="unknown"&&!(n instanceof S))J(K(G(n),jn[e]));else Y(`Plugin command "${e}" failed: ${b(n)}`,{level:"error"});let s=r?`${e} plugin "${r}"`:e==="disable-all"?"disable all plugins":`${e} plugins`;console.error(R(`${f.cross} Failed to ${s}: ${b(n)}`));let t=o==="not-found"?"not_found":o;switch(e){case"install":await k("cli_plugin_install",t);break;case"uninstall":await k("cli_plugin_uninstall",t);break;case"update":await k("cli_plugin_update",t);break;case"enable":await k("cli_plugin_enable","cli_plugin_enable_failed");break;default:break}let i=r?E(r,_()):{};await C("tengu_plugin_command_failed",{command:P(e),error_category:P(o),...i}),await H(),process.exit(1)}function Un(n,e){let r={};for(let t of n){let i=t.indexOf("=");if(i<=0)throw Error(`--config expects KEY=VALUE, got "${t}". Use --config key=value (repeatable).`);let a=t.slice(0,i),l=(t.slice(i+1).split(/\r\n|\r|\n/,1)[0]??"").trim(),c=Object.hasOwn(e,a)?e[a]:void 0;if(!c){let d=Object.keys(e);throw Error(`--config key "${a}" isn't declared in this plugin's userConfig.`+(d.length>0?` Known keys: ${d.join(", ")}.`:""))}if(l==="")throw Error(`--config ${a}: value is empty. Omit the flag to leave "${a}" unset.`);if(c.type==="number"){let d=Number(l);if(Number.isNaN(d))throw Error(`--config ${a}: "${l}" is not a number`);r[a]=d}else if(c.type==="boolean"){if(!j(l)&&!ie(l))throw Error(`--config ${a}: "${l}" is not a boolean (use true/false, 1/0, yes/no, on/off)`);r[a]=j(l)}else r[a]=l}let o=de(e,(t,i)=>Object.hasOwn(r,i)),s=pe(r,o);if(!s.valid)throw Error(`--config validation failed: ${s.errors.join("; ")}`);return r}async function Hn(n,e,r){xe(r);let{enabled:o,disabled:s}=await Ae(r),t=fe([...o,...s],n);if(!t){if(e&&e.length>0)throw Error(`--config was given but plugin "${n}" failed to load after install \u2014 run \`claude plugin list\` to see why.`);return""}let i=t.manifest.userConfig;if(!i||Object.keys(i).length===0){if(e&&e.length>0)throw Error(`--config was given but plugin "${n}" declares no userConfig options.`);return""}if(e&&e.length>0){let l=Un(e,i);await ge(me(t),l,i,r)}let a=Object.keys(await he(t));if(a.length===0)return"";let u=a.filter((l)=>i[l]?.required===!0);return`${a.length} userConfig ${D(a.length,"option")} not yet set`+(u.length>0?` (${u.length} required)`:"")+` \u2014 run /plugin configure ${n} in Claude Code, or pass --config KEY=VALUE.`}async function Ye(n,e,{yes:r=!1,acceptedCommand:o}={}){if(typeof e.source!=="object"||e.source.source!=="command")return;if(we()){p(`${Se}
`);return}if(e.source.mode==="link"&&le()==="windows"){p(`${be}
`);return}let s=e.source.command,t=z(e.source);if(o===t&&!W())return;let{name:i,marketplace:a}=v(n),u=A(i??"",200),l=A(a??"",200);p(`"${u}" is installed by running a command from marketplace "${l}" on this machine`+(o===void 0?"":o!==t?" \u2014 and that command (or how its output is used) CHANGED since you accepted it":" \u2014 your earlier acceptance is recorded inside this workspace, so please confirm it again")+`:
  ${s}
  (${Pe(e.source)})
`);let c=await Q({yes:r});return c==="accepted"?{kind:"accepted",grantKey:t}:c==="declined"?{kind:"declined"}:void 0}async function Q({yes:n=!1}){let e=process.stdout.isTTY&&process.stdin.isTTY;if(n){if(!x.CLAUDE_CODE_CHILD_SESSION&&!x.CLAUDECODE)return"accepted";if(!e)return p(`-y/--yes is ignored inside a Claude Code session: run this in your own terminal to accept the command shown above.
`),"unconfirmed"}if(!e)return p(x.CLAUDE_CODE_CHILD_SESSION||x.CLAUDECODE?`Not an interactive terminal, so the command was only displayed, not accepted. Run this in your own terminal (outside the Claude Code session) to confirm the command shown above.
`:`Not an interactive terminal, so the command was only displayed, not accepted. Re-run in a terminal to confirm it, or pass -y/--yes to accept the command shown above.
`),"unconfirmed";return p("Run this command now? [y/N] "),await ze()?"accepted":"declined"}async function zt(n,e={},r){let{name:o,marketplace:s}=v(n);if(!o)return null;let t=s??e.resolvedMarketplace;if(!t)try{t=(await Z(o,r))?.marketplace}catch(l){if(l instanceof w)return null;throw l}if(!t)return null;let i=`${o}@${t}`;if(await Be(i,e.scope??"user",r))return null;let a=await Ke(i,void 0,r);if(a===null)return null;p(`${Ge(a)}
`);let u=await Q(e);return u==="accepted"?a:u}async function Xt(n,e={},r){let{name:o,marketplace:s}=v(n);if(!o)return;let t=await De(r),i=s,a;if(!i){let m;try{m=await Z(o,r)}catch(y){if(y instanceof w)return;throw y}if(!m)return;i=m.marketplace,a=m.entry,e.onResolvedMarketplace?.(i)}let u=t[i];if(ke(u?.source))return;let l=`${o}@${i}`,c=a?{entry:a}:void 0;if(!c){let m=await Le(i,u,r);e.onMarketplaceRefreshResult?.(m);try{c=await Te(l,r)}catch(y){if(y instanceof w)return;throw y}}let d=c?$e(c.entry.source):void 0;if(!c||!d)return;let F=(T()&&r!==void 0?await L(r):N()).plugins[l]??[],ee=z(d),ne=!W(),te=ne&&F.some((m)=>m.sourceCommand===ee);if(await Re(l,e.scope??"user",r)){if(!te){let m=F.every((y)=>y.sourceCommand===void 0);p(`"${A(v(l).name??"",200)}" is already installed, and its marketplace `+(m?"entry now installs it by running a command on this machine that has not been reviewed yet.":"has since changed the command that installs it (or how its output is used).")+` Review and accept it with \`claude plugin update ${I(l)}${(e.scope??"user")==="user"?"":` --scope ${e.scope}`}\`.
`)}return}if(te)return{kind:"accepted",grantKey:ee};return Ye(l,c.entry,{yes:e.yes,acceptedCommand:ne?F.find((m)=>m.sourceCommand!==void 0)?.sourceCommand:void 0})}async function Zt(n,e="user",r,o,s,t,i){try{let a=await Fe(n,e,{shownSourceCommand:o,shownEntryHelper:s,announceRefreshResult:i},t);if(!a.success)throw new S(a.message);let u=a.pluginId||n;q("tengu_plugin_installed_cli",{...E(u,_()),plugin_id:Ce(u),scope:P(a.scope||e),install_source:re("cli-explicit")});let l="";try{l=await Hn(a.pluginId||n,r,t)}catch(c){let d=b(c);if(Y(`post-install userConfig step failed: ${d}`,{level:"warn"}),r&&r.length>0)l=`${f.warning} Installed, but --config not applied: ${d}`}return l?`${a.message}
${l}`:a.message}catch(a){return O(a,"install",n)}}async function Je(n,e){let r=X(n),{enabled:o,disabled:s}=await Ne(T()?e:void 0);return Ee((T()&&e!==void 0?await L(e):N()).plugins,[...o,...s],n,r)}async function Qt(n,e="user",r=!1,o=!1,s=!1,t){try{let i=await je(n,e,!r,t);if(!i.success)throw new S(i.message);await C("tengu_plugin_uninstalled_cli",{...E(i.pluginId||n,_()),scope:P(i.scope||e)});let a=!1;try{let u=await Je(e,t);if(o)return p(`${f.tick} ${R(i.message)}
`),a=!0,await We(u,e,{dryRun:!1,yes:s,deleteDataDir:!r},t);return i.message+Oe(u.orphans,e)}catch(u){J(K(G(u),"claude plugin uninstall: post-uninstall orphan scan or prune failed"));let c=`(${o?"prune":"orphan scan"} failed: ${b(u)})`;if(a)return c;return`${o?`${f.tick} ${i.message}`:i.message}
${c}`}}catch(i){return O(i,"uninstall",n)}}async function Vt(n="user",{dryRun:e=!1,yes:r=!1}={},o){try{let s=await Je(n,o);return await We(s,n,{dryRun:e,yes:r,deleteDataDir:!0},o)}catch(s){return O(s,"prune")}}async function We(n,e,r,o){if(n.unloadable.length>0)return`Skipped \u2014 cannot determine orphans: ${n.unloadable.join(", ")} failed to load. Fix or uninstall, then retry.`;if(n.orphans.size===0)return n.autoCount===0?`Nothing to prune (no auto-installed plugins at ${e} scope).`:`Nothing to prune (${n.autoCount} auto-installed ${D(n.autoCount,"plugin","plugins")} at ${e} scope, all still needed).`;let s=(T()&&o!==void 0?await L(o):N()).plugins,t=X(e),i=[...n.orphans].map((l)=>{let c=s[l]?.find((d)=>d.scope===e&&d.projectPath===t);return`  ${I(l)}${c?.version?` (${I(c.version)})`:""}`}),a=`${n.orphans.size} auto-installed ${D(n.orphans.size,"plugin","plugins")} no longer needed at ${e} scope:
${i.join(`
`)}`;if(r.dryRun)return`${a}
(dry run \u2014 nothing removed)`;if(!r.yes){if(!process.stdin.isTTY||!process.stdout.isTTY){let c=e==="user"?"":` --scope ${e}`;return`${a}
Not a TTY \u2014 run \`claude plugin prune${c} -y\` to remove.`}if(p(`${a}
Remove? [y/N] `),!await ze())return"Aborted."}let u=await Ie(n.orphans,e,t,{deleteDataDir:r.deleteDataDir},o);return await C("tengu_plugin_prune_cli",{scope:P(e),removed_count:u.length}),`Removed ${u.length} auto-installed ${D(u.length,"plugin","plugins")}: ${u.map((l)=>v(l).name).join(", ")}`}async function ze(){let n=Fn({input:process.stdin});try{for await(let e of n)return/^y(es)?$/i.test(e.trim());return!1}finally{n.close()}}async function er(n,e,r){try{let o=await Ue(n,e,r);if(!o.success)throw new S(o.message);return await C("tengu_plugin_disabled_cli",{...E(o.pluginId||n,_()),scope:oe(o.scope)}),`${f.tick} ${o.message}`}catch(o){return O(o,"disable",n)}}async function nr(n){try{let e=await He(n);if(!e.success)throw new S(e.message);return await C("tengu_plugin_disabled_all_cli",{}),`${f.tick} ${e.message}`}catch(e){return O(e,"disable-all")}}async function tr(n,e,{yes:r=!1}={},o){try{p(`${I(`Checking for updates for plugin "${n}" at ${e} scope\u2026`)}
`);let s=await qe(n,e,{explicit:!0,onEntryHelperDisclosure:async(t)=>(p(`${t}
`),Q({yes:r})),announceCommandSource:async(t,i,a)=>{let u=await Ye(t,i,{yes:r,acceptedCommand:a});if(u?.kind==="declined")throw new w("Aborted \u2014 the command was not run.","plugin command source declined at the prompt");return u?.grantKey}},o);if(s.outcome==="failed"){if(s.failureCode!==void 0&&Me(s.failureCode))throw new w(s.message,`plugin update refused during cli update: ${s.failureCode}`);throw new S(s.message)}if(p(`${f.tick} ${R(s.message)}
`),s.outcome==="updated")q("tengu_plugin_updated_cli",{...E(s.pluginId||n,_()),old_version:U(s.oldVersion),new_version:U(s.newVersion)});ue("cli_plugin_update"),await ye(0)}catch(s){return O(s,"update",n)}}Yn();Kn();ae();qn();Gn();import{mkdir as Xe,writeFile as Jn}from"fs/promises";import{dirname as Wn,join as g,relative as zn,resolve as Ze,sep as Xn}from"path";var Zn="https://anthropic.com/claude-code/plugin.schema.json",dr=["skills","agents","hooks","mcp","lsp","output-style","channel"];function pr(n){let e=en().shape.name.safeParse(n);if(!e.success)return e.error.issues[0]?.message??null;if(n.includes("/")||n.includes("\\")||n.includes("..")||n===".")return'Plugin name cannot contain path separators (/ or \\), ".." sequences, or be "."';if(!tn(n)||on(n)||rn(n))return`Plugin name cannot be "${nn}" or start with "." \u2014 those directories are never loaded as plugin adoptions`;return null}function mr(n){let{name:e,description:r,author:o}=n,s=n.with??[],t=[],i={$schema:Zn,name:e,version:"0.1.0",description:r??"TODO: describe what this plugin provides"};if(o)i.author=o;if(i.skills=["./"],t.push({relPath:g(".claude-plugin","plugin.json"),contents:h(i,null,2)+`
`}),t.push({relPath:"SKILL.md",contents:Qe(e)}),s.includes("skills"))t.push({relPath:g("skills","example","SKILL.md"),contents:Qe("example")});if(s.includes("agents"))t.push({relPath:g("agents","example.md"),contents:Qn()});if(s.includes("hooks"))t.push({relPath:g("hooks","hooks.json"),contents:Vn()},{relPath:g("hooks-handlers","on-session-start.ts"),contents:et(),mode:493});if(s.includes("mcp")&&!s.includes("channel"))t.push({relPath:".mcp.json",contents:nt()});if(s.includes("lsp"))t.push({relPath:".lsp.json",contents:tt()});if(s.includes("output-style"))t.push({relPath:g("output-styles",`${e}.md`),contents:rt(e)});if(s.includes("channel"))i.channels=[{server:e,displayName:e}],t.push({relPath:".mcp.json",contents:ot(e)},{relPath:"server.ts",contents:st(e)},{relPath:"package.json",contents:it(e)});return t[0].contents=h(i,null,2)+`
`,t}async function fr(n,e,r){let o=Ze(n);if(!r.force)try{await Xe(g(o,".claude-plugin"))}catch(t){if(M(t)==="EEXIST")return{ok:!1,error:`${g(o,".claude-plugin")} already exists. Use --force to overwrite.`};if(M(t)!=="ENOENT")throw t}let s=[];for(let t of e){let i=Ze(o,t.relPath),a=zn(o,i);if(a.startsWith(".."+Xn)||a==="..")return{ok:!1,error:`Refusing to write outside ${o}: ${t.relPath}`};if(await Xe(Wn(i),{recursive:!0}),r.force)await Ve(i,t.contents,t.mode);else try{await Jn(i,t.contents,{flag:"wx",mode:t.mode})}catch(u){if(M(u)!=="EEXIST")throw u;s.push(t.relPath)}}return{ok:!0,skipped:s}}function Qe(n){return`---
name: ${n}
description: TODO \u2014 describe WHEN Claude should use this. Include trigger phrases users
  might say ("do X", "set up Y", "review Z"). Be specific; this string is what Claude
  matches the user's request against.
---

# ${n}

TODO: what this skill does, and the steps Claude should take.
`}function Qn(){return`---
name: example
description: TODO \u2014 when should Claude delegate to this subagent?
tools:
  - Read
  - Grep
---

TODO: system prompt for the subagent.
`}function Vn(){return h({hooks:{SessionStart:[{hooks:[{type:"command",command:"bun ${CLAUDE_PLUGIN_ROOT}/hooks-handlers/on-session-start.ts"}]}]}},null,2)+`
`}function et(){return`#!/usr/bin/env bun
// SessionStart hook handler. Reads the event from stdin, writes a JSON result
// to stdout. Swap "bun" for "node" or "python3" in hooks/hooks.json if your
// users' environment lacks bun.
const input = await new Response(Bun.stdin.stream()).text()
const event = JSON.parse(input)
process.stdout.write(JSON.stringify({}))
`}function nt(){return h({mcpServers:{"example-remote":{type:"http",url:"https://example.com/mcp"},"example-local":{command:"npx",args:["<your-mcp-server-package>"]}}},null,2)+`
`}function tt(){return h({example:{command:"example-language-server",args:["--stdio"],extensionToLanguage:{".example":"example"}}},null,2)+`
`}function rt(n){return`---
name: ${n}
description: TODO \u2014 one line shown in the Output style picker in /config
force-for-plugin: true
keep-coding-instructions: true
---

TODO: the style prompt. This is appended to Claude's system prompt while the
style is active. With force-for-plugin: true, the style applies automatically
when this plugin is enabled.
`}function ot(n){return h({mcpServers:{[n]:{command:"bun",args:["run","--cwd","${CLAUDE_PLUGIN_ROOT}","--shell=bun","--silent","start"]}}},null,2)+`
`}function it(n){return h({name:`claude-channel-${n}`,version:"0.1.0",type:"module",scripts:{start:"bun install --no-summary && bun server.ts"},dependencies:{"@modelcontextprotocol/sdk":"^1.0.0"}},null,2)+`
`}function st(n){return`#!/usr/bin/env bun
/**
 * ${n} channel server \u2014 stdio MCP server implementing the channel contract.
 * See https://code.claude.com/docs/en/channels-reference.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const mcp = new Server(
  { name: '${n}', version: '0.1.0' },
  {
    capabilities: {
      tools: {},
      // Required: presence of this key registers the channel notification
      // listener on Claude's side.
      experimental: { 'claude/channel': {} },
    },
    instructions:
      "Events from ${n} arrive as <channel source=\\"${n}\\" ...>. Anything " +
      "you want the sender to see must go through the reply tool \u2014 your " +
      "transcript output never reaches the channel.",
  },
)

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'reply',
      description: 'Send a message back to the ${n} channel.',
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
`}var V={};ut(V,{default:()=>V,registerBuiltinPluginsForEarlyScan:()=>at,registerBuiltinPluginsForPluginCommands:()=>lt});var at=()=>B();var lt=()=>B();export{S as nx,O as ox,zt as px,Xt as qx,Zt as rx,Qt as sx,Vt as tx,er as ux,nr as vx,tr as wx,dr as xx,pr as yx,mr as zx,fr as Ax,V as Bx};
