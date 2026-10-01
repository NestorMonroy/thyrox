// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Wy,g_e}from"/$bunfs/root/chunk-yf2hnndg.js";import{Ab,fMo}from"/$bunfs/root/chunk-95njte0v.js";import{basename as o,sep as s}from"path";function $fo(i){let{listedOwnerships:t}=Ab();t.clear();for(let e of i){let r;try{r=Wy(o(g_e(e.name,s)))}catch{continue}if(!t.has(r))t.set(r,{listedName:e.name,ownership:fMo(e),savedFromAChat:typeof e.backing_plugin_id==="string"})}}function Ghr(i){return Ab().listedOwnerships.get(Wy(i))}
export{$fo,Ghr};
