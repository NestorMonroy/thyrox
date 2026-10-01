// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{q,ppe}from"/$bunfs/root/chunk-hbjpbz2q.js";import{Uye,pYe,fCe,fYe,mYe}from"/$bunfs/root/chunk-bwk92a53.js";import{pM}from"/$bunfs/root/chunk-q6jg9kg6.js";import{JB,jDe,_ge,Oz,KS,fat}from"/$bunfs/root/chunk-kt4703ww.js";import{Cfn}from"/$bunfs/root/chunk-jw1d1d4k.js";import{wFe}from"/$bunfs/root/chunk-dddcacc2.js";import{KH}from"/$bunfs/root/chunk-e3s5xdjs.js";import{rze}from"/$bunfs/root/chunk-nx944t42.js";import{sse}from"/$bunfs/root/chunk-mxe3k536.js";import{UCe}from"/$bunfs/root/chunk-5gres8e0.js";function vSt(e,o,t,i){KH("conversation_reset"),pM("conversation_reset"),KS(Oz),fYe(),fCe(),Uye(),mYe(),pYe(),wFe();let r=q();for(let s of UCe(e.sessionHooksRegistry,r))e.sessionHooksRegistry.remove(r,"Stop",s);t(),jDe(),e.markConversationRemote?.(),Cfn(e.readFileState,e.loadedNestedMemoryPaths),JB(e.memorySelector),ppe(),_ge(o),rze.of(i).emit(r,o.map((s)=>s.uuid)),e.applyMessageOp({type:"replace-all",messages:fat(o)}),sse(!0)}
export{vSt};
