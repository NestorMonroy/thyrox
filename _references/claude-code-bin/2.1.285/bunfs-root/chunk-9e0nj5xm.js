// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Cy,bye}from"/$bunfs/root/chunk-xs3kgqvp.js";import{hb,nTo}from"/$bunfs/root/chunk-r8a6x68j.js";import{basename as o,sep as s}from"path";function Ico(i){let{listedOwnerships:t}=hb();t.clear();for(let e of i){let r;try{r=Cy(o(bye(e.name,s)))}catch{continue}if(!t.has(r))t.set(r,{listedName:e.name,ownership:nTo(e),savedFromAChat:typeof e.backing_plugin_id==="string"})}}function Ofr(i){return hb().listedOwnerships.get(Cy(i))}
export{Ico,Ofr};
