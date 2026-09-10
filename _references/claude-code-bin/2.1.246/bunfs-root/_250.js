// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{mL as s,nL as c,uL as u}from"/$bunfs/root/_359.js";import{Eha as p,cna as n,dna as i,mha as a,nga as r,tga as m,xna as f}from"/$bunfs/root/_441.js";import{Fpc as o,Lqc as d}from"/$bunfs/root/_668.js";import{jhd as t,ohd as g}from"/$bunfs/root/_820.js";d();g();p();m();u();f();async function k(e){if(!c())return;if(e.hasDynamicMcpConfig||!e.pluginStateReliable||await S(e.storageV5))t("[mcp-policy-cold-start] waiting on remote managed-settings load"),await s();else t("[mcp-policy-cold-start] skipped \u2014 no MCP server source visible")}async function S(e){for(let l of n)if(Object.keys(i(l,{expandVars:!1}).servers).length>0)return!0;if(a())return!0;try{if((await r(e)).enabled.length>0)return!0}catch{return!0}return o()}
export{k as qB};
