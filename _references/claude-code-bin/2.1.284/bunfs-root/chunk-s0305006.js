// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Y}from"/$bunfs/root/chunk-d37h8mav.js";import{qhe,i6e,KAe,a6e,l6e}from"/$bunfs/root/chunk-fhmcdk9y.js";import{oH}from"/$bunfs/root/chunk-45s965ek.js";import{hB,G0e,Pme,P9,TS,Ist}from"/$bunfs/root/chunk-77kn462z.js";import{Hun}from"/$bunfs/root/chunk-9y4t39ay.js";import{b$e}from"/$bunfs/root/chunk-80at2awz.js";import{IM}from"/$bunfs/root/chunk-h457hrsz.js";import{Nje}from"/$bunfs/root/chunk-68wzyvwz.js";import{Coe}from"/$bunfs/root/chunk-7rf0vs9e.js";import{SCe}from"/$bunfs/root/chunk-zjmg8mxz.js";function w_t(e,o,t,i){IM("conversation_reset"),oH("conversation_reset"),TS(P9),a6e(),KAe(),qhe(),l6e(),i6e(),b$e();let r=Y();for(let s of SCe(e.sessionHooksRegistry,r))e.sessionHooksRegistry.remove(r,"Stop",s);t(),G0e(),e.markConversationRemote?.(),Hun(e.readFileState,e.loadedNestedMemoryPaths),hB(e.memorySelector),Pme(o),Nje.of(i).emit(r,o.map((s)=>s.uuid)),e.applyMessageOp({type:"replace-all",messages:Ist(o)}),Coe(!0)}
export{w_t};
