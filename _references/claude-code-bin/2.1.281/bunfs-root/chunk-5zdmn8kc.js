// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Qt}from"/$bunfs/root/chunk-a22am1vw.js";import{Bt}from"/$bunfs/root/chunk-yn4wjwza.js";import{It}from"/$bunfs/root/chunk-aqyv8yk5.js";import{oe,Ct,D}from"/$bunfs/root/chunk-av0brfrs.js";D();function eP(r,o,t=1000,a=0,e){let n=Bt(),u=()=>Qt(Math.max(0,(e??Date.now())-r-a)),l=oe((f)=>{if(!o)return()=>{};let i,s=()=>{try{f()}finally{i=n.setTimeout(s,t)}};return i=n.setTimeout(s,t),()=>i()},[o,t,n]);return Ct(l,u,u)}function BD({onClose:r,onBack:o,onKill:t}){return It({"confirm:yes":r},{context:"Confirmation"}),function(e){if(e.key===" ")e.preventDefault(),r();else if(e.key==="left"&&o)e.preventDefault(),o();else if(e.key==="x"&&!e.ctrl&&!e.meta&&t)e.preventDefault(),t()}}
export{eP,BD};
