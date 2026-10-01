// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Y}from"/$bunfs/root/chunk-nvht7ckf.js";import{Jge,N3e,WTe,$3e,F3e}from"/$bunfs/root/chunk-w6cz7xwh.js";import{GO}from"/$bunfs/root/chunk-5t3x93y6.js";import{XU,MMe,Ofe,Y8,pS,aot}from"/$bunfs/root/chunk-csayct82.js";import{Kln}from"/$bunfs/root/chunk-3fb3v82z.js";import{lNe}from"/$bunfs/root/chunk-jhwkh65h.js";import{hM}from"/$bunfs/root/chunk-12qgdt23.js";import{b1e}from"/$bunfs/root/chunk-ww1xbmp7.js";import{Ore}from"/$bunfs/root/chunk-8529kh24.js";import{cAe}from"/$bunfs/root/chunk-dzqjfsvd.js";function _ht(e,o,t,i){hM("conversation_reset"),GO("conversation_reset"),pS(Y8),$3e(),WTe(),Jge(),F3e(),N3e(),lNe();let r=Y();for(let s of cAe(e.sessionHooksRegistry,r))e.sessionHooksRegistry.remove(r,"Stop",s);t(),MMe(),e.markConversationRemote?.(),Kln(e.readFileState,e.loadedNestedMemoryPaths),XU(e.memorySelector),Ofe(o),b1e.of(i).emit(r,o.map((s)=>s.uuid)),e.applyMessageOp({type:"replace-all",messages:aot(o)}),Ore(!0)}
export{_ht};
