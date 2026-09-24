// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Te}from"/$bunfs/root/chunk-cqc88nqm.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{Op}from"/$bunfs/root/chunk-5khn4tvf.js";import{hHe}from"/$bunfs/root/chunk-xz77hw43.js";import{wI}from"/$bunfs/root/chunk-zp55ksfn.js";import{t7e,yor,Vi,G1,Ju}from"/$bunfs/root/chunk-4n4g22z6.js";import{mst}from"/$bunfs/root/chunk-7mx3k8pz.js";import{mfe,w$n}from"/$bunfs/root/chunk-5asj1gtv.js";import{ece,u9e,cXn,GUe,kyn}from"/$bunfs/root/chunk-3vtvph4h.js";async function E0(o){let r=performance.now(),i=!1,e=GUe(),n=!1;if(kyn())t("[mcp-policy-cold-start] waiting on remote managed-settings confirmation (managedMcpServers is withheld from the unverified cache)"),await u9e(),i=!0,n=!0;else if(!e&&!mfe());else if(o.hasDynamicMcpConfig||!o.pluginStateReliable||Te()||await s(o.storageV5)){if(e)t("[mcp-policy-cold-start] waiting on remote managed-settings load"),await ece(),i=!0;n=!0}else t("[mcp-policy-cold-start] skipped \u2014 no MCP server source visible");if(mst("settings",()=>!i?"not_awaited":cXn()?"timed_out":"completed",{since:i?r:void 0}),n&&mfe()){if(t("[mcp-policy-cold-start] waiting on the policy-limits verdict (compliance taints feed config ${VAR} expansion)"),await w$n()==="timed_out")t("[mcp-policy-cold-start] policy-limits verdict did not land within the cold-start budget; loading MCP configs without it")}}async function s(o){for(let r of G1)if(Object.keys(Ju(r,{expandVars:!1}).servers).length>0)return!0;if(hHe())return!0;try{for(let{record:e}of yor(t7e()))for(let[n,a]of Object.entries(e??{}))if((a===!0||Array.isArray(a))&&!wI(n))return!0;let{enabled:r,errors:i}=await Vi(o);if(i.length>0)return!0;for(let e of r)if(!e.isBuiltin||e.mcpServers!==void 0&&Object.keys(e.mcpServers).length>0)return!0}catch{return!0}return Op()}
export{E0};
