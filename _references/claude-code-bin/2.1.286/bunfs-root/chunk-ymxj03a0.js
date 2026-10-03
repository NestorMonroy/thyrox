// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Yt}from"/$bunfs/root/chunk-abdftc9s.js";import{Jt}from"/$bunfs/root/chunk-fsx1dvsr.js";import{le,At,D}from"/$bunfs/root/chunk-mqace48v.js";import{qt}from"/$bunfs/root/chunk-mtdq9gav.js";D();function IO(r,o,t=1000,a=0,e){let n=Jt(),u=()=>Yt(Math.max(0,(e??Date.now())-r-a)),l=le((f)=>{if(!o)return()=>{};let i,s=()=>{try{f()}finally{i=n.setTimeout(s,t)}};return i=n.setTimeout(s,t),()=>i()},[o,t,n]);return At(l,u,u)}function k$({onClose:r,onBack:o,onKill:t}){return qt({"confirm:yes":r},{context:"Confirmation"}),function(e){if(e.key===" ")e.preventDefault(),r();else if(e.key==="left"&&o)e.preventDefault(),o();else if(e.key==="x"&&!e.ctrl&&!e.meta&&t)e.preventDefault(),t()}}
export{IO,k$};
