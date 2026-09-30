// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{V,jbe}from"/$bunfs/root/chunk-bxhyh54r.js";import{Vhe,K3e,wAe,Y3e,X3e}from"/$bunfs/root/chunk-wjyya8wj.js";import{_H}from"/$bunfs/root/chunk-9v35ka7v.js";import{yB,ODe,xme,tz,RS,Ast}from"/$bunfs/root/chunk-qazw855w.js";import{qdn}from"/$bunfs/root/chunk-xdy4dwjd.js";import{r$e}from"/$bunfs/root/chunk-hf74j7yb.js";import{xM}from"/$bunfs/root/chunk-8p9hrr80.js";import{Gje}from"/$bunfs/root/chunk-cxydjq0b.js";import{Coe}from"/$bunfs/root/chunk-14tyv8y9.js";import{KAe}from"/$bunfs/root/chunk-4hdx46mf.js";function b_t(e,o,t,i){xM("conversation_reset"),_H("conversation_reset"),RS(tz),Y3e(),wAe(),Vhe(),X3e(),K3e(),r$e();let r=V();for(let s of KAe(e.sessionHooksRegistry,r))e.sessionHooksRegistry.remove(r,"Stop",s);t(),ODe(),e.markConversationRemote?.(),qdn(e.readFileState,e.loadedNestedMemoryPaths),yB(e.memorySelector),jbe(),xme(o),Gje.of(i).emit(r,o.map((s)=>s.uuid)),e.applyMessageOp({type:"replace-all",messages:Ast(o)}),Coe(!0)}
export{b_t};
