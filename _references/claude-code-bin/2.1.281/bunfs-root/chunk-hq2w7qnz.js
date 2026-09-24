// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Y}from"/$bunfs/root/chunk-cqc88nqm.js";import{Upe,OVe,hve,MVe,DVe}from"/$bunfs/root/chunk-v8ayv6rk.js";import{FP}from"/$bunfs/root/chunk-adsaemws.js";import{wde,i6,Rb,zIe,dF,pZe}from"/$bunfs/root/chunk-4n4g22z6.js";import{Wen}from"/$bunfs/root/chunk-wc16b5wk.js";import{VOe}from"/$bunfs/root/chunk-abznc7ks.js";import{tO}from"/$bunfs/root/chunk-2q9stn7q.js";import{B$e}from"/$bunfs/root/chunk-qha6cfhy.js";import{Kee}from"/$bunfs/root/chunk-tr3mgp9f.js";import{Fve}from"/$bunfs/root/chunk-pq51evng.js";function Mut(e,o,t,i){tO("conversation_reset"),FP("conversation_reset"),Rb(i6),MVe(),hve(),Upe(),DVe(),OVe(),VOe();let r=Y();for(let s of Fve(e.sessionHooksRegistry,r))e.sessionHooksRegistry.remove(r,"Stop",s);t(),zIe(),e.markConversationRemote?.(),Wen(e.readFileState,e.loadedNestedMemoryPaths),dF(e.memorySelector),wde(o),B$e.of(i).emit(r,o.map((s)=>s.uuid)),e.applyMessageOp({type:"replace-all",messages:pZe(o)}),Kee(!0)}
export{Mut};
