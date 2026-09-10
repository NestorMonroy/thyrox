// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Th,Et,Bp}from"/$bunfs/root/chunk-x722nt0q.js";import{G}from"/$bunfs/root/chunk-pg32k5cc.js";import{$s}from"/$bunfs/root/chunk-82z04ms9.js";import{v,K,SC,j}from"/$bunfs/root/chunk-w71cs9yg.js";import{rMe,Xne}from"/$bunfs/root/chunk-qpwbvc04.js";j();function sC(){let[o,e]=SC((r)=>r+1,0);return v(()=>Bp(e),[]),o}function p9(o){return sC(),o()}j();function yDt(o,e){return rMe(o)??rMe(e)??Th()}function Zst(o){return Et(yDt(o.mainLoopModelForSession,o.mainLoopModel))}function aY(){let o=G((n)=>n.mainLoopModel),e=G((n)=>n.mainLoopModelForSession),r=sC(),i=$s();return K(()=>Xne(e,o),[e,o,r,i])}function eat(){let o=G((n)=>n.mainLoopModel),e=G((n)=>n.mainLoopModelForSession),r=sC(),i=$s();return K(()=>yDt(e,o),[e,o,r,i])}function ll(){let o=G((n)=>n.mainLoopModel),e=G((n)=>n.mainLoopModelForSession),r=sC(),i=$s();return K(()=>Zst({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,r,i])}
export{sC,p9,yDt,Zst,aY,eat,ll};
