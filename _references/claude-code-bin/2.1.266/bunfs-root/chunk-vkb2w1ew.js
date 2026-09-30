// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{F}from"/$bunfs/root/chunk-c6x7scb2.js";import{ch,Et}from"/$bunfs/root/chunk-btbsn9s4.js";import{hA}from"/$bunfs/root/chunk-t255pvaq.js";import{Ri}from"/$bunfs/root/chunk-s4n6ca27.js";import{q,L}from"/$bunfs/root/chunk-v21q572m.js";import{T$e,Ore}from"/$bunfs/root/chunk-yw4jc948.js";L();function TDt(o,n){return T$e(o)??T$e(n)??ch()}function e0e(o){return Et(TDt(o.mainLoopModelForSession,o.mainLoopModel))}function XY(){let o=F((e)=>e.mainLoopModel),n=F((e)=>e.mainLoopModelForSession),i=hA(),s=Ri();return q(()=>Ore(n,o),[n,o,i,s])}function Jlt(){let o=F((e)=>e.mainLoopModel),n=F((e)=>e.mainLoopModelForSession),i=hA(),s=Ri();return q(()=>TDt(n,o),[n,o,i,s])}function Ka(){let o=F((e)=>e.mainLoopModel),n=F((e)=>e.mainLoopModelForSession),i=hA(),s=Ri();return q(()=>e0e({mainLoopModel:o,mainLoopModelForSession:n}),[n,o,i,s])}
export{TDt,e0e,XY,Jlt,Ka};
