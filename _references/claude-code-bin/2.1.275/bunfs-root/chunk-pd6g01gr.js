// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{V}from"/$bunfs/root/chunk-4qqe0nh4.js";import{Wie,CFe,Mge,RFe,xFe}from"/$bunfs/root/chunk-srde070v.js";import{Woe,IK,rb,yL,rx,KEe,Wfe}from"/$bunfs/root/chunk-q2gh92k2.js";import{WGt}from"/$bunfs/root/chunk-w65mzm64.js";import{gTe}from"/$bunfs/root/chunk-r3gx110s.js";import{CH}from"/$bunfs/root/chunk-az8htac2.js";import{bPe}from"/$bunfs/root/chunk-vpkbk5kq.js";import{Qge}from"/$bunfs/root/chunk-g9ggb16f.js";function Oet(e,o,t,i){CH("conversation_reset"),rx("conversation_reset"),rb(IK),RFe(),Mge(),Wie(),xFe(),CFe(),gTe();let r=V();for(let s of Qge(e.sessionHooksRegistry,r))e.sessionHooksRegistry.remove(r,"Stop",s);t(),KEe(),e.markConversationRemote?.(),WGt(e.readFileState,e.loadedNestedMemoryPaths),yL(e.memorySelector),Woe(o),bPe.of(i).emit(r,o.map((s)=>s.uuid)),e.applyMessageOp({type:"replace-all",messages:Wfe(o)})}
export{Oet};
