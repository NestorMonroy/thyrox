// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{V}from"/$bunfs/root/chunk-ja309z9r.js";import{Kse,DNe,yme,LNe,NNe}from"/$bunfs/root/chunk-nxtd6mp4.js";import{MOe,QV,xb,QD,IR,Pve,Ope}from"/$bunfs/root/chunk-ayyj05ne.js";import{F2t}from"/$bunfs/root/chunk-2xnqb2qr.js";import{Yke}from"/$bunfs/root/chunk-193rctk4.js";import{nH}from"/$bunfs/root/chunk-fgs23952.js";import{zxe}from"/$bunfs/root/chunk-9ne93xq8.js";import{Fme}from"/$bunfs/root/chunk-3a3evbfh.js";function RQe(e,o,t,i){nH("conversation_reset"),IR("conversation_reset"),xb(QV),LNe(),yme(),Kse(),NNe(),DNe(),Yke();let r=V();for(let s of Fme(e.sessionHooksRegistry,r))e.sessionHooksRegistry.remove(r,"Stop",s);t(),Pve(),e.markConversationRemote?.(),F2t(e.readFileState,e.loadedNestedMemoryPaths),QD(e.memorySelector),MOe(o),zxe.of(i).emit(r,o.map((s)=>s.uuid)),e.applyMessageOp({type:"replace-all",messages:Ope(o)})}
export{RQe};
