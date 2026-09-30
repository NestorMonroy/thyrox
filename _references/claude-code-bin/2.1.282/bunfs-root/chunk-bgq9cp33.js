// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{en}from"/$bunfs/root/chunk-x80cfbm0.js";import{Gt}from"/$bunfs/root/chunk-x4dkmxcb.js";import{It}from"/$bunfs/root/chunk-rj4gmkys.js";import{oe,wt,D}from"/$bunfs/root/chunk-cvh5tjew.js";D();function bP(r,o,t=1000,a=0,e){let n=Gt(),u=()=>en(Math.max(0,(e??Date.now())-r-a)),l=oe((f)=>{if(!o)return()=>{};let i,s=()=>{try{f()}finally{i=n.setTimeout(s,t)}};return i=n.setTimeout(s,t),()=>i()},[o,t,n]);return wt(l,u,u)}function yL({onClose:r,onBack:o,onKill:t}){return It({"confirm:yes":r},{context:"Confirmation"}),function(e){if(e.key===" ")e.preventDefault(),r();else if(e.key==="left"&&o)e.preventDefault(),o();else if(e.key==="x"&&!e.ctrl&&!e.meta&&t)e.preventDefault(),t()}}
export{bP,yL};
