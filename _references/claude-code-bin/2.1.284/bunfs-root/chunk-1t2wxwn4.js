// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Te}from"/$bunfs/root/chunk-d37h8mav.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{mf}from"/$bunfs/root/chunk-swk3rjnt.js";import{brt,Mbr,H0e,xi,pG,Au}from"/$bunfs/root/chunk-77kn462z.js";import{bA}from"/$bunfs/root/chunk-cgw854vf.js";import{zut}from"/$bunfs/root/chunk-ahpv7jmc.js";import{wye,WKn}from"/$bunfs/root/chunk-r6pra6tq.js";import{b8,cet,hcr,sze,VRn}from"/$bunfs/root/chunk-vayhanmp.js";async function uD(o){let r=performance.now(),i=!1,e=sze(),n=!1;if(VRn())t("[mcp-policy-cold-start] waiting on remote managed-settings confirmation (managedMcpServers is withheld from the unverified cache)"),await cet(),i=!0,n=!0;else if(!e&&!wye());else if(o.hasDynamicMcpConfig||!o.pluginStateReliable||Te()||await s(o.storageV5)){if(e)t("[mcp-policy-cold-start] waiting on remote managed-settings load"),await b8(),i=!0;n=!0}else t("[mcp-policy-cold-start] skipped \u2014 no MCP server source visible");if(zut("settings",()=>!i?"not_awaited":hcr()?"timed_out":"completed",{since:i?r:void 0}),n&&wye()){if(t("[mcp-policy-cold-start] waiting on the policy-limits verdict (compliance taints feed config ${VAR} expansion)"),await WKn()==="timed_out")t("[mcp-policy-cold-start] policy-limits verdict did not land within the cold-start budget; loading MCP configs without it")}}async function s(o){for(let r of pG)if(Object.keys(Au(r,{expandVars:!1}).servers).length>0)return!0;if(H0e())return!0;try{for(let{record:e}of Mbr(brt()))for(let[n,a]of Object.entries(e??{}))if((a===!0||Array.isArray(a))&&!bA(n))return!0;let{enabled:r,errors:i}=await xi(o);if(i.length>0)return!0;for(let e of r)if(!e.isBuiltin||e.mcpServers!==void 0&&Object.keys(e.mcpServers).length>0)return!0}catch{return!0}return mf()}
export{uD};
