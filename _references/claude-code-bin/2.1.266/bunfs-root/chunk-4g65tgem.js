// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{J}from"/$bunfs/root/chunk-t8q7n4ta.js";import{DQ,hCe,Gse,yCe,_Ce}from"/$bunfs/root/chunk-jxxmkk37.js";import{UR,AEe,lV,ob,wpe}from"/$bunfs/root/chunk-yw4jc948.js";import{mie}from"/$bunfs/root/chunk-5ry76vxh.js";import{Jme}from"/$bunfs/root/chunk-n30wnctq.js";import{RI}from"/$bunfs/root/chunk-nfkb1gwg.js";import{Lbe}from"/$bunfs/root/chunk-zy6vp5ce.js";function iqe(o,e,r,i){RI("conversation_reset"),UR("conversation_reset"),ob(lV),yCe(),Gse(),DQ(),_Ce(),hCe(),Jme();let s=J();for(let t of mie(o.sessionHooksRegistry,s))o.sessionHooksRegistry.remove(s,"Stop",t);r(),wpe(),AEe(e),Lbe.of(i).emit(s,e.map((t)=>t.uuid)),o.applyMessageOp({type:"replace-all",messages:e})}
export{iqe};
