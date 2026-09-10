// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{wh,At,Op}from"/$bunfs/root/chunk-8qt7d28b.js";import{G}from"/$bunfs/root/chunk-gtw03hhk.js";import{Rs}from"/$bunfs/root/chunk-5fpbdv2n.js";import{v,V,uC,j}from"/$bunfs/root/chunk-db688wrz.js";import{x0e,nne}from"/$bunfs/root/chunk-vw215j9f.js";j();function zT(){let[o,e]=uC((r)=>r+1,0);return v(()=>Op(e),[]),o}function D4(o){return zT(),o()}j();function bLt(o,e){return x0e(o)??x0e(e)??wh()}function kit(o){return At(bLt(o.mainLoopModelForSession,o.mainLoopModel))}function C6(){let o=G((n)=>n.mainLoopModel),e=G((n)=>n.mainLoopModelForSession),r=zT(),i=Rs();return V(()=>nne(e,o),[e,o,r,i])}function Tit(){let o=G((n)=>n.mainLoopModel),e=G((n)=>n.mainLoopModelForSession),r=zT(),i=Rs();return V(()=>bLt(e,o),[e,o,r,i])}function rl(){let o=G((n)=>n.mainLoopModel),e=G((n)=>n.mainLoopModelForSession),r=zT(),i=Rs();return V(()=>kit({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,r,i])}
export{zT,D4,bLt,kit,C6,Tit,rl};
