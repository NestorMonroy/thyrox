// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{B}from"/$bunfs/root/chunk-z0dggj7a.js";import{uh,St}from"/$bunfs/root/chunk-hyqdn9c0.js";import{FA}from"/$bunfs/root/chunk-9d2nbaa1.js";import{Ai}from"/$bunfs/root/chunk-4v1cfbrn.js";import{q,F}from"/$bunfs/root/chunk-gwyyj914.js";import{r$e,pne}from"/$bunfs/root/chunk-vd630rs0.js";F();function xPt(o,n){return r$e(o)??r$e(n)??uh()}function Cit(o){return St(xPt(o.mainLoopModelForSession,o.mainLoopModel))}function $6(){let o=B((e)=>e.mainLoopModel),n=B((e)=>e.mainLoopModelForSession),i=FA(),s=Ai();return q(()=>pne(n,o),[n,o,i,s])}function Rit(){let o=B((e)=>e.mainLoopModel),n=B((e)=>e.mainLoopModelForSession),i=FA(),s=Ai();return q(()=>xPt(n,o),[n,o,i,s])}function Wa(){let o=B((e)=>e.mainLoopModel),n=B((e)=>e.mainLoopModelForSession),i=FA(),s=Ai();return q(()=>Cit({mainLoopModel:o,mainLoopModelForSession:n}),[n,o,i,s])}
export{xPt,Cit,$6,Rit,Wa};
