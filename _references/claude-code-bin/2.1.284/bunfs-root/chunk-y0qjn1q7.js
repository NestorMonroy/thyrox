// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ry,hye}from"/$bunfs/root/chunk-q3sfp1s7.js";import{yb,uxo}from"/$bunfs/root/chunk-pd2rp87v.js";import{basename as o,sep as s}from"path";function Fco(i){let{listedOwnerships:t}=yb();t.clear();for(let e of i){let r;try{r=Ry(o(hye(e.name,s)))}catch{continue}if(!t.has(r))t.set(r,{listedName:e.name,ownership:uxo(e),savedFromAChat:typeof e.backing_plugin_id==="string"})}}function umr(i){return yb().listedOwnerships.get(Ry(i))}
export{Fco,umr};
