// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Te}from"/$bunfs/root/chunk-zwm3fybx.js";import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{jp}from"/$bunfs/root/chunk-wbbthbh9.js";import{tZe,Icr,dHe,Qi,Sj,dp}from"/$bunfs/root/chunk-c9jscxk0.js";import{DI}from"/$bunfs/root/chunk-st5y2mpe.js";import{Jit}from"/$bunfs/root/chunk-0f2zx2bz.js";import{Sme,zBn}from"/$bunfs/root/chunk-3e47nnn3.js";import{nde,qXe,dZn,S1e,FSn}from"/$bunfs/root/chunk-85dbmn89.js";async function Q0(o){let r=performance.now(),i=!1,e=S1e(),n=!1;if(FSn())t("[mcp-policy-cold-start] waiting on remote managed-settings confirmation (managedMcpServers is withheld from the unverified cache)"),await qXe(),i=!0,n=!0;else if(!e&&!Sme());else if(o.hasDynamicMcpConfig||!o.pluginStateReliable||Te()||await s(o.storageV5)){if(e)t("[mcp-policy-cold-start] waiting on remote managed-settings load"),await nde(),i=!0;n=!0}else t("[mcp-policy-cold-start] skipped \u2014 no MCP server source visible");if(Jit("settings",()=>!i?"not_awaited":dZn()?"timed_out":"completed",{since:i?r:void 0}),n&&Sme()){if(t("[mcp-policy-cold-start] waiting on the policy-limits verdict (compliance taints feed config ${VAR} expansion)"),await zBn()==="timed_out")t("[mcp-policy-cold-start] policy-limits verdict did not land within the cold-start budget; loading MCP configs without it")}}async function s(o){for(let r of Sj)if(Object.keys(dp(r,{expandVars:!1}).servers).length>0)return!0;if(dHe())return!0;try{for(let{record:e}of Icr(tZe()))for(let[n,a]of Object.entries(e??{}))if((a===!0||Array.isArray(a))&&!DI(n))return!0;let{enabled:r,errors:i}=await Qi(o);if(i.length>0)return!0;for(let e of r)if(!e.isBuiltin||e.mcpServers!==void 0&&Object.keys(e.mcpServers).length>0)return!0}catch{return!0}return jp()}
export{Q0};
