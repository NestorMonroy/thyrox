// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Te}from"/$bunfs/root/chunk-nvht7ckf.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{rf}from"/$bunfs/root/chunk-t6pwageh.js";import{Ytt,ghr,EMe,Ti,WW,vp}from"/$bunfs/root/chunk-csayct82.js";import{bP}from"/$bunfs/root/chunk-zjmd7cfw.js";import{zct}from"/$bunfs/root/chunk-nk6abhg8.js";import{Ehe,l2n}from"/$bunfs/root/chunk-2r9e48vs.js";import{LY,xQe,Usr,NWe,VTn}from"/$bunfs/root/chunk-9mbp9m6d.js";async function z0(o){let r=performance.now(),i=!1,e=NWe(),n=!1;if(VTn())t("[mcp-policy-cold-start] waiting on remote managed-settings confirmation (managedMcpServers is withheld from the unverified cache)"),await xQe(),i=!0,n=!0;else if(!e&&!Ehe());else if(o.hasDynamicMcpConfig||!o.pluginStateReliable||Te()||await s(o.storageV5)){if(e)t("[mcp-policy-cold-start] waiting on remote managed-settings load"),await LY(),i=!0;n=!0}else t("[mcp-policy-cold-start] skipped \u2014 no MCP server source visible");if(zct("settings",()=>!i?"not_awaited":Usr()?"timed_out":"completed",{since:i?r:void 0}),n&&Ehe()){if(t("[mcp-policy-cold-start] waiting on the policy-limits verdict (compliance taints feed config ${VAR} expansion)"),await l2n()==="timed_out")t("[mcp-policy-cold-start] policy-limits verdict did not land within the cold-start budget; loading MCP configs without it")}}async function s(o){for(let r of WW)if(Object.keys(vp(r,{expandVars:!1}).servers).length>0)return!0;if(EMe())return!0;try{for(let{record:e}of ghr(Ytt()))for(let[n,a]of Object.entries(e??{}))if((a===!0||Array.isArray(a))&&!bP(n))return!0;let{enabled:r,errors:i}=await Ti(o);if(i.length>0)return!0;for(let e of r)if(!e.isBuiltin||e.mcpServers!==void 0&&Object.keys(e.mcpServers).length>0)return!0}catch{return!0}return rf()}
export{z0};
