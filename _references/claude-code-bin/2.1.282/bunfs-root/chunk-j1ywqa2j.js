// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Y}from"/$bunfs/root/chunk-zwm3fybx.js";import{Kfe,pKe,FEe,fKe,mKe}from"/$bunfs/root/chunk-7kzh6g5g.js";import{sH}from"/$bunfs/root/chunk-ga02wneq.js";import{MF,vHe,Pue,mY,Bb,utt}from"/$bunfs/root/chunk-c9jscxk0.js";import{lon}from"/$bunfs/root/chunk-0aca0z3e.js";import{YMe}from"/$bunfs/root/chunk-b34mxhmz.js";import{TO}from"/$bunfs/root/chunk-gbyvx6y7.js";import{pUe}from"/$bunfs/root/chunk-vq6mqf47.js";import{Gte}from"/$bunfs/root/chunk-d6czkh2w.js";import{ike}from"/$bunfs/root/chunk-45qprvaj.js";function Tft(e,o,t,i){TO("conversation_reset"),sH("conversation_reset"),Bb(mY),fKe(),FEe(),Kfe(),mKe(),pKe(),YMe();let r=Y();for(let s of ike(e.sessionHooksRegistry,r))e.sessionHooksRegistry.remove(r,"Stop",s);t(),vHe(),e.markConversationRemote?.(),lon(e.readFileState,e.loadedNestedMemoryPaths),MF(e.memorySelector),Pue(o),pUe.of(i).emit(r,o.map((s)=>s.uuid)),e.applyMessageOp({type:"replace-all",messages:utt(o)}),Gte(!0)}
export{Tft};
