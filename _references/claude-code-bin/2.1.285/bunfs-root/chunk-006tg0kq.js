// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Xt}from"/$bunfs/root/chunk-aqx56v12.js";import{Zt}from"/$bunfs/root/chunk-k0qnyh4a.js";import{ie,Pt,D}from"/$bunfs/root/chunk-bqbammwz.js";import{Gt}from"/$bunfs/root/chunk-vtgx612r.js";D();function mO(r,o,t=1000,a=0,e){let n=Zt(),u=()=>Xt(Math.max(0,(e??Date.now())-r-a)),l=ie((f)=>{if(!o)return()=>{};let i,s=()=>{try{f()}finally{i=n.setTimeout(s,t)}};return i=n.setTimeout(s,t),()=>i()},[o,t,n]);return Pt(l,u,u)}function JN({onClose:r,onBack:o,onKill:t}){return Gt({"confirm:yes":r},{context:"Confirmation"}),function(e){if(e.key===" ")e.preventDefault(),r();else if(e.key==="left"&&o)e.preventDefault(),o();else if(e.key==="x"&&!e.ctrl&&!e.meta&&t)e.preventDefault(),t()}}
export{mO,JN};
